import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { getMatchTicker } from "./_core/matches";
import { sdk } from "./_core/sdk";
import { hashPassword, verifyPassword } from "./_core/password";
import { storagePut } from "./storage";
import { sendPasswordResetEmail, sendOrderConfirmationEmail, notifyAdminNewOrder, notifyAdminNewSupportMessage } from "./_core/mailer";
import { paymentsProvider, initializePayment, verifyPayment } from "./_core/payments";
import { ENV } from "./_core/env";
import { nanoid } from "nanoid";
import crypto from "crypto";
import type { TrpcContext } from "./_core/context";
import { TRPCError } from "@trpc/server";

// Public base URL for callback/reset links — explicit env, else derived from the request.
function getOrigin(ctx: TrpcContext): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/+$/, "");
  const fwdProto = ctx.req.headers["x-forwarded-proto"];
  const proto = (Array.isArray(fwdProto) ? fwdProto[0] : fwdProto || ctx.req.protocol || "http").split(",")[0];
  const host = ctx.req.headers["x-forwarded-host"] || ctx.req.headers.host;
  return `${proto}://${host}`;
}

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

// Strip sensitive fields (e.g. the scrypt passwordHash) before sending a user
// row to the client. `auth.me` ships to the browser on every page load, so the
// hash must never leave the server.
function sanitizeUser(user: TrpcContext["user"]) {
  if (!user) return null;
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export type SafeUser = NonNullable<ReturnType<typeof sanitizeUser>>;

// Set the session cookie. Same-site local dev needs sameSite "lax" (browsers
// reject sameSite "none" without secure over http); cross-site prod uses "none".
function setSessionCookie(ctx: TrpcContext, token: string) {
  const fp = ctx.req.headers["x-forwarded-proto"];
  const proto = Array.isArray(fp) ? fp.join(",") : fp || "";
  const secure = ctx.req.protocol === "https" || proto.toLowerCase().includes("https");
  ctx.res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
    maxAge: ONE_YEAR_MS,
  });
}

// ---- Search helpers ---------------------------------------------------------
const CATEGORY_SLUGS = [
  "club_jerseys", "track_suits", "training_kits", "boots",
  "trainers", "balls", "gym_gear", "towels", "sports_bags",
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  club_jerseys: ["jersey", "kit", "shirt", "strip", "home", "away", "club"],
  track_suits: ["tracksuit", "track suit"],
  training_kits: ["training", "practice", "drill"],
  boots: ["boot", "cleat", "studs"],
  trainers: ["trainer", "sneaker", "runner", "running shoe", "shoe"],
  balls: ["ball", "soccer ball"],
  gym_gear: ["gym", "dumbbell", "kettlebell", "glove", "belt", "weight", "lifting"],
  towels: ["towel"],
  sports_bags: ["bag", "backpack", "duffel", "holdall"],
};

function resolveCategory(text?: string): string | undefined {
  const t = (text || "").toLowerCase();
  for (const [slug, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some(k => t.includes(k))) return slug;
  }
  return undefined;
}

// Rank products by keyword/color/category overlap. Returns only positive hits.
function rankProducts(products: any[], terms: (string | undefined)[], categorySlug?: string, color?: string): any[] {
  const words = terms.filter((w): w is string => Boolean(w)).map(w => w.toLowerCase()).filter(w => w.length > 2);
  return products
    .map(p => {
      const tags = Array.isArray(p.tags) ? p.tags : [];
      const hay = [p.name, p.category, p.color, p.style, ...tags].join(" ").toLowerCase();
      let score = 0;
      for (const w of words) if (hay.includes(w)) score += 1;
      if (categorySlug && p.category === categorySlug) score += 3;
      if (color && p.color && p.color.toLowerCase() === String(color).toLowerCase()) score += 2;
      return { p, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.p);
}

// ---- Team → jersey colour heuristic (fallback for the live recommendations) --
const TEAM_COLORS: Record<string, string> = {
  // clubs
  "manchester united": "red", "man united": "red", "liverpool": "red", "arsenal": "red",
  "bayern": "red", "milan": "red", "atletico": "red", "roma": "red", "benfica": "red",
  "manchester city": "sky", "man city": "sky", "napoli": "sky", "coventry": "sky",
  "chelsea": "blue", "psg": "blue", "paris": "blue", "inter": "blue", "everton": "blue",
  "barcelona": "navy", "villarreal": "navy",
  "real madrid": "white", "madrid": "white", "tottenham": "white", "leeds": "white", "valencia": "white",
  "juventus": "black", "newcastle": "black", "udinese": "black",
  // nations
  "england": "white", "switzerland": "red", "canada": "red", "morocco": "red", "denmark": "red",
  "spain": "red", "portugal": "red", "belgium": "red", "wales": "red", "turkey": "red", "tunisia": "red",
  "scotland": "navy", "italy": "blue", "france": "navy", "japan": "blue", "haiti": "blue", "bosnia": "blue",
  "argentina": "sky", "uruguay": "sky", "greece": "sky",
  "usa": "white", "germany": "white", "poland": "white", "serbia": "white", "qatar": "white",
  "congo": "red", "nigeria": "white", "senegal": "white", "egypt": "red",
};

// Map a colour to the nearest jersey colour we actually stock.
const COLOR_FALLBACK: Record<string, string> = {
  yellow: "red", orange: "red", maroon: "red", green: "navy", purple: "navy",
};

function teamColor(team: string): string | null {
  const t = team.toLowerCase();
  for (const [k, v] of Object.entries(TEAM_COLORS)) if (t.includes(k)) return v;
  return null;
}

function pickJerseyByColor(color: string, jerseys: any[]): any | undefined {
  const direct = jerseys.find(j => `${j.color || ""} ${j.name || ""}`.toLowerCase().includes(color));
  if (direct) return direct;
  const alt = COLOR_FALLBACK[color];
  return alt ? jerseys.find(j => `${j.color || ""} ${j.name || ""}`.toLowerCase().includes(alt)) : undefined;
}

const slimProduct = (p: any) => ({
  id: p.id, name: p.name, imageUrl: p.imageUrl, price: p.price,
  category: p.category, color: p.color, sizes: p.sizes,
});

let jerseyRecsCache: { ts: number; data: any[] } | null = null;

// ---- Admin product input -----------------------------------------------------
// Prices arrive as numbers from the form; the DB stores them as decimal strings.
const productInput = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  team: z.string().optional(),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().optional(),
  imageUrl: z.string().min(1, "Image URL is required"),
  imageUrls: z.array(z.string()).optional(), // full gallery (incl. primary)
  color: z.string().optional(),
  material: z.string().optional(),
  style: z.string().optional(),
  sizes: z.record(z.string(), z.number()).optional(), // { "M": 20, ... } stock per size
  tags: z.array(z.string()).optional(),
  stock: z.number().int().nonnegative().optional(),
  featured: z.boolean().optional(),
});

