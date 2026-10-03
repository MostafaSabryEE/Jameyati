import { redirect } from "next/navigation";
import UserManager from "@/components/UserManager";
import { requireUser } from "@/lib/auth";
import type { Profile } from "@/lib/types";

export default async function UsersPage() {
  const { supabase, user, isSuper } = await requireUser();
  if (!isSuper) redirect("/admin");

  const { data } = await supabase.from("profiles").select("*").order("created_at");
  return <UserManager users={(data ?? []) as Profile[]} currentId={user.id} />;
}
