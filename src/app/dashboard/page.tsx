import MemberDashboard from "@/components/MemberDashboard";
import { requireUser } from "@/lib/auth";
import type { Jameya, Membership, Payment, SharePayout } from "@/lib/types";

// Member view: only the user's own memberships, schedules and payments (RLS enforces this too).
export default async function DashboardPage() {
  const { supabase, user, profile } = await requireUser();

  const { data: memberships } = await supabase.from("memberships").select("*").eq("user_id", user.id);
  const mine = (memberships ?? []) as Membership[];

  const [jameyat, schedule, payments] = await Promise.all([
    supabase.from("jameyat").select("*").in("id", mine.map((m) => m.jameya_id)),
    supabase.from("shares_payout_schedule").select("*").in("membership_id", mine.map((m) => m.id)),
    supabase.from("payments").select("*").eq("user_id", user.id),
  ]);

  const entries = mine.flatMap((membership) => {
    const jameya = ((jameyat.data ?? []) as Jameya[]).find((j) => j.id === membership.jameya_id);
    if (!jameya) return [];
    return [{
      jameya,
      membership,
      schedule: ((schedule.data ?? []) as SharePayout[]).filter((s) => s.membership_id === membership.id),
      payments: ((payments.data ?? []) as Payment[]).filter((p) => p.jameya_id === jameya.id),
    }];
  });

  return <MemberDashboard name={profile.full_name} entries={entries} />;
}
