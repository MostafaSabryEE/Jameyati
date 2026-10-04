"use client";

import { Check, ChevronLeft, Loader2, Trash2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { removeMember, setPaymentStatus, setPayoutDone, updateJameyaSettings, updateMemberAllocation } from "@/app/admin/actions";
import Link from "next/link";
import AddMemberFromUsers from "@/components/AddMemberFromUsers";
import DelegationPanel from "@/components/DelegationPanel";
import { Field, Stat, useMoney } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import {
  currentMonthNumber, monthLabel, shareWeights,
  type Jameya, type JameyaAdmin, type Membership, type Payment, type PaymentStatus, type Profile, type SharePayout,
} from "@/lib/types";

const PayoutScheduler = dynamic(() => import("@/components/PayoutScheduler"), {
  loading: () => <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />,
});

interface Props {
  isSuper: boolean;
  canDelegate: boolean;
  jameya: Jameya;
  profiles: Profile[]; // members of this Jam'eya
  memberships: Membership[];
  schedule: SharePayout[];
  payments: Payment[];
  users: Profile[]; // saved users from the User Manager
  admins: JameyaAdmin[];
}

export default function AdminDashboard({
  isSuper, canDelegate, jameya, profiles, memberships, schedule: initialSchedule, payments: initialPayments, users, admins,
}: Props) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const [isPending, startTransition] = useTransition();

  const [payments, setOptimisticPayment] = useOptimistic<Payment[], Payment>(
    initialPayments,
    (state, update) => [
      ...state.filter((p) => !(p.user_id === update.user_id && p.month_number === update.month_number)),
      update,
    ]
  );
  const [schedule, setSchedule] = useState(initialSchedule);
  useEffect(() => setSchedule(initialSchedule), [initialSchedule]);

  const months = useMemo(() => Array.from({ length: jameya.duration_months }, (_, i) => i + 1), [jameya.duration_months]);
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const membershipById = useMemo(() => new Map(memberships.map((m) => [m.id, m])), [memberships]);
  const scheduleByMembership = useMemo(() => {
    const map = new Map<string, SharePayout[]>();
    for (const row of schedule) map.set(row.membership_id, [...(map.get(row.membership_id) ?? []), row]);
    return map;
  }, [schedule]);
  const profileOf = useCallback((uid: string) => profileById.get(uid), [profileById]);
  const scheduleOf = useCallback((membershipId: string) => scheduleByMembership.get(membershipId) ?? [], [scheduleByMembership]);
  const dueOf = useCallback((m: Membership) => jameya.monthly_installment * m.shares_count, [jameya.monthly_installment]);
  const paidPaymentKeys = useMemo(() => new Set(
    payments.filter((p) => p.status === "paid").map((p) => `${p.user_id}:${p.month_number}`)
  ), [payments]);
  const isPaid = useCallback((uid: string, n: number) => paidPaymentKeys.has(`${uid}:${n}`), [paidPaymentKeys]);
  const payoutMonthsOf = useCallback((m: Membership) => new Set(scheduleOf(m.id).map((s) => s.payout_month)), [scheduleOf]);

  const month = currentMonthNumber(jameya.start_date, jameya.duration_months);
  const { collected, pending } = useMemo(() => memberships.reduce((totals, m) => {
    if (isPaid(m.user_id, month)) totals.collected += dueOf(m);
    else totals.pending += dueOf(m);
    return totals;
  }, { collected: 0, pending: 0 }), [memberships, month, isPaid, dueOf]);

  const payoutsByMonth = useMemo(() => {
    const map = new Map<number, Array<{ id: string; done: boolean; name: string; share: number; amount: number }>>();
    for (const row of schedule) {
      const membership = membershipById.get(row.membership_id);
      if (!membership) continue;
      const weight = shareWeights(membership.shares_count)[row.share_number - 1] ?? 0;
      const monthRows = map.get(row.payout_month) ?? [];
      monthRows.push({
        id: row.id,
        done: row.is_paid_out,
        name: profileOf(membership.user_id)?.full_name ?? "",
        share: row.share_number,
        amount: weight * jameya.total_amount,
      });
      map.set(row.payout_month, monthRows);
    }
    return map;
  }, [schedule, membershipById, profileOf, jameya.total_amount]);
  const thisMonthPayouts = payoutsByMonth.get(month) ?? [];

  const togglePayout = useCallback(async (scheduleId: string, done: boolean) => {
    const previous = schedule;
    setSchedule((rows) => rows.map((s) => (s.id === scheduleId ? { ...s, is_paid_out: done } : s)));
    const result = await setPayoutDone({ jameyaId: jameya.id, scheduleId, done });
    if (result.error) {
      setSchedule(previous);
      alert(result.error);
    }
  }, [jameya.id, schedule]);

  const togglePayment = useCallback((uid: string, n: number) => {
    const status: PaymentStatus = isPaid(uid, n) ? "pending" : "paid";
    const update: Payment = { id: `${uid}-${n}`, jameya_id: jameya.id, user_id: uid, month_number: n, status };
    startTransition(async () => {
      setOptimisticPayment(update);
      const result = await setPaymentStatus({ jameyaId: jameya.id, userId: uid, monthNumber: n, status });
      if (result.error) alert(result.error);
    });
  }, [isPaid, jameya.id, setOptimisticPayment, startTransition]);

  return (
    <div className="space-y-6" aria-busy={isPending}>
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:underline">
          <ChevronLeft size={16} className="rtl:rotate-180" /> {t("back")}
        </Link>
        <h1 className="text-2xl font-bold">{jameya.name}</h1>
      </div>

      {/* Overview */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("currentMonth")} value={`${month} / ${jameya.duration_months}`} />
        <Stat label={t("collectedThisMonth")} value={money(collected)} tone="green" />
        <Stat label={t("pendingThisMonth")} value={money(pending)} tone="red" />
        <Stat
          label={t("upcomingPayout")}
          tone="amber"
          value={thisMonthPayouts.length ? thisMonthPayouts.map((p) => p.name).join("، ") : t("nobody")}
        />
      </section>

      <SettingsForm jameya={jameya} />

      {/* Payout timeline: who receives what, per month */}
      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">{t("payoutTimeline")}</h2>
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {months.map((n) => {
            const rows = payoutsByMonth.get(n) ?? [];
            return (
              <li key={n} className={`flex flex-wrap items-start justify-between gap-2 py-2 ${n === month ? "font-semibold" : ""}`}>
                <span>{t("month")} {n} · {monthLabel(jameya.start_date, n, locale)}</span>
                {rows.length === 0 ? (
                  <span className="text-slate-400">—</span>
                ) : (
                  <span className="flex flex-wrap justify-end gap-1">
                    {rows.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => togglePayout(r.id, !r.done)}
                        title={r.done ? t("payoutDone") : t("markPayoutDone")}
                        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
                          r.done
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                        }`}
                      >
                        {r.done ? <Check size={16} /> : <span className="h-3 w-3 rounded-full border-2 border-current" />}
                        {r.name} · {t("share")} {r.share} · {money(r.amount)} · {r.done ? t("payoutDone") : t("markPayoutDone")}
                      </button>
                    ))}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Payments tracker */}
      <section className="card">
        <h2 className="text-lg font-semibold">{t("paymentsGrid")}</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{t("tapToToggle")}</p>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th className="sticky start-0 bg-white p-2 text-start dark:bg-slate-800">{t("members")}</th>
                {months.map((n) => (
                  <th key={n} className={`min-w-14 p-1 text-center ${n === month ? "text-brand-600 dark:text-gold-400" : ""}`}>
                    <div>{n}</div>
                    <div className="text-xs font-normal text-slate-500">{monthLabel(jameya.start_date, n, locale)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {memberships.map((m) => {
                const name = profileOf(m.user_id)?.full_name ?? "";
                const payoutMonths = payoutMonthsOf(m);
                return (
                  <tr key={m.id}>
                    <td className="sticky start-0 whitespace-nowrap bg-white p-2 font-medium dark:bg-slate-800">{name}</td>
                    {months.map((n) => {
                      const paid = isPaid(m.user_id, n);
                      return (
                        <td key={n} className="text-center">
                          <button
                            onClick={() => togglePayment(m.user_id, n)}
                            aria-label={`${name} ${n}`}
                            className={`h-11 w-full min-w-12 rounded-lg text-white ${paid ? "bg-emerald-500" : "bg-red-500"} ${
                              payoutMonths.has(n) ? "ring-4 ring-amber-400" : ""
                            }`}
                          >
                            {paid ? <Check className="mx-auto" size={18} /> : <X className="mx-auto" size={18} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 flex flex-wrap gap-3 text-xs">
          <span className="text-emerald-600">■ {t("paid")}</span>
          <span className="text-red-600">■ {t("pending")}</span>
          <span className="text-amber-500">■ {t("payout")}</span>
        </p>
      </section>

      {/* Members */}
      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">{t("members")}</h2>
        {memberships.map((m) => (
          <MemberRow
            key={m.id}
            profile={profileOf(m.user_id)}
            membership={m}
            schedule={scheduleOf(m.id)}
            jameya={jameya}
          />
        ))}
        <AddMemberFromUsers
          jameya={jameya}
          candidates={users.filter((u) => u.status === "active" && !memberships.some((m) => m.user_id === u.id))}
          isSuper={isSuper}
        />
      </section>

      {canDelegate && <DelegationPanel jameyaId={jameya.id} admins={admins} users={users} />}
    </div>
  );
}

function SettingsForm({ jameya }: { jameya: Jameya }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: jameya.name,
    total_amount: String(jameya.total_amount),
    monthly_installment: String(jameya.monthly_installment),
    duration_months: String(jameya.duration_months),
    start_date: jameya.start_date,
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await updateJameyaSettings({
      jameyaId: jameya.id,
      name: form.name,
      totalAmount: Number(form.total_amount),
      monthlyInstallment: Number(form.monthly_installment),
      durationMonths: Number(form.duration_months),
      startDate: form.start_date,
    });
    setBusy(false);
    if (result.error) return alert(result.error);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={save} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <h2 className="text-lg font-semibold sm:col-span-2 lg:col-span-5">{t("settings")}</h2>
      <Field label={t("jameyaName")}>
        <input className="input" required value={form.name} onChange={set("name")} />
      </Field>
      <Field label={t("totalAmount")}>
        <input className="input" type="number" min="0" step="any" required value={form.total_amount} onChange={set("total_amount")} />
      </Field>
      <Field label={t("monthlyInstallment")}>
        <input className="input" type="number" min="0" step="any" required value={form.monthly_installment} onChange={set("monthly_installment")} />
      </Field>
      <Field label={t("durationMonths")}>
        <input className="input" type="number" min="1" required value={form.duration_months} onChange={set("duration_months")} />
      </Field>
      <Field label={t("startDate")}>
        <input className="input" type="date" required value={form.start_date} onChange={set("start_date")} />
      </Field>
      <button className="btn sm:col-span-2 lg:col-span-5" disabled={busy}>
        {busy && <Loader2 className="animate-spin" size={18} />} {saved ? t("saved") : t("save")}
      </button>
    </form>
  );
}

function MemberRow({ profile, membership, schedule, jameya }: {
  profile?: Profile; membership: Membership; schedule: SharePayout[]; jameya: Jameya;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const [shares, setShares] = useState(String(membership.shares_count));
  const [slots, setSlots] = useState<string[]>(() => {
    const arr: string[] = [];
    schedule.forEach((s) => (arr[s.share_number - 1] = String(s.payout_month)));
    return arr;
  });
  const [busy, setBusy] = useState(false);
  const sharesNum = Number(shares);

  async function save() {
    if (!(sharesNum > 0)) return;
    setBusy(true);
    const payouts = shareWeights(sharesNum).flatMap((_, i) =>
      slots[i] ? [{ shareNumber: i + 1, payoutMonth: Number(slots[i]) }] : []
    );
    const result = await updateMemberAllocation({
      jameyaId: jameya.id,
      membershipId: membership.id,
      sharesCount: sharesNum,
      payouts,
    });
    setBusy(false);
    if (result.error) alert(result.error);
  }

  async function remove() {
    if (!confirm(t("confirmRemove"))) return;
    setBusy(true);
    const res = await removeMember(membership.id);
    setBusy(false);
    if (res.error) return alert(res.error);
  }

  return (
    <div className="grid items-end gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-6">
      <div className="sm:col-span-3">
        <p className="font-semibold">{profile?.full_name}</p>
        <p className="text-sm text-slate-500" dir="ltr">{profile?.email}</p>
        <p className="text-sm text-slate-500">
          {t("monthlyDue")}: {money(jameya.monthly_installment * (sharesNum || 0))}
        </p>
      </div>
      <Field label={t("shares")}>
        <input className="input" type="number" min="0.25" step="0.25" value={shares} onChange={(e) => setShares(e.target.value)} />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn flex-1" onClick={save} disabled={busy}>
          {busy && <Loader2 className="animate-spin" size={18} />} {t("save")}
        </button>
        <button className="btn-ghost text-red-600" onClick={remove} disabled={busy} aria-label={t("remove")}>
          <Trash2 size={18} />
        </button>
      </div>
      {sharesNum > 0 && <PayoutScheduler jameya={jameya} shares={sharesNum} value={slots} onChange={setSlots} />}
    </div>
  );
}

