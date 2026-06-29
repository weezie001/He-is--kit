export const COOKIE_NAME = "app_session_id";
// Launch moment — 8:00 PM WAT (UTC+1) on 2026-06-29 = 19:00 UTC.
export const LAUNCH_AT_MS = Date.parse("2026-06-29T19:00:00Z");
// After launch, the promo runs until this many distinct customers have purchased.
export const LAUNCH_PROMO_BUYERS = 3;

// ---- Sizing -----------------------------------------------------------------
// Wearable apparel uses letter sizes; footwear uses EU number sizes; everything
// else (balls, bags, towels) is one-size and shows no size selector.
export const APPAREL_SIZES = ["M", "L", "XL"];
export const FOOTWEAR_SIZES = ["41", "42", "43", "44", "45"];

// Categories evolve (admin free-text slugs), so classify by keyword with an
// explicit allow-list as backup. Footwear is checked first.
const APPAREL_CATEGORIES = new Set([
  "club_jerseys", "country_jerseys", "track_suit", "track_suits", "training_kits",
  "training_kit", "shirt", "shirts", "shorts", "jersey", "jerseys",
]);
const FOOTWEAR_CATEGORIES = new Set(["boots", "boot", "trainers", "trainer"]);
const FOOTWEAR_KEYWORDS = /boot|trainer|sneaker|cleat/;
const APPAREL_KEYWORDS = /jersey|shirt|tee|short|track|suit|kit|jacket|hoodie|sweatshirt|sweater/;

export type SizeKind = "apparel" | "footwear" | "one";

export function sizeKind(category?: string | null): SizeKind {
  const c = (category || "").toLowerCase().trim();
  if (!c) return "one";
  if (FOOTWEAR_CATEGORIES.has(c) || FOOTWEAR_KEYWORDS.test(c)) return "footwear";
  if (APPAREL_CATEGORIES.has(c) || APPAREL_KEYWORDS.test(c)) return "apparel";
  return "one";
}

/** Selectable sizes for a product category. [] = one-size (no size selector). */
export function sizesForCategory(category?: string | null): string[] {
  const k = sizeKind(category);
  return k === "footwear" ? FOOTWEAR_SIZES : k === "apparel" ? APPAREL_SIZES : [];
}

export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
