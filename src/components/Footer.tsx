"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n/provider";
import { APP_VERSION } from "@/lib/version";

const AboutModal = dynamic(() => import("@/components/AboutModal"), { ssr: false });

export default function Footer() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <footer className="mx-auto max-w-6xl px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
      JAMEYATI | جمعيتي <span dir="ltr">v{APP_VERSION}</span> ·{" "}
      <button className="underline" onClick={() => setOpen(true)}>{t("about")}</button>
      {open && <AboutModal onClose={() => setOpen(false)} />}
    </footer>
  );
}
