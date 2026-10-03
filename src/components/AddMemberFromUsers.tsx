"use client";

import { Check, Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import PayoutScheduler from "@/components/PayoutScheduler";
import { Field } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import { shareWeights, type Jameya, type Profile } from "@/lib/types";

/** Adds an existing user (from the User Manager) to this Jam'eya with shares and per-share payout months. */
export default function AddMemberFromUsers({ jameya, candidates, isSuper, onAdded }: {
  jameya: Jameya;
  candidates: Profile[]; // saved users who are not yet members
  isSuper: boolean;
  onAdded: () => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [shares, setShares] = useState("1");
  const [slots, setSlots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = candidates.filter(
    (u) => !q || u.full_name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q)
  );
  const sharesNum = Number(shares);

  async function add() {
    if (!userId || !(sharesNum > 0)) return;
    setBusy(true);
    const supabase = createClient();

    const { data: membership, error } = await supabase.from("memberships")
      .insert({ jameya_id: jameya.id, user_id: userId, shares_count: sharesNum })
      .select("id").single();
    if (error || !membership) { setBusy(false); return alert(error?.code === "23505" ? "Already a member" : t("error")); }

    const rows = shareWeights(sharesNum)
      .map((_, i) => ({ membership_id: membership.id, share_number: i + 1, payout_month: Number(slots[i]) }))
      .filter((r) => r.payout_month > 0);
    if (rows.length) {
      const { error: sErr } = await supabase.from("shares_payout_schedule").insert(rows);
      if (sErr) alert(t("error"));
    }

    setBusy(false);
    setUserId(null); setQuery(""); setShares("1"); setSlots([]);
    onAdded();
  }

  return (
    <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
      <h3 className="font-semibold">{t("addMember")}</h3>
      <p className="text-sm text-slate-500">{t("existingUserHint")}</p>
      {isSuper && (
        <Link href="/admin/users" className="text-sm text-brand-600 underline dark:text-gold-400">{t("openUserManager")}</Link>
      )}

      {candidates.length === 0 ? (
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
