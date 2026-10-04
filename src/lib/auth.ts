import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Page guard: requires a signed-in, non-suspended user.
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("profiles")
    .select("id,full_name,email,role,status").eq("id", user.id).single();
  if (!data) redirect("/login");
  const profile = data as Profile;
  if (profile.status === "suspended") redirect("/suspended");

  const isSuper = profile.role === "super_admin";
  const isAdmin = profile.role === "admin";
  const { count } = await supabase
    .from("jameya_admins").select("*", { count: "exact", head: true }).eq("user_id", user.id);

  const isJameyaAdmin = profile.role === "jameya_admin" && (count ?? 0) > 0;
  return { supabase, user, profile, isSuper, isAdmin, isManager: isSuper || isAdmin || isJameyaAdmin };
}

// Non-redirecting variant for the root layout (it also wraps /login and /about).
export async function getNavState() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, isSuper: false, isAdmin: false, isManager: false };

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("role,status").eq("id", user.id).single(),
    supabase.from("jameya_admins").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const isSuper = profile?.role === "super_admin";
  const isAdmin = profile?.role === "admin";
  const active = profile?.status === "active";
  const isJameyaAdmin = profile?.role === "jameya_admin" && (count ?? 0) > 0;
  return { signedIn: true, isSuper, isAdmin, isManager: active && (isSuper || isAdmin || isJameyaAdmin) };
}
