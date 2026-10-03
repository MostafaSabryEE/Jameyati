import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Page guard: requires a signed-in, non-suspended user.
export async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!data) redirect("/login");
  const profile = data as Profile;
  if (profile.status === "suspended") redirect("/suspended");

  const isSuper = profile.role === "super_admin";
  const { count } = await supabase
    .from("jameya_admins").select("*", { count: "exact", head: true }).eq("user_id", user.id);

  return { supabase, user, profile, isSuper, isManager: isSuper || (count ?? 0) > 0 };
}

// Non-redirecting variant for the root layout (it also wraps /login and /about).
export async function getNavState() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, isSuper: false, isManager: false };

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("jameya_admins").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const isSuper = profile?.role === "super_admin";
  return { signedIn: true, isSuper, isManager: isSuper || (count ?? 0) > 0 };
}
