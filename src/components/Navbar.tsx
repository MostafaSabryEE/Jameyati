"use client";

import { Languages, LogOut, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import BrandLogo from "@/components/BrandLogo";
import { createClient } from "@/lib/supabase/client";

interface Props { signedIn: boolean; isSuper: boolean; isAdmin: boolean; isManager: boolean }

export default function Navbar({ signedIn, isSuper, isAdmin, isManager }: Props) {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  // Persist choice in localStorage; with no stored choice the inline script in layout follows the system.
  function toggleTheme() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const links: { href: string; label: TranslationKey; show: boolean; exact?: boolean }[] = [
    { href: "/dashboard", label: "navDashboard", show: signedIn },
    { href: "/admin", label: "navAdmin", show: isManager, exact: true },
    { href: "/admin/users", label: "navUsers", show: isSuper || isAdmin },
    { href: "/about", label: "navAbout", show: true },
  ];

  const btn =
    "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium " +
    "text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2">
        <Link href="/" aria-label={t("appName")}><BrandLogo size="sm" showText /></Link>
        <div className="flex items-center gap-1">
          <button className={btn} aria-label={t("language")} onClick={() => setLang(lang === "en" ? "ar" : "en")}>
            <Languages size={18} />
            <span className="hidden sm:inline">{lang === "en" ? "العربية" : "English"}</span>
          </button>
          <button className={btn} aria-label={t("theme")} onClick={toggleTheme}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {signedIn && (
            <button className={btn} aria-label={t("signOut")} onClick={signOut}>
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable on small screens */}
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2">
        {links.filter((l) => l.show).map((l) => {
          const active = l.exact ? pathname === l.href || (pathname.startsWith("/admin/") && !pathname.startsWith("/admin/users") && l.href === "/admin")
            : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                active ? "bg-brand-600 text-white dark:bg-brand-500" : "text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}>
              {t(l.label)}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
