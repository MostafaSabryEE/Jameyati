import { redirect } from "next/navigation";
import UserManager from "@/components/UserManager";
import { requireUser } from "@/lib/auth";
import type { Profile } from "@/lib/types";

export default async function UsersPage() {
  const { supabase, user, profile, isSuper } = await requireUser();
  if (!isSuper && profile.role !== "admin") redirect("/admin");

  const { data } = await supabase.from("profiles")
    .select("id,full_name,email,role,status").order("created_at");
  return <UserManager users={(data ?? []) as Profile[]} currentId={user.id} canManageRoles={isSuper} />;
}
