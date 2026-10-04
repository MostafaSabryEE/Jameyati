import { redirect } from "next/navigation";
import JameyaList from "@/components/JameyaList";
import { requireUser } from "@/lib/auth";
import type { Jameya } from "@/lib/types";

// RLS limits admins to their network; delegated admins only see assigned Jam'eyat.
export default async function AdminPage() {
  const { supabase, user, profile, isSuper, isManager } = await requireUser();
  if (!isManager) redirect("/dashboard");

  let query = supabase.from("jameyat")
    .select("id,name,total_amount,monthly_installment,duration_months,start_date,created_by")
    .order("created_at", { ascending: false });
  if (!isSuper && profile.role === "jameya_admin") {
    const { data: assigned } = await supabase.from("jameya_admins").select("jameya_id").eq("user_id", user.id);
    query = query.in("id", (assigned ?? []).map((a) => a.jameya_id));
  }
  const { data } = await query;

  return <JameyaList jameyat={(data ?? []) as Jameya[]} canCreate={isSuper || profile.role === "admin"} />;
}
