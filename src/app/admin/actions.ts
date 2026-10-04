"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { PaymentStatus, Role, UserStatus } from "@/lib/types";

type Result = { error?: string };

// Verifies the caller is an active super admin; returns their id.
async function requireSuper(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data } = await supabase.rpc("is_super_admin");
  if (!data) throw new Error("Forbidden");
  return user.id;
}

async function requireUserCreationRole(requestedRole: Role): Promise<{ userId: string; isSuper: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
  if (profile?.status !== "active") throw new Error("Forbidden");
  const isSuper = profile.role === "super_admin";
  if (!isSuper && profile.role !== "admin") throw new Error("Forbidden");
  if (!isSuper && requestedRole !== "member") throw new Error("Admins can create member accounts only");
  return { userId: user.id, isSuper };
}

// Verifies the caller may manage this Jam'eya (super admin or delegated admin).
async function requireManager(jameyaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data } = await supabase.rpc("can_manage", { j: jameyaId });
  if (!data) throw new Error("Forbidden");
}

const norm = (s: string) => s.trim().toLowerCase();

/** Removes a member from one Jam'eya only (their account stays). */
export async function removeMember(membershipId: string): Promise<Result> {
  const service = createServiceClient();
  const { data: m } = await service.from("memberships").select("jameya_id,user_id").eq("id", membershipId).single();
  if (!m) return { error: "Not found" };
  await requireManager(m.jameya_id);

  await service.from("payments").delete().eq("jameya_id", m.jameya_id).eq("user_id", m.user_id);
  const { error } = await service.from("memberships").delete().eq("id", membershipId);
  if (!error) {
    revalidatePath(`/admin/${m.jameya_id}`);
    revalidatePath("/dashboard");
  }
  return error ? { error: error.message } : {};
}

