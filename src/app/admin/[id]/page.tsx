import { notFound, redirect } from "next/navigation";
import AdminDashboard from "@/components/AdminDashboard";
import { requireUser } from "@/lib/auth";
import type { Jameya, JameyaAdmin, Membership, Payment, Profile, SharePayout } from "@/lib/types";

export default async function JameyaAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isSuper, profile } = await requireUser();

  // Same check RLS uses: super admin or delegated admin of THIS Jam'eya.
  const [permission, jameyaResult] = await Promise.all([
    supabase.rpc("can_manage", { j: id }),
    supabase.from("jameyat")
      .select("id,name,total_amount,monthly_installment,duration_months,start_date,created_by")
      .eq("id", id).maybeSingle(),
  ]);
  if (!permission.data) redirect("/dashboard");
  const jameya = jameyaResult.data;
  if (!jameya) notFound();

  const [memberships, payments] = await Promise.all([
    supabase.from("memberships").select("id,jameya_id,user_id,shares_count").eq("jameya_id", id),
    supabase.from("payments").select("id,jameya_id,user_id,month_number,status").eq("jameya_id", id),
  ]);
  const members = (memberships.data ?? []) as Membership[];

  const [profiles, schedule, allUsers, admins] = await Promise.all([
    supabase.from("profiles").select("id,full_name,email,role,status").in("id", members.map((m) => m.user_id)),
    supabase.from("shares_payout_schedule").select("id,membership_id,share_number,payout_month,is_paid_out").in("membership_id", members.map((m) => m.id)),
    supabase.from("profiles").select("id,full_name,email,role,status").order("full_name"),
    isSuper || (profile.role === "admin" && jameya.created_by === user.id)
      ? supabase.from("jameya_admins").select("jameya_id,user_id").eq("jameya_id", id)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <AdminDashboard
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
