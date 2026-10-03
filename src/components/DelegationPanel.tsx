"use client";

import { Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import type { JameyaAdmin, Profile } from "@/lib/types";

// Super-admin only (RLS also enforces this): grants management of this one Jam'eya.
export default function DelegationPanel({ jameyaId, admins, users }: {
  jameyaId: string; admins: JameyaAdmin[]; users: Profile[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  const adminIds = new Set(admins.map((a) => a.user_id));
  const delegates = users.filter((u) => adminIds.has(u.id));
  const candidates = users.filter((u) => !adminIds.has(u.id) && u.role !== "super_admin" && u.status === "active");

  async function add() {
    if (!selected) return;
    setBusy(true);
    const { error } = await createClient().from("jameya_admins").insert({ jameya_id: jameyaId, user_id: selected });
    setBusy(false);
    if (error) return alert(t("error"));
    setSelected("");
    router.refresh();
  }

  async function removeDelegate(userId: string) {
    setBusy(true);
    const { error } = await createClient().from("jameya_admins").delete()
      .eq("jameya_id", jameyaId).eq("user_id", userId);
    setBusy(false);
    if (error) return alert(t("error"));
    router.refresh();
  }

  return (
    <section className="card space-y-3">
      <h2 className="text-lg font-semibold">{t("delegatedAdmins")}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">{t("delegatedHint")}</p>

      {delegates.length === 0 && <p className="text-sm">{t("noDelegates")}</p>}
      {delegates.map((u) => (
        <div key={u.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-2 dark:border-slate-700">
          <div>
            <p className="font-medium">{u.full_name}</p>
            <p className="text-sm text-slate-500" dir="ltr">{u.email}</p>
          </div>
          <button className="btn-ghost text-red-600" disabled={busy} onClick={() => removeDelegate(u.id)} aria-label={t("remove")}>
            <Trash2 size={18} />
          </button>
        </div>
      ))}

      <div className="flex flex-col gap-2 sm:flex-row">
        <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">{t("selectUser")}</option>
          {candidates.map((u) => (
            <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
          ))}
        </select>
        <button className="btn shrink-0" onClick={add} disabled={busy || !selected}>
          <UserPlus size={18} /> {t("addDelegate")}
        </button>
      </div>
    </section>
  );
}
