"use client";

import { useI18n } from "@/lib/i18n/provider";
import type { PaymentStatus } from "@/lib/types";

// Green = paid, Red = pending, Amber = payout month.
export function StatusBadge({ status, payout }: { status: PaymentStatus; payout?: boolean }) {
  const { t } = useI18n();
  const paid = status === "paid";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`rounded-full px-3 py-1 text-sm font-semibold ${
          paid
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
            : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
        }`}
      >
        {paid ? t("paid") : t("pending")}
      </span>
      {payout && (
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
          {t("payout")}
        </span>
      )}
    </span>
  );
}