// Convert validated input into a DB row (decimal columns want strings).
function toProductRow(input: Partial<z.infer<typeof productInput>>): any {
  const row: any = { ...input };
  if (input.price !== undefined) row.price = input.price.toFixed(2);
  if (input.originalPrice !== undefined) row.originalPrice = input.originalPrice.toFixed(2);
  return row;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => sanitizeUser(opts.ctx.user)),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    // Local email/password registration
    register: publicProcedure
      .input(z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email(),
        password: z.string().min(6, "Password must be at least 6 characters"),
      }))
      .mutation(async ({ ctx, input }) => {
        const email = input.email.toLowerCase().trim();
        const existing = await db.getUserByEmail(email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists" });
        }
        const openId = `local_${nanoid()}`;
        const passwordHash = await hashPassword(input.password);
        const user = await db.createPasswordUser({ openId, name: input.name.trim(), email, passwordHash });
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account" });

        const token = await sdk.createSessionToken(openId, { name: user.name || "", expiresInMs: ONE_YEAR_MS });
        setSessionCookie(ctx, token);
        return { success: true };
      }),

    // Local email/password login (with brute-force lockout)
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const email = input.email.toLowerCase().trim();
        const user = await db.getUserByEmail(email);
        const INVALID = new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });

        if (!user || !user.passwordHash) throw INVALID;

        // Locked out?
        if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
          const mins = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` });
        }

        if (!(await verifyPassword(input.password, user.passwordHash))) {
          const attempts = (user.failedLoginAttempts || 0) + 1;
          const locked = attempts >= LOCKOUT_THRESHOLD;
          await db.setUserLoginState(user.id, {
            failedLoginAttempts: locked ? 0 : attempts,
            lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MS) : null,
          });
          if (locked) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many failed attempts. Account locked for 15 minutes." });
          throw INVALID;
        }

        // Success — clear any failure state.
        if (user.failedLoginAttempts || user.lockedUntil) {
          await db.setUserLoginState(user.id, { failedLoginAttempts: 0, lockedUntil: null });
        }
        const token = await sdk.createSessionToken(user.openId, { name: user.name || "", expiresInMs: ONE_YEAR_MS });
        setSessionCookie(ctx, token);
        return { success: true };
      }),

    // Request a password-reset link (local accounts). Always returns success so
    // we don't reveal which emails are registered.
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        const email = input.email.toLowerCase().trim();
        const user = await db.getUserByEmail(email);
        if (user && user.passwordHash && user.email) {
          const token = nanoid(40);
          await db.createPasswordResetToken(user.id, sha256(token), new Date(Date.now() + 60 * 60 * 1000));
          const resetUrl = `${getOrigin(ctx)}/reset-password?token=${token}`;
          try { await sendPasswordResetEmail(user.email, resetUrl); } catch { /* logged in mailer */ }
        }
        return { success: true };
      }),

    // Complete a password reset with the emailed token.
    resetPassword: publicProcedure
      .input(z.object({ token: z.string().min(10), password: z.string().min(6, "Password must be at least 6 characters") }))
      .mutation(async ({ input }) => {
        const userId = await db.consumePasswordResetToken(sha256(input.token));
        if (!userId) throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link is invalid or has expired." });
        await db.updateUserPassword(userId, await hashPassword(input.password));
        await db.setUserLoginState(userId, { failedLoginAttempts: 0, lockedUntil: null });
        return { success: true };
      }),

    // Change password (local accounts only)
    changePassword: protectedProcedure
      .input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(6) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user.passwordHash) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Password change isn't available for social sign-in accounts." });
        }
        if (!(await verifyPassword(input.currentPassword, ctx.user.passwordHash))) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
        }
        await db.updateUserPassword(ctx.user.id, await hashPassword(input.newPassword));
        return { success: true };
      }),

    // Permanently delete the account
    deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
      await db.deleteUserAccount(ctx.user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
  }),

  // Product catalog
  products: router({
    list: publicProcedure
      .input(z.object({ category: z.string().optional(), team: z.string().optional(), style: z.string().optional(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getProducts(input.category, input.limit, input.team, input.style);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const product = await db.getProductById(input.id);
        if (!product) throw new TRPCError({ code: "NOT_FOUND" });
        return product;
      }),

    featured: publicProcedure.query(async () => {
      const allProducts = await db.getProducts(undefined, 100, undefined, undefined);
      return allProducts.filter((p: any) => p.featured).slice(0, 6);
    }),

    // Fast keyword search for instant typeahead (no LLM).
    search: publicProcedure
      .input(z.object({ q: z.string() }))
      .query(async ({ input }) => {
        const q = input.q.trim().toLowerCase();
        if (!q) return [];
        const all = await db.getProducts(undefined, 100);
        const terms = q.split(/\W+/).filter(Boolean);
        const categorySlug = resolveCategory(q);
        let results = rankProducts(all, terms, categorySlug);
        if (results.length === 0 && categorySlug) results = all.filter((p: any) => p.category === categorySlug);
        if (results.length === 0) results = all.filter((p: any) => p.name.toLowerCase().includes(q));
        return results.slice(0, 8);
      }),

    // Distinct categories present in the catalog (+counts). Categories are
    // free-form, so the storefront/admin derive the list from live data.
    categories: publicProcedure.query(() => db.getCategoryCounts()),
  }),

  // Shopping cart
  cart: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const items = await db.getCartItems(ctx.user.id);
      // Enrich with product details
      const enriched = await Promise.all(
        items.map(async (item: any) => {
          const product = await db.getProductById(item.productId);
          return { ...item, product };
        })
      );
      return enriched;
    }),

    add: protectedProcedure
      .input(z.object({ productId: z.number(), size: z.string(), quantity: z.number().default(1) }))
      .mutation(async ({ ctx, input }) => {
        await db.addToCart(ctx.user.id, input.productId, input.size, input.quantity);
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ cartItemId: z.number() }))
      .mutation(async ({ input }) => {
        await db.removeFromCart(input.cartItemId);
        return { success: true };
      }),

    clear: protectedProcedure.mutation(async ({ ctx }) => {
      await db.clearCart(ctx.user.id);
      return { success: true };
    }),
  }),

  // Orders
  orders: router({
    create: protectedProcedure
      .input(z.object({
        items: z.array(z.object({ productId: z.number(), size: z.string(), quantity: z.number(), price: z.number() })),
        totalAmount: z.number(),
        shippingAddress: z.object({
          name: z.string(),
          email: z.string(),
          address: z.string(),
          city: z.string(),
          country: z.string(),
          postalCode: z.string(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createOrder(ctx.user.id, {
          items: input.items,
          totalAmount: input.totalAmount,
          shippingAddress: input.shippingAddress,
        });
        await db.clearCart(ctx.user.id);
        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserOrders(ctx.user.id);
    }),

    // Cancel an order (allowed until it's delivered)
    cancel: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.cancelOrder(ctx.user.id, input.orderId);
        return { success: true };
      }),
  }),

  // Smart Sport Profiler
  profile: router({
    // Account settings (name, contact, address, marketing prefs)
    updateAccount: protectedProcedure
      .input(z.object({
        name: z.string().min(1).optional(),
        phone: z.string().max(40).optional(),
        shippingAddress: z.object({
          address: z.string().optional(),
          city: z.string().optional(),
          country: z.string().optional(),
          postalCode: z.string().optional(),
        }).optional(),
        marketingOptIn: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        favoriteSport: z.string().optional(),
        favoriteTeam: z.string().optional(),
        userType: z.string().optional(), // "fan" or "player"
        stylePreference: z.string().optional(),
        height: z.number().optional(),
        weight: z.number().optional(),
        measurements: z.object({
          chest: z.number().optional(),
          waist: z.number().optional(),
          hips: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profileData: any = { ...input, profileCompleted: true };
        
        // Calculate recommended size based on height/weight
        if (input.height && input.weight) {
          const size = calculateSizeRecommendation(input.height, input.weight);
          profileData.recommendedSize = size;
        }

        await db.updateUserProfile(ctx.user.id, profileData);
        return { success: true };
      }),

    get: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserByOpenId(ctx.user.openId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        favoriteSport: user.favoriteSport,
        favoriteTeam: user.favoriteTeam,
        userType: user.userType,
        stylePreference: user.stylePreference,
        height: user.height,
        weight: user.weight,
        measurements: user.measurements,
        recommendedSize: user.recommendedSize,
        profileCompleted: user.profileCompleted,
      };
    }),
  }),

  // AI Size Advisor
  sizeAdvisor: router({
    recommend: publicProcedure
      .input(z.object({ height: z.number(), weight: z.number() }))
      .query(async ({ input }) => {
        const size = calculateSizeRecommendation(input.height, input.weight);
        const confidence = calculateConfidence(input.height, input.weight);
        return { size, confidence };
      }),
  }),

  // Live football scores + fixtures for the homepage ticker
  matches: router({
    ticker: publicProcedure.query(() => getMatchTicker()),

    // Recommend the club jersey of every team playing today.
    // Uses Gemini to map team → kit colour, with a heuristic fallback.
    recommended: publicProcedure.query(async () => {
      if (jerseyRecsCache && Date.now() - jerseyRecsCache.ts < 10 * 60 * 1000) return jerseyRecsCache.data;

      const matches = await getMatchTicker();
      const teams: string[] = [];
      for (const m of matches as any[]) {
        for (const t of [m.home, m.away]) if (t && !teams.includes(t)) teams.push(t);
      }
      const top = teams.slice(0, 12);
      const jerseys = await db.getProducts("club_jerseys");
      if (top.length === 0 || jerseys.length === 0) {
        jerseyRecsCache = { ts: Date.now(), data: [] };
        return [];
      }

      const recs: { team: string; product: any }[] = [];
      const addRec = (team: string, product: any) => {
        if (product && !recs.find(x => x.product.id === product.id)) recs.push({ team, product });
      };

      // Gemini mapping (the "smart" path)
      try {
        const jerseyList = jerseys.map((j: any) => `#${j.id} ${j.name} (${j.color})`).join("\n");
        const resp = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Map each football team/nation to the catalog jersey whose colour best matches that club or nation's primary HOME kit.
