// Standalone Google OAuth 2.0 (authorization-code flow), independent of the
// Manus/Forge "HEIS ID" portal. Two routes:
//   GET /api/auth/google           → redirect to Google's consent screen
//   GET /api/auth/google/callback  → exchange code, upsert/link user, set session
//
// Users are keyed by openId = `google_<sub>`. If a verified Google email already
// belongs to an existing account (e.g. an email/password user), we sign into
// THAT account (automatic linking) — but only when Google says the email is
// verified, to prevent account takeover.
import crypto from "crypto";
import type { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME, ONE_YEAR_MS, LAUNCH_AT_MS } from "@shared/const";
import * as db from "../db";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { getSessionCookieOptions } from "./cookies";
import { sendWelcomeEmail, notifyAdminNewSignup } from "./mailer";

const STATE_COOKIE = "g_oauth_state";
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 min to complete the consent
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

function isSecure(req: Request): boolean {
  if (req.protocol === "https") return true;
  const fp = req.headers["x-forwarded-proto"];
  const list = Array.isArray(fp) ? fp : (fp || "").split(",");
  return list.some(p => p.trim().toLowerCase() === "https");
}

// Public origin of this request (honours APP_BASE_URL and proxy headers).
function origin(req: Request): string {
  if (ENV.appBaseUrl) return ENV.appBaseUrl.replace(/\/$/, "");
  const proto = isSecure(req) ? "https" : "http";
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
  return `${proto}://${host}`;
}

function redirectUri(req: Request): string {
  return `${origin(req)}/api/auth/google/callback`;
}

export function registerGoogleAuthRoutes(app: Express) {
  // Kick off the flow.
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!ENV.googleClientId || !ENV.googleClientSecret) {
      return res.redirect(302, "/login?error=google_unavailable");
    }
    const state = crypto.randomBytes(16).toString("hex");
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax", // top-level navigation back from Google must send the cookie
      secure: isSecure(req),
      path: "/",
      maxAge: STATE_MAX_AGE_MS,
    });
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", ENV.googleClientId);
    url.searchParams.set("redirect_uri", redirectUri(req));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "online");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("prompt", "select_account");
    res.redirect(302, url.toString());
  });

  // Handle the redirect back from Google.
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const fail = (reason: string) => res.redirect(302, `/login?error=${encodeURIComponent(reason)}`);
    try {
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const state = typeof req.query.state === "string" ? req.query.state : "";
      const cookies = parseCookieHeader(req.headers.cookie || "");
      const cookieState = cookies[STATE_COOKIE];
      res.clearCookie(STATE_COOKIE, { path: "/" });

      if (req.query.error) return fail("google_denied"); // user cancelled at Google
      if (!code || !state || !cookieState || state !== cookieState) return fail("google_state");
      if (!ENV.googleClientId || !ENV.googleClientSecret) return fail("google_unavailable");

      // Exchange the code for tokens.
      const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri(req),
          grant_type: "authorization_code",
        }),
      });
      const tokens: any = await tokenResp.json().catch(() => ({}));
      if (!tokenResp.ok || !tokens?.access_token) return fail("google_token");

      // Fetch the verified profile.
      const profResp = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile: any = await profResp.json().catch(() => ({}));
      const sub: string = profile?.sub || "";
      if (!profResp.ok || !sub) return fail("google_profile");

      const email = String(profile.email || "").toLowerCase().trim();
      const emailVerified = profile.email_verified === true || profile.email_verified === "true";
      const name = String(profile.name || "").trim() || (email ? email.split("@")[0] : "HEIS member");
      const googleOpenId = `google_${sub}`;

      // Resolve the account: existing Google user → linked verified-email account → new.
      let user = await db.getUserByOpenId(googleOpenId);
      let isNew = false;
      if (!user && email && emailVerified) {
        const existing = await db.getUserByEmail(email);
        if (existing) {
          // Only auto-link to accounts created via a verified channel (OAuth —
          // no self-set password). A local email/password account proves no
          // email ownership, so linking Google into it would let someone who
          // pre-registered the victim's address hijack the Google sign-in.
          // Send those users to password sign-in instead (they can reset via
          // the email they actually control if needed).
          if (existing.passwordHash) return fail("google_email_in_use");
          user = existing;
        }
      }
      // Launch gate — block brand-new accounts before launch (owner exempt).
      if (!user && Date.now() < LAUNCH_AT_MS && email !== ENV.ownerEmail) {
        return fail("launch_not_open");
      }
      if (!user) {
        await db.upsertUser({
          openId: googleOpenId,
          name,
          // Only persist the email when Google verified it — avoids creating a
          // second row that shares an existing account's (unverified) address.
          email: emailVerified ? (email || null) : null,
          loginMethod: "google",
          lastSignedIn: new Date(),
        });
        user = await db.getUserByOpenId(googleOpenId);
        isNew = true;
      } else {
        // Touch lastSignedIn; backfill name/email only if missing (don't clobber).
        await db.upsertUser({
          openId: user.openId,
          name: user.name || name,
          email: user.email || email || null,
          loginMethod: user.loginMethod || "google",
          lastSignedIn: new Date(),
        });
      }
      if (!user) return fail("google_user");

      // Issue our session cookie (same HS256 JWT as the rest of auth).
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || name,
        expiresInMs: ONE_YEAR_MS,
      });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });

      // New-account notifications (awaited so they run in the serverless function;
      // failures are non-fatal — the mailer logs to console without a key).
      if (isNew) {
        await Promise.allSettled([
          ...(user.email ? [sendWelcomeEmail(user.email, user.name || name)] : []),
          notifyAdminNewSignup({ name: user.name || name, email: user.email, method: "google" }),
        ]);
      }

      res.redirect(302, "/");
    } catch (err) {
      console.error("[GoogleOAuth] callback failed", err);
      return fail("google_failed");
    }
  });
}
