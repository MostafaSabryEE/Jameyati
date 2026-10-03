"use client";

import { useI18n } from "@/lib/i18n/provider";

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" | "amber" }) {
  const color = { green: "text-emerald-600", red: "text-red-600", amber: "text-amber-600" }[tone ?? "green"];
  return (
    <div className="card">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone ? color : ""}`}>{value}</p>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export function useMoney() {
  const { t, locale } = useI18n();
  return (n: number) => `${n.toLocaleString(locale)} ${t("currency")}`;
}
