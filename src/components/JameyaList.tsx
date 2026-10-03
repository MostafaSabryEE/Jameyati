"use client";

import { ChevronRight, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, useMoney } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import type { Jameya } from "@/lib/types";

export default function JameyaList({ jameyat, canCreate }: { jameyat: Jameya[]; canCreate: boolean }) {
  const { t } = useI18n();
  const money = useMoney();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("jameyat")}</h1>

      {canCreate && <CreateJameyaForm />}

      {jameyat.length === 0 && <p className="text-slate-500">{t("noJameyat")}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {jameyat.map((j) => (
          <Link key={j.id} href={`/admin/${j.id}`} className="card flex items-center justify-between gap-2 hover:border-gold-500">
            <div>
              <p className="text-lg font-semibold">{j.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {j.duration_months} {t("month")} · {money(j.monthly_installment)}
              </p>
            </div>
            <ChevronRight size={20} className="shrink-0 rtl:rotate-180" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function CreateJameyaForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", total_amount: "", monthly_installment: "", duration_months: "10",
    start_date: new Date().toISOString().slice(0, 10),
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("jameyat").insert({
      name: form.name,
      total_amount: Number(form.total_amount),
      monthly_installment: Number(form.monthly_installment),
      duration_months: Number(form.duration_months),
      start_date: form.start_date,
      created_by: user?.id,
    }).select("id").single();
    setBusy(false);
    if (error || !data) return alert(t("error"));
    router.push(`/admin/${data.id}`); // delegation panel lives on the Jam'eya page
  }

  return (
    <form onSubmit={create} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <h2 className="text-lg font-semibold sm:col-span-2 lg:col-span-5">{t("createJameya")}</h2>
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
      <p className="text-sm text-slate-500 sm:col-span-2 lg:col-span-4">{t("createdThenDelegate")}</p>
      <button className="btn" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} {t("createJameya")}
      </button>
    </form>
  );
}
