"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { createUser, deleteUser, updateUser } from "@/app/admin/actions";
import { Field } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import type { Profile, Role } from "@/lib/types";

export default function UserManager({ users, currentId, canManageRoles }: {
  users: Profile[]; currentId: string; canManageRoles: boolean;
}) {
  const { t } = useI18n();
  const [busyId, setBusyId] = useState<string | null>(null);

  const roleLabel: Record<Role, string> = {
    super_admin: t("roleSuper"),
    admin: t("roleAdmin"),
    jameya_admin: t("roleJameyaAdmin"),
    member: t("roleMember"),
  };

  async function run(id: string, action: () => Promise<{ error?: string }>) {
    setBusyId(id);
    const res = await action();
    setBusyId(null);
    if (res.error) alert(res.error);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("userManager")}</h1>

      <AddUserForm roleLabel={roleLabel} canManageRoles={canManageRoles} />

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">{t("allUsers")} ({users.length})</h2>
        {users.map((u) => {
          const isSelf = u.id === currentId;
          const busy = busyId === u.id;
          const suspended = u.status === "suspended";
          return (
            <div key={u.id} className="grid items-center gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <p className="font-semibold">
                  {u.full_name} {isSelf && <span className="text-xs text-slate-500">({t("you")})</span>}
                </p>
                <p className="break-all text-sm text-slate-500" dir="ltr">{u.email}</p>
              </div>

              {canManageRoles ? (
                <select className="input sm:col-span-2" value={u.role} disabled={isSelf || busy} aria-label={t("role")}
                  onChange={(e) => run(u.id, () => updateUser({ id: u.id, role: e.target.value as Role }))}>
                  {(Object.keys(roleLabel) as Role[]).map((r) => (
                    <option key={r} value={r}>{roleLabel[r]}</option>
                  ))}
                </select>
              ) : <span className="text-sm">{roleLabel[u.role]}</span>}

              <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${
                suspended ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"}`}>
                {suspended ? t("suspended") : t("active")}
              </span>

              <div className="flex gap-2">
                {canManageRoles && <button className="btn-ghost flex-1 border border-slate-300 dark:border-slate-600" disabled={isSelf || busy}
                  onClick={() => run(u.id, () => updateUser({ id: u.id, status: suspended ? "active" : "suspended" }))}>
                  {busy && <Loader2 className="animate-spin" size={16} />} {suspended ? t("activate") : t("suspend")}
                </button>}
                {canManageRoles && <button className="btn-ghost text-red-600" disabled={isSelf || busy} aria-label={t("remove")}
                  onClick={() => confirm(t("confirmDeleteUser")) && run(u.id, () => deleteUser(u.id))}>
                  <Trash2 size={18} />
                </button>}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function AddUserForm({ roleLabel, canManageRoles }: {
  roleLabel: Record<Role, string>; canManageRoles: boolean;
}) {
  const { t } = useI18n();
  const empty = { fullName: "", email: "", password: "", role: "member" as Role };
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await createUser(form);
    setBusy(false);
    if (res.error) return alert(res.error);
    setForm(empty);
  }

  return (
    <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <h2 className="text-lg font-semibold sm:col-span-2 lg:col-span-5">{t("addUser")}</h2>
      <Field label={t("fullName")}>
        <input className="input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
      </Field>
      <Field label={t("email")}>
        <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </Field>
      <Field label={t("passwordOptional")}>
        <input className="input" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </Field>
      <Field label={t("role")}>
        <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          {(canManageRoles ? Object.keys(roleLabel) as Role[] : ["member" as Role]).map((r) => (
            <option key={r} value={r}>{roleLabel[r]}</option>
          ))}
        </select>
      </Field>
      <div className="flex items-end">
        <button className="btn w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} {t("add")}
        </button>
      </div>
    </form>
  );
}