JERSEYS:
${jerseyList}
Return JSON { recs: [{ team: string, productId: number }] }. Only include teams you can confidently match by colour.`,
            },
            { role: "user", content: `Teams playing today: ${top.join(", ")}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "jersey_recs",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  recs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { team: { type: "string" }, productId: { type: "number" } },
                      required: ["team", "productId"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["recs"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = resp.choices[0].message.content;
        const parsed = JSON.parse((typeof content === "string" ? content : JSON.stringify(content)) || "{}");
        for (const r of parsed.recs || []) {
          addRec(r.team, jerseys.find((j: any) => j.id === r.productId));
        }
      } catch {
        // ignore — fall back to heuristic
      }

      // Heuristic fill — always, to cover teams Gemini missed
      for (const team of top) {
        if (recs.length >= 8) break;
        const color = teamColor(team);
        if (!color) continue;
        addRec(team, pickJerseyByColor(color, jerseys));
      }

      const data = recs.slice(0, 8).map(r => ({ team: r.team, product: slimProduct(r.product) }));
      if (data.length > 0) jerseyRecsCache = { ts: Date.now(), data }; // don't cache empty
      return data;
    }),
  }),

  // Product reviews
  reviews: router({
    list: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(({ input }) => db.getReviews(input.productId)),
    create: protectedProcedure
      .input(z.object({
        productId: z.number(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createReview({
          productId: input.productId,
          userId: ctx.user.id,
          author: ctx.user.name || "HEIS Member",
          rating: input.rating,
          comment: input.comment,
        });
        return { success: true };
      }),
  }),

  // Virtual Try-On — composite a product onto the user's uploaded photo
  tryOn: router({
    generate: publicProcedure
      .input(
        z.object({
          productId: z.number(),
          userImage: z.object({
            b64Json: z.string(), // base64 (no data: prefix)
            mimeType: z.string().default("image/jpeg"),
          }),
          // Camera angles to render. Each is a separate generation.
          views: z.array(z.string()).default(["front", "three-quarter angle"]),
        })
      )
      .mutation(async ({ input }) => {
        const product = await db.getProductById(input.productId);
        if (!product) throw new TRPCError({ code: "NOT_FOUND" });

        const garment = `${product.name}${product.color ? `, ${product.color}` : ""} (${product.category.replace("_", " ")})`;

        // Generate each requested view independently.
        const results = await Promise.allSettled(
          input.views.slice(0, 4).map(async view => {
            const prompt = [
              "You are a professional virtual try-on / fashion compositing engine.",
              `Take the PERSON in the first image and dress them in the FOOTBALL GARMENT shown in the second image: a ${garment}.`,
              "Preserve the person's face, skin tone, hair, body shape and proportions exactly.",
              "The garment must fit the body naturally with realistic folds, lighting and shadows.",
              `Render a photorealistic, full-body ${view} studio shot on a clean neutral background.`,
              "Output only the final image.",
            ].join(" ");

            const { url } = await generateImage({
              prompt,
              originalImages: [
                { b64Json: input.userImage.b64Json, mimeType: input.userImage.mimeType },
                { url: product.imageUrl, mimeType: "image/jpeg" },
              ],
            });
            return { view, url };
          })
        );

        const images: Array<{ view: string; url: string }> = [];
        for (const r of results) {
          if (r.status === "fulfilled" && r.value.url) {
            images.push({ view: r.value.view, url: r.value.url });
          }
        }

        if (images.length === 0) {
          const firstErr = results.find(r => r.status === "rejected") as PromiseRejectedResult | undefined;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: firstErr ? String(firstErr.reason?.message || firstErr.reason) : "Try-on generation failed",
          });
        }

        return { product: { id: product.id, name: product.name }, images };
      }),
  }),

  // Search
  search: router({
    // Image search — find catalog products that resemble an uploaded photo
    byImage: publicProcedure
      .input(
        z.object({
          image: z.object({
            b64Json: z.string(),
            mimeType: z.string().default("image/jpeg"),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a visual search assistant for HEIS KITS, a football/sports store.
Look at the image and infer what sports item it most resembles.
Categories: ${CATEGORY_SLUGS.join(", ")}.
Return JSON with: category (best-matching category slug), team (club name if a recognizable kit, else empty), style (classic, modern, bold, or minimalist), color (dominant color), tags (keywords describing the item).`,
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Identify this football apparel item for catalog matching." },
                {
                  type: "image_url",
                  image_url: { url: `data:${input.image.mimeType};base64,${input.image.b64Json}` },
                },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "image_search_intent",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  team: { type: "string" },
                  style: { type: "string" },
                  color: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                },
                required: ["category", "team", "style", "color", "tags"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0].message.content;
        const intentText = typeof content === "string" ? content : JSON.stringify(content);
        const intent = JSON.parse(intentText || "{}");

        // Flexible match against the catalog by category / color / keywords.
        const all = await db.getProducts(undefined, 100);
        const terms = [...(Array.isArray(intent.tags) ? intent.tags : []), intent.color].filter(Boolean);
        const categorySlug = resolveCategory(`${intent.category || ""} ${(intent.tags || []).join(" ")}`);
        let scored = rankProducts(all, terms, categorySlug, intent.color);
        if (scored.length === 0) scored = categorySlug ? all.filter((p: any) => p.category === categorySlug) : all.slice(0, 8);
        scored = scored.slice(0, 12);

        if (ctx.user) {
          try {
            await db.saveSearchQuery(ctx.user.id, `[image] ${intent.category} ${intent.team || ""}`.trim(), scored.map((r: any) => r.id));
          } catch {
            // ignore history failures
          }
        }

        return { intent, results: scored };
      }),

    conversational: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input, ctx }) => {
        // Use the LLM to extract intent, but degrade gracefully to plain
        // keyword matching if it fails — so search always returns something.
        let intent: any = {};
        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a search assistant for HEIS KITS football/sports store.
Categories available: ${CATEGORY_SLUGS.join(", ")}.
From the user's query extract JSON: { category: string (best-matching category slug or ""), color: string, keywords: string[] }.`,
              },
              { role: "user", content: input.query },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "search_intent",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    color: { type: "string" },
                    keywords: { type: "array", items: { type: "string" } },
                  },
                  required: ["category", "color", "keywords"],
                  additionalProperties: false,
                },
              },
            },
          });
          const content = response.choices[0].message.content;
          intent = JSON.parse((typeof content === "string" ? content : JSON.stringify(content)) || "{}");
        } catch {
          intent = {};
        }

        const all = await db.getProducts(undefined, 100);
        const terms = [
          ...input.query.toLowerCase().split(/\W+/),
          ...(Array.isArray(intent.keywords) ? intent.keywords : []),
          intent.color,
        ].filter(Boolean);
        const categorySlug = resolveCategory(`${input.query} ${intent.category || ""}`);
        let results = rankProducts(all, terms, categorySlug, intent.color);
        if (results.length === 0 && categorySlug) results = all.filter((p: any) => p.category === categorySlug);
        results = results.slice(0, 12);

        if (ctx.user) {
          try {
            await db.saveSearchQuery(ctx.user.id, input.query, results.map((r: any) => r.id));
          } catch {
            // ignore history failures
          }
        }
        return results;
      }),
  }),

  // Sport Expert Chatbot
  chat: router({
    send: protectedProcedure
      .input(z.object({
        message: z.string(),
        image: z.object({ b64Json: z.string(), mimeType: z.string().default("image/jpeg") }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // History BEFORE saving the new message (avoids duplication).
        const history = await db.getChatHistory(ctx.user.id, 10);
        const catalog = await db.getProducts(undefined, 100);
        const catalogList = catalog
          .map((p: any) => `#${p.id} ${p.name} [${p.category}] ${p.color || ""} ₦${p.price}`)
          .join("\n");

        // User turn — text plus an optional uploaded image (vision).
        const userContent: any[] = [
          { type: "text", text: input.message || "What is this? Recommend similar items from the store." },
        ];
        if (input.image) {
          userContent.push({
            type: "image_url",
            image_url: { url: `data:${input.image.mimeType};base64,${input.image.b64Json}` },
          });
        }

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are HEIS Expert — a friendly, football-savvy shopping assistant for HEIS KITS.
You can SEE images the user uploads (kits, gear, outfits) and should describe/identify them.
When relevant, recommend specific products by id from the CATALOG below so the user can view and buy them.
Be concise and actionable.

CATALOG:
${catalogList}

Reply as JSON: { "reply": string, "productIds": number[] } where productIds are 0-3 ids from the catalog to show as cards (empty array if none fit).`,
            },
            ...history.map((msg: any) => ({ role: msg.role, content: msg.content })),
            { role: "user", content: userContent },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "chat_reply",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  reply: { type: "string" },
                  productIds: { type: "array", items: { type: "number" } },
                },
                required: ["reply", "productIds"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0].message.content;
        const raw = typeof content === "string" ? content : JSON.stringify(content);
        let parsed: any = {};
        try { parsed = JSON.parse(raw || "{}"); } catch { parsed = { reply: raw, productIds: [] }; }
        const reply = parsed.reply || "Let me help you find the right gear.";
        const ids: number[] = Array.isArray(parsed.productIds) ? parsed.productIds.slice(0, 3) : [];
        const products = catalog
          .filter((p: any) => ids.includes(p.id))
          .map((p: any) => ({ id: p.id, name: p.name, imageUrl: p.imageUrl, price: p.price, category: p.category }));

        await db.saveChatMessage(ctx.user.id, "user", input.message || "[sent an image]");
        await db.saveChatMessage(ctx.user.id, "assistant", reply);

        return { message: reply, products };
      }),

    history: protectedProcedure.query(async ({ ctx }) => {
      return db.getChatHistory(ctx.user.id, 50);
    }),
  }),

  // ----------------------------------------------------------------
  // Admin — store management. Every procedure is gated by adminProcedure
  // (FORBIDDEN unless ctx.user.role === "admin").
  // ----------------------------------------------------------------
  admin: router({
    // Dashboard rollup: revenue, counts, status breakdown, recent + low stock.
    stats: adminProcedure.query(async () => {
      const [allProducts, allOrders, allCustomers] = await Promise.all([
        db.adminGetAllProducts(),
        db.adminGetAllOrders(),
        db.adminGetAllCustomers(),
      ]);

      const liveOrders = allOrders.filter((o: any) => o.status !== "cancelled");
      const totalRevenue = liveOrders.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);

      const statusCounts: Record<string, number> = {
        pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0,
      };
      for (const o of allOrders as any[]) {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      }

      const LOW_STOCK_THRESHOLD = 10;
      const lowStock = (allProducts as any[])
        .filter(p => (p.stock ?? 0) <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));

      return {
        totalRevenue,
        orderCount: allOrders.length,
        productCount: allProducts.length,
        customerCount: allCustomers.length,
        openOrderCount: statusCounts.pending + statusCounts.processing,
        lowStockCount: lowStock.length,
        statusCounts,
        recentOrders: (allOrders as any[]).slice(0, 6).map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          totalAmount: o.totalAmount,
          userName: o.userName,
          userEmail: o.userEmail,
          createdAt: o.createdAt,
        })),
        lowStock: lowStock.slice(0, 6).map(p => ({
          id: p.id, name: p.name, stock: p.stock ?? 0, category: p.category, imageUrl: p.imageUrl,
        })),
      };
    }),

    products: router({
      list: adminProcedure.query(() => db.adminGetAllProducts()),

      create: adminProcedure
        .input(productInput)
        .mutation(async ({ input }) => {
          const product = await db.adminCreateProduct(toProductRow(input));
          return { success: true, product };
        }),

      update: adminProcedure
        .input(z.object({ id: z.number() }).and(productInput.partial()))
        .mutation(async ({ input }) => {
          const { id, ...rest } = input;
          const product = await db.adminUpdateProduct(id, toProductRow(rest));
          return { success: true, product };
        }),

      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.adminDeleteProduct(input.id);
          return { success: true };
        }),

      // Upload a product image (jpg/png/gif/webp) → returns a served URL.
      uploadImage: adminProcedure
        .input(z.object({
          b64Json: z.string().min(1),
          mimeType: z.string(),
          filename: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const EXT: Record<string, string> = {
            "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
            "image/gif": "gif", "image/webp": "webp",
          };
          const ext = EXT[input.mimeType.toLowerCase()];
          if (!ext) throw new TRPCError({ code: "BAD_REQUEST", message: "Only JPG, PNG, GIF or WEBP images are allowed" });
          const buffer = Buffer.from(input.b64Json, "base64");
          if (buffer.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Empty image" });
          if (buffer.length > 10 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Image too large (max 10MB)" });
          const base = (input.filename || "product")
            .replace(/\.[^.]+$/, "").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "product";
          const { url } = await storagePut(`products/uploads/${base}.${ext}`, buffer, input.mimeType);
          return { url };
        }),
    }),

    orders: router({
      // Orders + each line item enriched with a product preview (image/name).
      list: adminProcedure.query(async () => {
        const [allOrders, allProducts] = await Promise.all([db.adminGetAllOrders(), db.adminGetAllProducts()]);
        const pmap = new Map((allProducts as any[]).map(p => [p.id, p]));
        return (allOrders as any[]).map(o => ({
          ...o,
          items: Array.isArray(o.items)
            ? o.items.map((it: any) => {
                const p = pmap.get(it.productId);
                return {
                  ...it,
                  product: p ? { id: p.id, name: p.name, imageUrl: p.imageUrl, category: p.category, color: p.color } : null,
                };
              })
            : o.items,
        }));
      }),

      update: adminProcedure
        .input(z.object({
          orderId: z.number(),
          status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]).optional(),
          paymentStatus: z.enum(["pending", "completed", "failed"]).optional(),
          trackingNumber: z.string().max(80).optional(),
          carrier: z.string().max(80).optional(),
          estimatedDelivery: z.string().max(80).optional(),
        }))
        .mutation(async ({ input }) => {
          const { orderId, ...patch } = input;
          const order = await db.adminUpdateOrder(orderId, patch);
          return { success: true, order };
        }),
    }),

    customers: router({
      // Customers with their order count + lifetime spend (computed in JS).
      list: adminProcedure.query(async () => {
        const [customers, allOrders] = await Promise.all([
          db.adminGetAllCustomers(),
          db.adminGetAllOrders(),
        ]);
        // Count orders and spend consistently — both exclude cancelled orders so
        // "Orders" and "Spent" describe the same (realized) set of purchases.
        const byUser = new Map<number, { count: number; spent: number }>();
        for (const o of allOrders as any[]) {
          if (o.status === "cancelled") continue;
          const agg = byUser.get(o.userId) || { count: 0, spent: 0 };
          agg.count += 1;
          agg.spent += Number(o.totalAmount || 0);
          byUser.set(o.userId, agg);
        }
        return (customers as any[]).map(c => {
          const agg = byUser.get(c.id) || { count: 0, spent: 0 };
          return {
            id: c.id,
            name: c.name,
            email: c.email,
            role: c.role,
            loginMethod: c.loginMethod,
            favoriteTeam: c.favoriteTeam,
            createdAt: c.createdAt,
            orderCount: agg.count,
            totalSpent: agg.spent,
          };
        });
      }),
    }),

    // Analytics for the dashboard charts: daily sales (14d) + revenue by category.
    analytics: adminProcedure.query(async () => {
      const [allOrders, allProducts] = await Promise.all([db.adminGetAllOrders(), db.adminGetAllProducts()]);
      const live = (allOrders as any[]).filter(o => o.status !== "cancelled");
      const pmap = new Map((allProducts as any[]).map(p => [p.id, p]));

      // local YYYY-MM-DD key so buckets line up with the server's calendar day
      const dayKey = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const DAYS = 14;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const buckets: { date: string; label: string; revenue: number; orders: number }[] = [];
      const idx = new Map<string, number>();
      for (let i = DAYS - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        idx.set(dayKey(d), buckets.length);
        buckets.push({ date: dayKey(d), label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), revenue: 0, orders: 0 });
      }
      for (const o of live) {
        const b = idx.get(dayKey(new Date(o.createdAt)));
        if (b !== undefined) {
          buckets[b].revenue += Number(o.totalAmount || 0);
          buckets[b].orders += 1;
        }
      }

      const catRev = new Map<string, number>();
      for (const o of live) {
        for (const it of (Array.isArray(o.items) ? o.items : [])) {
          const cat = pmap.get(it.productId)?.category || "other";
          catRev.set(cat, (catRev.get(cat) || 0) + Number(it.price || 0) * (it.quantity || 1));
        }
      }
      const categoryRevenue = Array.from(catRev.entries())
        .map(([category, revenue]) => ({ category, revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      return { salesByDay: buckets, categoryRevenue };
    }),
  }),

  // ----------------------------------------------------------------
  // Customer support chat — one thread per user. Customers use the
  // protected procedures; admins use the adminProcedure ones.
  // ----------------------------------------------------------------
  support: router({
    // --- customer side ---
    myThread: protectedProcedure.query(({ ctx }) => db.getSupportThread(ctx.user.id)),

    myUnread: protectedProcedure.query(({ ctx }) => db.getUnreadSupportForUser(ctx.user.id)),

    send: protectedProcedure
      .input(z.object({ content: z.string().min(1).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const content = input.content.trim();
        await db.addSupportMessage(ctx.user.id, "user", content);
        // Notify the business inbox of the new customer message.
        try { await notifyAdminNewSupportMessage({ name: ctx.user.name, email: ctx.user.email, content }); } catch { /* logged */ }
        return { success: true };
      }),

    markMineRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markSupportRead(ctx.user.id, "user");
      return { success: true };
    }),

    // --- admin side ---
    threads: adminProcedure.query(() => db.adminGetSupportThreads()),

    thread: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        await db.markSupportRead(input.userId, "admin");
        return db.getSupportThread(input.userId);
      }),

    reply: adminProcedure
      .input(z.object({ userId: z.number(), content: z.string().min(1).max(2000) }))
      .mutation(async ({ input }) => {
        await db.addSupportMessage(input.userId, "admin", input.content.trim());
        return { success: true };
      }),
  }),

  // ----------------------------------------------------------------
  // Payments — initialize (creates a pending order + gateway session),
  // then verify (captures, decrements stock, clears cart, emails receipt).
  // Runs against Paystack when keys are set, else a built-in mock gateway.
  // ----------------------------------------------------------------
  payments: router({
    config: publicProcedure.query(() => ({ provider: paymentsProvider(), publicKey: ENV.paystackPublicKey || null })),

    initialize: protectedProcedure
      .input(z.object({
        shippingAddress: z.object({
          name: z.string().min(1),
          email: z.string().email(),
          address: z.string().min(1),
          city: z.string().min(1),
          country: z.string().min(1),
          postalCode: z.string().min(1),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const cart = await db.getCartItems(ctx.user.id);
        if (!cart.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Your cart is empty" });

        const items: any[] = [];
        let subtotal = 0;
        for (const ci of cart as any[]) {
          const p = await db.getProductById(ci.productId);
          if (!p) continue;
          const price = Number(p.price);
          items.push({ productId: p.id, size: ci.size, quantity: ci.quantity, price });
          subtotal += price * ci.quantity;
        }
        if (!items.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Your cart items are unavailable" });

        const tax = Math.round(subtotal * 0.075);
        const total = subtotal + tax;
        const reference = `HK-${Date.now()}-${nanoid(8)}`;

        const { id, orderNumber } = await db.createOrder(ctx.user.id, {
          items,
          totalAmount: total.toFixed(2),
          shippingAddress: input.shippingAddress,
          paymentMethod: paymentsProvider() === "paystack" ? "paystack" : "mock",
          paymentReference: reference,
        });

        const origin = getOrigin(ctx);
        const init = await initializePayment({
          amountKobo: Math.round(total * 100),
          email: input.shippingAddress.email || ctx.user.email || "",
          reference,
          callbackUrl: `${origin}/checkout/verify?reference=${encodeURIComponent(reference)}`,
          origin,
          metadata: { orderId: id, userId: ctx.user.id },
        });

        return { authorizationUrl: init.authorizationUrl, reference, orderId: id, orderNumber, provider: init.provider, total };
      }),

    verify: protectedProcedure
      .input(z.object({ reference: z.string().min(1), outcome: z.enum(["success", "failed"]).optional() }))
      .mutation(async ({ ctx, input }) => {
        const order = await db.getOrderByReference(input.reference);
        if (!order || order.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

        // Already paid (e.g. webhook beat us here) → just report success.
        if (order.paymentStatus === "completed") {
          return { status: "success" as const, orderNumber: order.orderNumber, orderId: order.id };
        }

        let status: "success" | "failed" | "pending";
        if (paymentsProvider() === "mock") {
          status = input.outcome === "failed" ? "failed" : "success"; // dev gateway: outcome from mock-pay page
        } else {
          const v = await verifyPayment(input.reference);
          status = v.status;
          // Confirm the amount actually captured matches what we charged.
          if (status === "success" && typeof v.amount === "number") {
            const expectedKobo = Math.round(Number(order.totalAmount) * 100);
            if (v.amount < expectedKobo) {
              await db.markOrderPaymentFailed(order.id);
              throw new TRPCError({ code: "BAD_REQUEST", message: "Payment amount mismatch" });
            }
          }
        }

        if (status === "success") {
          const { order: finalized, transitioned } = await db.finalizePaidOrder(order.id, input.reference);
          if (transitioned) {
            const to = ctx.user.email || (finalized?.shippingAddress as any)?.email;
            if (to) { try { await sendOrderConfirmationEmail(to, finalized); } catch { /* logged */ } }
            // Notify the business inbox of the new paid order.
            try { await notifyAdminNewOrder(finalized, { name: ctx.user.name, email: ctx.user.email }); } catch { /* logged */ }
          }
          return { status: "success" as const, orderNumber: order.orderNumber, orderId: order.id };
        }
        if (status === "failed") {
          await db.markOrderPaymentFailed(order.id);
          return { status: "failed" as const, orderNumber: order.orderNumber, orderId: order.id };
        }
        return { status: "pending" as const, orderNumber: order.orderNumber, orderId: order.id };
      }),
  }),
});

// Helper functions
function calculateSizeRecommendation(height: number, weight: number): string {
  // Simple sizing logic based on height and weight
  // height in cm, weight in kg
  const bmi = weight / ((height / 100) ** 2);
  
  if (height < 160) return "XS";
  if (height < 170) {
    if (weight < 60) return "XS";
    if (weight < 75) return "S";
    return "M";
  }
  if (height < 180) {
    if (weight < 70) return "S";
    if (weight < 85) return "M";
    return "L";
  }
  if (height < 190) {
    if (weight < 80) return "M";
    if (weight < 95) return "L";
    return "XL";
  }
  return "XXL";
}

function calculateConfidence(height: number, weight: number): number {
  // Confidence based on how "standard" the measurements are
  const bmi = weight / ((height / 100) ** 2);
  
  // Ideal BMI range is 18.5-24.9
  if (bmi >= 18.5 && bmi <= 24.9) return 95;
  if (bmi >= 17 && bmi <= 26) return 85;
  if (bmi >= 16 && bmi <= 27) return 75;
  return 60;
}

export type AppRouter = typeof appRouter;
