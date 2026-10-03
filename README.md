# Jam'eya (جمعية) – Next.js + Supabase

## Folder structure
```
supabase/migration.sql        Tables, trigger, RLS policies
src/middleware.ts             Session refresh + auth gate
src/lib/supabase/             client.ts (browser), server.ts (server + service-role)
src/lib/i18n/                 dictionary.ts (EN/AR), provider.tsx (RTL/LTR)
src/lib/types.ts              Types + month helpers
src/components/               Navbar, StatusBadge, AdminDashboard, MemberDashboard
src/app/layout.tsx            Theme script, i18n provider, navbar
src/app/login/                Password + magic-link login
src/app/auth/callback/        Magic-link code exchange
src/app/admin/                Admin page + server actions (add/remove member)
src/app/dashboard/            Member page (own data only)
```

## Setup
1. Create a project at supabase.com.
2. SQL Editor: paste and run `supabase/migration.sql`.
3. Authentication > Users > Add user (email + password, auto-confirm). The first user created becomes **admin**.
4. Authentication > Sign In / Providers > Email: disable "Allow new users to sign up" (admin creates members).
5. Authentication > URL Configuration: set Site URL to your Vercel URL and add `http://localhost:3000/auth/callback` and `https://YOUR-APP.vercel.app/auth/callback` to Redirect URLs.
6. Copy `.env.example` to `.env.local` and fill in values from Project Settings > API.
7. `npm install` then `npm run dev`.

## Deploy to Vercel
1. Push the repo to GitHub and import it in Vercel (framework: Next.js).
2. Add the three env vars from `.env.example` (the service-role key must stay server-side).
3. Deploy, then update the Supabase Site URL / Redirect URLs with the final domain.

## Privacy
Members can read only their own profile, membership and payments via RLS. An admin can set `profiles.is_public = true` ("Visible to others" checkbox) to let others read that member's records at the database level.
