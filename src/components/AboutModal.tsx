"use client";

import { Mail, Phone, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import { useI18n } from "@/lib/i18n/provider";
import { APP_VERSION } from "@/lib/version";

const EMAIL = "mostafa.sabrry@outlook.com";
const PHONE = "0109561933";

/** About card. Pass `onClose` to render it as a modal overlay; omit it for the /about page. */
export default function AboutModal({ onClose }: { onClose?: () => void }) {
  const { t } = useI18n();
  const [creatorLogoOk, setCreatorLogoOk] = useState(true);

  const card = (
    <div className="card relative mx-auto w-full max-w-md space-y-4 text-center">
      {onClose && (
        <button onClick={onClose} aria-label={t("cancel")} className="btn-ghost absolute end-2 top-2 !px-2">
          <X size={20} />
        </button>
      )}
      <div className="flex justify-center"><BrandLogo size="lg" /></div>
      <h1 className="text-2xl font-extrabold text-brand-700 dark:text-gold-400">JAMEYATI | جمعيتي</h1>
      <span className="inline-block rounded-full bg-gold-100 px-3 py-1 text-sm font-semibold text-gold-800 dark:bg-gold-900/50 dark:text-gold-300">
        {t("version")} v{APP_VERSION}
      </span>
      <p>{t("aboutText")}</p>

      <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
        {creatorLogoOk && (
          <Image src="/System_Creator_Logo.png" alt="" width={1408} height={768}
            onError={() => setCreatorLogoOk(false)} sizes="112px"
            className="mx-auto h-16 w-auto rounded-lg bg-white object-contain" />
        )}
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("createdBy")}</p>
        <p className="text-lg font-semibold">{t("developerName")}</p>
        <a href={`mailto:${EMAIL}`} className="btn-ghost w-full border border-slate-300 dark:border-slate-600">
          <Mail size={18} /> <span dir="ltr">{EMAIL}</span>
        </a>
        <a href={`tel:${PHONE}`} className="btn-ghost w-full border border-slate-300 dark:border-slate-600">
          <Phone size={18} /> <span dir="ltr">{PHONE}</span>
        </a>
      </div>
    </div>
  );

  if (!onClose) return card;
  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/60 p-3" onClick={onClose}>
      <div className="my-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>{card}</div>
    </div>
  );
}
