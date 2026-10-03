import { redirect } from "next/navigation";
import JameyaList from "@/components/JameyaList";
import { requireUser } from "@/lib/auth";
import type { Jameya } from "@/lib/types";

// Super admin sees every Jam'eya; delegated admins only the ones assigned to them.
export default async function AdminPage() {
  const { supabase, user, isSuper, isManager } = await requireUser();
  if (!isManager) redirect("/dashboard");

  let query = supabase.from("jameyat").select("*").order("created_at", { ascending: false });
  if (!isSuper) {
    const { data: assigned } = await supabase.from("jameya_admins").select("jameya_id").eq("user_id", user.id);
    query = query.in("id", (assigned ?? []).map((a) => a.jameya_id));
  }
  const { data } = await query;

  return <JameyaList jameyat={(data ?? []) as Jameya[]} canCreate={isSuper} />;
}
