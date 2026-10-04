import { notFound, redirect } from "next/navigation";
import AdminDashboard from "@/components/AdminDashboard";
import { requireUser } from "@/lib/auth";
import type { Jameya, JameyaAdmin, Membership, Payment, Profile, SharePayout } from "@/lib/types";

export default async function JameyaAdminPage({ params }: { params: { id: string } }) {
  const { supabase, user, isSuper, profile } = await requireUser();

  // Same check RLS uses: super admin or delegated admin of THIS Jam'eya.
  const { data: allowed } = await supabase.rpc("can_manage", { j: params.id });
  if (!allowed) redirect("/dashboard");

  const { data: jameya } = await supabase.from("jameyat").select("*").eq("id", params.id).single();
  if (!jameya) notFound();

  const [memberships, payments] = await Promise.all([
    supabase.from("memberships").select("*").eq("jameya_id", params.id),
    supabase.from("payments").select("*").eq("jameya_id", params.id),
  ]);
  const members = (memberships.data ?? []) as Membership[];

  const [profiles, schedule, allUsers, admins] = await Promise.all([
    supabase.from("profiles").select("*").in("id", members.map((m) => m.user_id)),
    supabase.from("shares_payout_schedule").select("*").in("membership_id", members.map((m) => m.id)),
    supabase.from("profiles").select("*").order("full_name"),
    isSuper || (profile.role === "admin" && jameya.created_by === user.id)
      ? supabase.from("jameya_admins").select("*").eq("jameya_id", params.id)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <AdminDashboard
      adminId={user.id}
      isSuper={isSuper}
      canDelegate={isSuper || (profile.role === "admin" && jameya.created_by === user.id)}
      jameya={jameya as Jameya}
      profiles={(profiles.data ?? []) as Profile[]}
      memberships={members}
      schedule={(schedule.data ?? []) as SharePayout[]}
      payments={(payments.data ?? []) as Payment[]}
      users={(allUsers.data ?? []) as Profile[]}
      admins={(admins.data ?? []) as JameyaAdmin[]}
    />
  );
}
