export const COOKIE_NAME = "app_session_id";
// Launch moment — 8:00 PM WAT (UTC+1) on 2026-06-29 = 19:00 UTC.
export const LAUNCH_AT_MS = Date.parse("2026-06-29T19:00:00Z");
// After launch, the promo runs until this many distinct customers have purchased.
export const LAUNCH_PROMO_BUYERS = 3;

export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
