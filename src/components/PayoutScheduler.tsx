"use client";

import { useI18n } from "@/lib/i18n/provider";
import { useMoney } from "@/components/ui";
import { monthLabel, shareWeights, type Jameya } from "@/lib/types";

/**
 * Controlled editor: one month selector per share the member owns.
 * `value[i]` is the payout month ("" = unassigned) for share i+1.
 */
export default function PayoutScheduler({ jameya, shares, value, onChange }: {
  jameya: Jameya;
  shares: number;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const weights = shareWeights(shares);
  const months = Array.from({ length: jameya.duration_months }, (_, i) => i + 1);

  return (
    <div className="space-y-2 sm:col-span-6">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("payoutSchedule")}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {weights.map((w, i) => (
          <label key={i} className="block rounded-xl border border-amber-300 bg-amber-50 p-2 text-sm dark:border-amber-700 dark:bg-amber-900/20">
            <span className="flex justify-between">
              <span className="font-semibold">{t("share")} {i + 1} ({w})</span>
              <span className="text-amber-700 dark:text-amber-300">{money(w * jameya.total_amount)}</span>
            </span>
            <select
              className="input mt-1"
              value={value[i] ?? ""}
              onChange={(e) => {
                const next = [...value];
                next[i] = e.target.value;
                onChange(next);
              }}
            >
              <option value="">{t("unassigned")}</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {t("month")} {m} · {monthLabel(jameya.start_date, m, locale)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
