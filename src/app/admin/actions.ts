"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Role, UserStatus } from "@/lib/types";

type Result = { error?: string };

// Verifies the caller is an active super admin; returns their id.
async function requireSuper(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data } = await supabase.rpc("is_super_admin");
  if (!data) throw new Error("Forbidden");
  return user.id;
}

// Verifies the caller may manage this Jam'eya (super admin or delegated admin).
async function requireManager(jameyaId: string) {
  const supabase = createClient();
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
  return error ? { error: error.message } : {};
}

/** Super admin: create an account. Empty password => random one; user signs in by magic link. */
export async function createUser(input: {
  email: string;
  fullName: string;
  password: string;
  role: Role;
}): Promise<Result> {
  await requireSuper();
  if (input.password && input.password.length < 8) return { error: "Password too short" };

  const service = createServiceClient();
  const { data, error } = await service.auth.admin.createUser({
    email: norm(input.email),
    password: input.password || crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (error || !data.user) return { error: error?.message ?? "Failed" };

  if (input.role !== "member") {
    await service.from("profiles").update({ role: input.role }).eq("id", data.user.id);
  }
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
  return {};
}

export async function deleteUser(id: string): Promise<Result> {
  const callerId = await requireSuper();
  if (id === callerId) return { error: "You cannot delete yourself" };
  // Cascades to profile, memberships, schedules and payments.
  const { error } = await createServiceClient().auth.admin.deleteUser(id);
  return error ? { error: error.message } : {};
}