export async function setPaymentStatus(input: {
  jameyaId: string;
  userId: string;
  monthNumber: number;
  status: PaymentStatus;
}): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { data: allowed } = await supabase.rpc("can_manage", { j: input.jameyaId });
  if (!allowed) return { error: "Forbidden" };

  const { error } = await supabase.from("payments").upsert({
    jameya_id: input.jameyaId,
    user_id: input.userId,
    month_number: input.monthNumber,
    status: input.status,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "jameya_id,user_id,month_number" });
  if (error) return { error: error.message };

  revalidatePath(`/admin/${input.jameyaId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function setPayoutDone(input: { jameyaId: string; scheduleId: string; done: boolean }): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { data: allowed } = await supabase.rpc("can_manage", { j: input.jameyaId });
  if (!allowed) return { error: "Forbidden" };

  const { data: schedule } = await supabase.from("shares_payout_schedule")
    .select("id,membership_id,memberships!inner(jameya_id)")
    .eq("id", input.scheduleId).eq("memberships.jameya_id", input.jameyaId).maybeSingle();
  if (!schedule) return { error: "Payout not found" };

  const { error } = await supabase.from("shares_payout_schedule").update({
    is_paid_out: input.done,
    paid_out_at: input.done ? new Date().toISOString() : null,
    paid_out_by: input.done ? user.id : null,
  }).eq("id", input.scheduleId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/${input.jameyaId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function updateJameyaSettings(input: {
  jameyaId: string;
  name: string;
  totalAmount: number;
  monthlyInstallment: number;
  durationMonths: number;
  startDate: string;
}): Promise<Result> {
  await requireManager(input.jameyaId);
  if (!input.name.trim() || input.totalAmount < 0 || input.monthlyInstallment < 0
    || !Number.isInteger(input.durationMonths) || input.durationMonths < 1) {
    return { error: "Invalid Jam'eya settings" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("jameyat").update({
    name: input.name.trim(),
    total_amount: input.totalAmount,
    monthly_installment: input.monthlyInstallment,
    duration_months: input.durationMonths,
    start_date: input.startDate,
  }).eq("id", input.jameyaId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/${input.jameyaId}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return {};
}

export async function updateMemberAllocation(input: {
  jameyaId: string;
  membershipId: string;
  sharesCount: number;
  payouts: Array<{ shareNumber: number; payoutMonth: number }>;
}): Promise<Result> {
  await requireManager(input.jameyaId);
  if (!Number.isFinite(input.sharesCount) || input.sharesCount <= 0) return { error: "Invalid shares" };
  const supabase = await createClient();
  const [{ data: membership }, { data: jameya }] = await Promise.all([
    supabase.from("memberships").select("id").eq("id", input.membershipId).eq("jameya_id", input.jameyaId).maybeSingle(),
    supabase.from("jameyat").select("duration_months").eq("id", input.jameyaId).single(),
  ]);
  if (!membership || !jameya) return { error: "Jam'eya member not found" };

  const validPayouts = input.payouts.every((p) =>
    Number.isInteger(p.shareNumber) && p.shareNumber > 0 && p.shareNumber <= Math.ceil(input.sharesCount)
    && Number.isInteger(p.payoutMonth) && p.payoutMonth >= 1 && p.payoutMonth <= jameya.duration_months
  );
  if (!validPayouts) return { error: "Invalid payout schedule" };

  const { error: memberError } = await supabase.from("memberships")
    .update({ shares_count: input.sharesCount }).eq("id", input.membershipId);
  if (memberError) return { error: memberError.message };

  const rows = input.payouts.map((p) => ({
    membership_id: input.membershipId,
    share_number: p.shareNumber,
    payout_month: p.payoutMonth,
  }));
  if (rows.length) {
    const { error } = await supabase.from("shares_payout_schedule")
      .upsert(rows, { onConflict: "membership_id,share_number" });
    if (error) return { error: error.message };
  }
  const assignedShares = rows.map((row) => row.share_number);
  let cleanup = supabase.from("shares_payout_schedule").delete().eq("membership_id", input.membershipId);
  if (assignedShares.length) cleanup = cleanup.not("share_number", "in", `(${assignedShares.join(",")})`);
  const { error: cleanupError } = await cleanup;
  if (cleanupError) return { error: cleanupError.message };

  revalidatePath(`/admin/${input.jameyaId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function addJameyaAdmin(input: { jameyaId: string; userId: string }): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { data: allowed } = await supabase.rpc("can_delegate", { j: input.jameyaId });
  if (!allowed) return { error: "Forbidden" };

  const { data: target } = await supabase.from("profiles").select("id,status,role")
    .eq("id", input.userId).maybeSingle();
  if (!target || target.status !== "active" || target.role === "super_admin") {
    return { error: "User cannot be delegated" };
  }
  const { error } = await supabase.from("jameya_admins").insert({
    jameya_id: input.jameyaId,
    user_id: input.userId,
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/${input.jameyaId}`);
  revalidatePath("/admin");
  return {};
}

export async function removeJameyaAdmin(input: { jameyaId: string; userId: string }): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { data: allowed } = await supabase.rpc("can_delegate", { j: input.jameyaId });
  if (!allowed) return { error: "Forbidden" };

  const { error } = await supabase.from("jameya_admins").delete()
    .eq("jameya_id", input.jameyaId).eq("user_id", input.userId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/${input.jameyaId}`);
  revalidatePath("/admin");
  return {};
}

export async function addMemberToJameya(input: {
  jameyaId: string;
  userId: string;
  sharesCount: number;
  payouts: Array<{ shareNumber: number; payoutMonth: number }>;
}): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { data: allowed } = await supabase.rpc("can_manage", { j: input.jameyaId });
  if (!allowed) return { error: "Forbidden" };
  if (!Number.isFinite(input.sharesCount) || input.sharesCount <= 0) return { error: "Invalid shares" };

  const { data: jameya } = await supabase.from("jameyat")
    .select("duration_months").eq("id", input.jameyaId).single();
  if (!jameya) return { error: "Jam'eya not found" };

  const validPayouts = input.payouts.every((p) =>
    Number.isInteger(p.shareNumber) && p.shareNumber > 0 && p.shareNumber <= Math.ceil(input.sharesCount)
    && Number.isInteger(p.payoutMonth) && p.payoutMonth >= 1 && p.payoutMonth <= jameya.duration_months
  );
  if (!validPayouts) return { error: "Invalid payout schedule" };

  const { data: membership, error } = await supabase.from("memberships").insert({
    jameya_id: input.jameyaId,
    user_id: input.userId,
    shares_count: input.sharesCount,
  }).select("id").single();
  if (error || !membership) return { error: error?.code === "23505" ? "Already a member" : error?.message ?? "Failed" };

  if (input.payouts.length) {
    const { error: scheduleError } = await supabase.from("shares_payout_schedule").insert(
      input.payouts.map((p) => ({
        membership_id: membership.id,
        share_number: p.shareNumber,
        payout_month: p.payoutMonth,
      }))
    );
    if (scheduleError) {
      await supabase.from("memberships").delete().eq("id", membership.id);
      return { error: scheduleError.message };
    }
  }

  revalidatePath(`/admin/${input.jameyaId}`);
  revalidatePath("/dashboard");
  return {};
}

/** Super admin: create an account. Empty password => random one; user signs in by magic link. */
export async function createUser(input: {
  email: string;
  fullName: string;
  password: string;
  role: Role;
}): Promise<Result> {
  const { userId: createdBy, isSuper } = await requireUserCreationRole(input.role);
  if (input.password && input.password.length < 8) return { error: "Password too short" };

  const service = createServiceClient();
  const { data, error } = await service.auth.admin.createUser({
    email: norm(input.email),
    password: input.password || crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (error || !data.user) return { error: error?.message ?? "Failed" };

  const role = isSuper ? input.role : "member";
  const { error: profileError } = await service.from("profiles")
    .update({ role, created_by: createdBy }).eq("id", data.user.id);
  if (profileError) {
    await service.auth.admin.deleteUser(data.user.id);
    return { error: profileError.message };
  }
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return {};
}

/** Super admin: change role and/or status. Suspending also bans the auth login. */
export async function updateUser(input: { id: string; role?: Role; status?: UserStatus }): Promise<Result> {
  const callerId = await requireSuper();
  if (input.id === callerId) return { error: "You cannot change your own role or status" };

  const service = createServiceClient();
  const patch: { role?: Role; status?: UserStatus } = {};
  if (input.role) patch.role = input.role;
  if (input.status) patch.status = input.status;

  const { error } = await service.from("profiles").update(patch).eq("id", input.id);
  if (error) return { error: error.message };

  if (input.status) {
    const { error: banError } = await service.auth.admin.updateUserById(input.id, {
      ban_duration: input.status === "suspended" ? "876000h" : "none",
    });
    if (banError) return { error: banError.message };
  }
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteUser(id: string): Promise<Result> {
  const callerId = await requireSuper();
  if (id === callerId) return { error: "You cannot delete yourself" };
  // Cascades to profile, memberships, schedules and payments.
  const { error } = await createServiceClient().auth.admin.deleteUser(id);
  if (!error) {
    revalidatePath("/admin/users");
    revalidatePath("/admin");
    revalidatePath("/dashboard");
  }
  return error ? { error: error.message } : {};
}
