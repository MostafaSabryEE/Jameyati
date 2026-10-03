"use client";

import { Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMessage({ text: t("loginFailed"), ok: false });
    router.replace("/");
    router.refresh();
  }

  async function sendMagicLink() {
    if (!email) return;
    setBusy(true);
    setMessage(null);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      // Only members created by the admin may sign in.
      options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setBusy(false);
    setMessage(error ? { text: t("loginFailed"), ok: false } : { text: t("magicLinkSent"), ok: true });
  }

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <form onSubmit={signInWithPassword} className="card space-y-3">
        <div className="flex justify-center"><BrandLogo size="lg" /></div>
        <h1 className="text-center text-xl font-bold text-brand-700 dark:text-gold-400">JAMEYATI | جمعيتي</h1>
        <input className="input" type="email" required autoComplete="email" placeholder={t("email")}
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" autoComplete="current-password" placeholder={t("password")}
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn w-full" disabled={busy || !password}>
          {busy && <Loader2 className="animate-spin" size={18} />} {t("signIn")}
        </button>
        <p className="text-center text-sm text-slate-500">{t("or")}</p>
        <button type="button" className="btn-ghost w-full border border-slate-300 dark:border-slate-600"
          onClick={sendMagicLink} disabled={busy || !email}>
          <Mail size={18} /> {t("magicLink")}
        </button>
        {message && (
          <p className={`text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>
        )}
      </form>
    </div>
  );
}
