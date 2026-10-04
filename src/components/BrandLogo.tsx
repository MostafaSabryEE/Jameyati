"use client";

import Image from "next/image";
import { useI18n } from "@/lib/i18n/provider";

const SIZES = {
  sm: "h-8 sm:h-10",
  md: "h-16",
  lg: "h-24 sm:h-28",
} as const;

/** Jameyati logo with an optional "JAMEYATI | جمعيتي" label. */
export default function BrandLogo({ size = "sm", showText = false, className = "" }: {
  size?: keyof typeof SIZES;
  showText?: boolean;
  className?: string;
}) {
  const { dir } = useI18n();
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} dir={dir}>
      {/* The logo has a light background, so it sits on a matching tile that also works in dark mode. */}
      <Image
        src="/jameyati_logo.png"
        alt="Jameyati | جمعيتي"
        width={1408}
        height={768}
        priority
        sizes="(max-width: 640px) 96px, 144px"
        className={`${SIZES[size]} w-auto rounded-lg bg-[#f8f9f3] object-contain ring-1 ring-black/5 dark:ring-white/10`}
      />
      {showText && (
        <span className="text-sm font-extrabold tracking-wide text-brand-700 dark:text-gold-400 sm:text-lg">
          JAMEYATI | جمعيتي
        </span>
      )}
    </span>
  );
}
