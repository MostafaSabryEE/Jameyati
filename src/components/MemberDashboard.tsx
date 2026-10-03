"use client";

import { StatusBadge } from "@/components/StatusBadge";
import { useMoney } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import {
  currentMonthNumber, monthLabel, shareWeights,
  type Jameya, type Membership, type Payment, type SharePayout,
} from "@/lib/types";

interface Entry {
  jameya: Jameya;
  membership: Membership;
  schedule: SharePayout[];
  payments: Payment[];
}

export default function MemberDashboard({ name, entries }: { name: string; entries: Entry[] }) {
  const { t } = useI18n();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("hello")}, {name}</h1>
      {entries.length === 0 && <p className="text-slate-500">{t("noMembership")}</p>}
      {entries.map((e) => (
        <JameyaCard key={e.membership.id} {...e} />
      ))}
    </div>
  );
}

function JameyaCard({ jameya, membership, schedule, payments }: Entry) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const shares = membership.shares_count;
  const installment = jameya.monthly_installment * shares;
  const weights = shareWeights(shares);
  const current = currentMonthNumber(jameya.start_date, jameya.duration_months);

  const paidMonths = new Set(payments.filter((p) => p.status === "paid").map((p) => p.month_number));
  const payoutMonths = new Set(schedule.map((s) => s.payout_month));
  const sortedSchedule = [...schedule].sort((a, b) => a.payout_month - b.payout_month);

  const stats = [
    { label: t("myInstallment"), value: money(installment) },
    { label: t("shares"), value: String(shares) },
    { label: t("totalPaid"), value: money(paidMonths.size * installment) },
    { label: t("remaining"), value: money((jameya.duration_months - paidMonths.size) * installment) },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-brand-600 dark:text-gold-400">{jameya.name}</h2>

      {/* One highlight per share the member owns */}
      <div className="card border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20">
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">{t("myPayouts")}</p>
        {weights.map((w, i) => {
          const s = sortedSchedule.find((x) => x.share_number === i + 1);
          return (
            <div key={i} className="flex flex-wrap items-center justify-between gap-1 py-1 text-amber-800 dark:text-amber-300">
              <span className="font-semibold">
                {t("share")} {i + 1} ({w}) ·{" "}
                {s ? `${t("month")} ${s.payout_month} · ${monthLabel(jameya.start_date, s.payout_month, locale)}` : t("notAssigned")}
              </span>
              <span className="flex items-center gap-2 font-bold">
                {s?.is_paid_out && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                    {t("payoutDone")}
                  </span>
                )}
                {money(w * jameya.total_amount)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className="mt-1 text-lg font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="mb-3 text-lg font-semibold">{t("history")}</h3>
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {Array.from({ length: jameya.duration_months }, (_, i) => i + 1).map((m) => (
            <li key={m} className={`flex flex-wrap items-center justify-between gap-2 py-3 ${m === current ? "font-semibold" : ""}`}>
              <span>{t("month")} {m} · {monthLabel(jameya.start_date, m, locale)}</span>
              <StatusBadge status={paidMonths.has(m) ? "paid" : "pending"} payout={payoutMonths.has(m)} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
