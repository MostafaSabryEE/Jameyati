export type Role = "super_admin" | "jameya_admin" | "member";
export type UserStatus = "active" | "suspended";
export type PaymentStatus = "paid" | "pending";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: Role;
  status: UserStatus;
}

export interface Jameya {
  id: string;
  name: string;
  total_amount: number; // payout per full share
  monthly_installment: number; // due per full share
  duration_months: number;
  start_date: string; // YYYY-MM-DD
}

export interface JameyaAdmin {
  jameya_id: string;
  user_id: string;
}

export interface Membership {
  id: string;
  jameya_id: string;
  user_id: string;
  shares_count: number;
}

export interface SharePayout {
  id: string;
  membership_id: string;
  share_number: number;
  payout_month: number;
  is_paid_out: boolean; // admin confirmed the payout was handed over
}

export interface Payment {
  id: string;
  jameya_id: string;
  user_id: string;
  month_number: number;
  status: PaymentStatus;
}

/** Weight of each share slot: 1.5 shares -> [1, 0.5]; 2 -> [1, 1]; 0.5 -> [0.5]. */
export function shareWeights(shares: number): number[] {
  const weights: number[] = [];
  let left = shares;
  while (left > 1e-9) {
    weights.push(Math.min(1, left));
    left -= 1;
  }
  return weights;
}

/** 1-based month number the Jam'eya is currently in, clamped to its duration. */
export function currentMonthNumber(startDate: string, duration: number): number {
  const s = new Date(startDate);
  const now = new Date();
  const diff = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth()) + 1;
  return Math.min(Math.max(diff, 1), duration);
}

/** Localised "Jan 2026"-style label for month N of the Jam'eya. */
export function monthLabel(startDate: string, n: number, locale: string): string {
  const s = new Date(startDate);
  const d = new Date(s.getFullYear(), s.getMonth() + n - 1, 1);
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(d);
}
