"use client";

import { useI18n } from "@/lib/i18n/provider";

export default function SuspendedPage() {
  const { t } = useI18n();
  return (
    <div className="card mx-auto mt-8 max-w-sm space-y-2 text-center">
      <h1 className="text-xl font-bold text-red-600">{t("suspendedTitle")}</h1>
      <p>{t("suspendedMsg")}</p>
    </div>
  );
}
