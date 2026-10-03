import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

// Managers land on the admin area, everyone else on their personal dashboard.
export default async function Home() {
  const { isManager } = await requireUser();
  redirect(isManager ? "/admin" : "/dashboard");
}
