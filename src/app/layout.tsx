import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { getNavState } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n/provider";
import type { Lang } from "@/lib/i18n/dictionary";
import "./globals.css";

export const metadata: Metadata = { title: "JAMEYATI | جمعيتي" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Runs before paint so there is no light/dark flash.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const lang: Lang = cookieStore.get("lang")?.value === "ar" ? "ar" : "en";
  const nav = await getNavState();

  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <I18nProvider initialLang={lang}>
          <Navbar {...nav} />
          <main className="mx-auto max-w-6xl px-3 py-4">{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
