"use client";

import { Check, Loader2, Plus, Search } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { addMemberToJameya } from "@/app/admin/actions";
import { Field } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { shareWeights, type Jameya, type Profile } from "@/lib/types";

const PayoutScheduler = dynamic(() => import("@/components/PayoutScheduler"), {
  loading: () => <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />,
});

/** Adds an existing user (from the User Manager) to this Jam'eya with shares and per-share payout months. */
export default function AddMemberFromUsers({ jameya, candidates, isSuper }: {
  jameya: Jameya;
  candidates: Profile[]; // saved users who are not yet members
  isSuper: boolean;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [shares, setShares] = useState("1");
  const [slots, setSlots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [visibleCandidates, markAdded] = useOptimistic(
    candidates,
    (current, addedId: string) => current.filter((candidate) => candidate.id !== addedId)
  );

  const q = query.trim().toLowerCase();
  const filtered = visibleCandidates.filter(
    (u) => !q || u.full_name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q)
  );
  const sharesNum = Number(shares);

  async function add() {
    if (!userId || !(sharesNum > 0)) return;
    setBusy(true);
    const payouts = shareWeights(sharesNum).flatMap((_, index) =>
      slots[index] ? [{ shareNumber: index + 1, payoutMonth: Number(slots[index]) }] : []
    );
    startTransition(async () => {
      markAdded(userId);
      const result = await addMemberToJameya({
        jameyaId: jameya.id,
        userId,
        sharesCount: sharesNum,
        payouts,
      });
      setBusy(false);
      if (result.error) return alert(result.error);
      setUserId(null); setQuery(""); setShares("1"); setSlots([]);
    });
  }

  return (
    <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
      <h3 className="font-semibold">{t("addMember")}</h3>
      <p className="text-sm text-slate-500">{t("existingUserHint")}</p>
      {isSuper && (
        <Link href="/admin/users" className="text-sm text-brand-600 underline dark:text-gold-400">{t("openUserManager")}</Link>
      )}

      {visibleCandidates.length === 0 ? (
        <p className="text-sm">{t("noUsersAvailable")}</p>
      ) : (
        <>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute start-3 top-3 text-slate-400" />
            <input className="input ps-10" placeholder={t("searchUsers")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <ul className="max-h-48 divide-y divide-slate-200 overflow-y-auto rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            {filtered.map((u) => (
              <li key={u.id}>
                <button type="button" onClick={() => setUserId(u.id)}
                  className={`flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-start ${
                    userId === u.id ? "bg-brand-50 dark:bg-brand-900/40" : "hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                  <span>
                    <span className="block font-medium">{u.full_name}</span>
                    <span className="block text-sm text-slate-500" dir="ltr">{u.email}</span>
                  </span>
                  {userId === u.id && <Check size={18} className="text-emerald-600" />}
                </button>
              </li>
            ))}
          </ul>

          {userId && (
            <div className="grid gap-3 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <Field label={t("shares")}>
                  <input className="input" type="number" min="0.25" step="0.25" value={shares} onChange={(e) => setShares(e.target.value)} />
                </Field>
              </div>
              {sharesNum > 0 && <PayoutScheduler jameya={jameya} shares={sharesNum} value={slots} onChange={setSlots} />}
              <button className="btn sm:col-span-6" onClick={add} disabled={busy || !(sharesNum > 0)}>
                {busy ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} {t("add")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
