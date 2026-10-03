import { createBrowserClient } from "@supabase/ssr";

// Browser client – used inside Client Components. RLS enforces permissions.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
