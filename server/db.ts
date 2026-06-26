import { eq, and, inArray, notInArray, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, InsertProduct, users, products, cartItems, orders, chatMessages, searchHistory, reviews, supportMessages, passwordResetTokens } from "../drizzle/schema";
import { ENV } from './_core/env';
import { buildMysqlPoolConfig } from "./_core/dbConfig";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = mysql.createPool(buildMysqlPoolConfig(process.env.DATABASE_URL));
      // drizzle accepts the promise pool at runtime; cast bridges the mysql2
      // promise-vs-callback Pool typings.
      _db = drizzle(pool as any);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  // orderBy(id) makes the result deterministic if duplicate-email rows ever
  // exist (prefer the earliest/original account) — login, password reset and
  // OAuth linking all resolve through here.
  const result = await db.select().from(users).where(eq(users.email, email)).orderBy(users.id).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Create a local (email/password) user and return the created row.
export async function createPasswordUser(input: { openId: string; name: string; email: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values({
    openId: input.openId,
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    loginMethod: "email",
    lastSignedIn: new Date(),
  });
  return getUserByOpenId(input.openId);
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// HEIS KITS specific queries

export async function getProducts(category?: string, limit = 50, team?: string, style?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];

  if (category) {
    conditions.push(eq(products.category, category as any));
  }
  if (team) {
    conditions.push(eq(products.team, team as any));
  }
  if (style) {
    conditions.push(eq(products.style, style as any));
  }

  let query: any = db.select().from(products);
  if (conditions.length > 0) {
    if (conditions.length === 1) {
      query = query.where(conditions[0]);
    } else {
      query = query.where(and(...conditions));
    }
  }

  return query.limit(limit);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCartItems(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(cartItems).where(eq(cartItems.userId, userId));
}

export async function addToCart(userId: number, productId: number, size: string, quantity: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if item already exists
  const existing = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId), eq(cartItems.size, size)))
    .limit(1);

  if (existing.length > 0) {
    // Update quantity
    return db
      .update(cartItems)
      .set({ quantity: existing[0].quantity + quantity })
      .where(eq(cartItems.id, existing[0].id));
  } else {
    // Insert new item
    return db.insert(cartItems).values({ userId, productId, size, quantity });
  }
}

export async function removeFromCart(cartItemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(cartItems).where(eq(cartItems.id, cartItemId));
}

export async function clearCart(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(cartItems).where(eq(cartItems.userId, userId));
}

// Create a PENDING order (payment not yet captured). Returns id + orderNumber.
export async function createOrder(userId: number, orderData: any): Promise<{ id: number; orderNumber: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const result: any = await db.insert(orders).values({ userId, orderNumber, ...orderData });
  const id = Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
  return { id, orderNumber };
}

export async function getOrderById(orderId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return r[0];
}

export async function getOrderByReference(reference: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(orders).where(eq(orders.paymentReference, reference)).limit(1);
  return r[0];
}

// --- Inventory helpers (run inside a transaction) ---------------------------
async function decrementStock(tx: any, items: any[]) {
  for (const it of items) {
    const qty = Number(it.quantity || 1);
    if (!it.productId || qty <= 0) continue;
    await tx.update(products).set({ stock: sql`GREATEST(${products.stock} - ${qty}, 0)` }).where(eq(products.id, it.productId));
    if (it.size) {
      const p = (await tx.select().from(products).where(eq(products.id, it.productId)).limit(1))[0];
      if (p && p.sizes && typeof p.sizes === "object" && (p.sizes as any)[it.size] != null) {
        const sizes: any = { ...(p.sizes as any) };
        sizes[it.size] = Math.max(0, Number(sizes[it.size]) - qty);
        await tx.update(products).set({ sizes }).where(eq(products.id, it.productId));
      }
    }
  }
}

async function restoreStock(tx: any, items: any[]) {
  for (const it of items) {
    const qty = Number(it.quantity || 1);
    if (!it.productId || qty <= 0) continue;
    await tx.update(products).set({ stock: sql`LEAST(${products.stock} + ${qty}, 1000000)` }).where(eq(products.id, it.productId));
    if (it.size) {
      const p = (await tx.select().from(products).where(eq(products.id, it.productId)).limit(1))[0];
      // Only restore a size that already exists on the product (no unbounded key growth).
      if (p && p.sizes && typeof p.sizes === "object" && (p.sizes as any)[it.size] != null) {
        const sizes: any = { ...(p.sizes as any) };
        sizes[it.size] = Math.min(1000000, Number(sizes[it.size] || 0) + qty);
        await tx.update(products).set({ sizes }).where(eq(products.id, it.productId));
      }
    }
  }
}

// Mark a pending order paid: complete payment, decrement stock, clear the cart.
// `transitioned` is true only for the caller that actually flips the status — so
// when the webhook and the browser callback race, stock is decremented and the
// receipt email is sent exactly once.
export async function finalizePaidOrder(orderId: number, reference?: string): Promise<{ order: any; transitioned: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx: any) => {
    const order = (await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
    if (!order) throw new Error("Order not found");
    if (order.paymentStatus === "completed") return { order, transitioned: false };
    // Atomic claim: only the first transaction to flip the status proceeds.
    const res: any = await tx.update(orders)
      .set({ paymentStatus: "completed", paymentReference: reference ?? order.paymentReference })
      .where(and(eq(orders.id, orderId), notInArray(orders.paymentStatus, ["completed"])));
    const affected = res?.[0]?.affectedRows ?? res?.affectedRows ?? 0;
    if (!affected) return { order, transitioned: false };
    await decrementStock(tx, Array.isArray(order.items) ? order.items : []);
    await tx.delete(cartItems).where(eq(cartItems.userId, order.userId));
    const updated = (await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
    return { order: updated, transitioned: true };
  });
}

export async function markOrderPaymentFailed(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ paymentStatus: "failed" })
    .where(and(eq(orders.id, orderId), notInArray(orders.paymentStatus, ["completed"])));
}

// Cancel an order (belongs to user, not delivered/cancelled). Restores stock if
// paid. Uses an atomic status claim so concurrent/double cancels can't restore twice.
export async function cancelOrder(userId: number, orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx: any) => {
    const order = (await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId))).limit(1))[0];
    if (!order) throw new Error("Order not found");
    const res: any = await tx.update(orders).set({ status: "cancelled" })
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId), notInArray(orders.status, ["delivered", "cancelled"])));
    const affected = res?.[0]?.affectedRows ?? res?.affectedRows ?? 0;
    if (affected && order.paymentStatus === "completed") {
      await restoreStock(tx, (Array.isArray(order.items) ? order.items : []));
    }
    const updated = (await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
    return { order: updated, cancelled: affected > 0 };
  });
}

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function saveChatMessage(userId: number, role: "user" | "assistant", content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(chatMessages).values({ userId, role, content });
}

export async function getChatHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(chatMessages).where(eq(chatMessages.userId, userId)).orderBy(desc(chatMessages.createdAt)).limit(limit);
}

export async function saveSearchQuery(userId: number | undefined, query: string, results: number[], clicked: number[] = []) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(searchHistory).values({ userId, query, results, clicked });
}

export async function updateUserProfile(userId: number, profileData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(users).set(profileData).where(eq(users.id, userId));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

// --- Login brute-force lockout ----------------------------------------------
export async function setUserLoginState(userId: number, state: { failedLoginAttempts: number; lockedUntil: Date | null }) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(state).where(eq(users.id, userId));
}

// --- Password reset tokens --------------------------------------------------
export async function createPasswordResetToken(userId: number, tokenHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId)); // invalidate prior tokens
  await db.insert(passwordResetTokens).values({ userId, tokenHash, expiresAt });
}

// Returns the userId if the token is valid + unused + unexpired, marking it used.
export async function consumePasswordResetToken(tokenHash: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const row = (await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash)).limit(1))[0];
  if (!row || row.usedAt || new Date(row.expiresAt).getTime() < Date.now()) return null;
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
  return row.userId;
}

// Delete a user and their related rows.
export async function deleteUserAccount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
  await db.delete(orders).where(eq(orders.userId, userId));
  await db.delete(reviews).where(eq(reviews.userId, userId));
  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  await db.delete(supportMessages).where(eq(supportMessages.userId, userId));
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

// Reviews
export async function getReviews(productId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(eq(reviews.productId, productId)).orderBy(desc(reviews.createdAt));
}

export async function createReview(input: { productId: number; userId: number; author: string; rating: number; comment?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(reviews).values({
    productId: input.productId,
    userId: input.userId,
    author: input.author,
    rating: input.rating,
    comment: input.comment ?? null,
  });
}

// ====================================================================
// Admin queries — store management (gated by adminProcedure on the API).
// ====================================================================

// Strip undefined keys so drizzle .set()/.values() never writes `undefined`.
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

// All products, newest first (no limit) — admin catalog view.
export async function adminGetAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).orderBy(desc(products.createdAt));
}

export async function adminCreateProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result: any = await db.insert(products).values(compact(data) as InsertProduct);
  const insertId = result?.[0]?.insertId ?? result?.insertId;
  return insertId ? getProductById(Number(insertId)) : undefined;
}

export async function adminUpdateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const set = compact(data);
  if (Object.keys(set).length > 0) {
    await db.update(products).set(set).where(eq(products.id, id));
  }
  return getProductById(id);
}

// Delete a product and clean up rows that reference it (cart, reviews).
export async function adminDeleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cartItems).where(eq(cartItems.productId, id));
  await db.delete(reviews).where(eq(reviews.productId, id));
  await db.delete(products).where(eq(products.id, id));
}

// All orders, newest first, joined with the customer name/email.
export async function adminGetAllOrders() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ order: orders, userName: users.name, userEmail: users.email })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt));
  return rows.map(r => ({ ...r.order, userName: r.userName, userEmail: r.userEmail }));
}

type AdminOrderPatch = {
  status?: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus?: "pending" | "completed" | "failed";
  trackingNumber?: string | null;
  carrier?: string | null;
  estimatedDelivery?: string | null;
};

export async function adminUpdateOrder(orderId: number, patch: AdminOrderPatch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx: any) => {
    const before = (await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
    const set = compact(patch);
    if (Object.keys(set).length > 0) {
      await tx.update(orders).set(set).where(eq(orders.id, orderId));
    }
    // Restore stock if the admin newly cancels an order whose stock was taken.
    if (before && patch.status === "cancelled" && before.status !== "cancelled" && before.paymentStatus === "completed") {
      await restoreStock(tx, (Array.isArray(before.items) ? before.items : []));
    }
    const updated = (await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
    // Resolve the customer's account email so the router can notify them (the
    // admin mutation has no customer ctx; shippingAddress.email may be absent).
    const customer = before?.userId
      ? (await tx.select({ email: users.email }).from(users).where(eq(users.id, before.userId)).limit(1))[0]
      : null;
    return { order: updated, prevStatus: before?.status ?? null, customerEmail: customer?.email ?? null };
  });
}

// All customers, newest first.
export async function adminGetAllCustomers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// Distinct product categories with counts (categories are free-form on products,
// so the catalog/nav/admin derive them from the data rather than a fixed list).
export async function getCategoryCounts(): Promise<{ value: string; count: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(products);
  const counts = new Map<string, number>();
  for (const p of rows as any[]) {
    if (!p.category) continue;
    counts.set(p.category, (counts.get(p.category) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

// ====================================================================
// Customer support chat — one thread per userId.
// ====================================================================
export async function addSupportMessage(userId: number, sender: "user" | "admin", content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // The author's side has already "read" their own message.
  return db.insert(supportMessages).values({
    userId, sender, content,
    readByUser: sender === "user",
    readByAdmin: sender === "admin",
  });
}

export async function getSupportThread(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supportMessages).where(eq(supportMessages.userId, userId)).orderBy(supportMessages.createdAt);
}

// Mark the *other* side's messages as read.
export async function markSupportRead(userId: number, reader: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (reader === "admin") {
    return db.update(supportMessages).set({ readByAdmin: true })
      .where(and(eq(supportMessages.userId, userId), eq(supportMessages.sender, "user")));
  }
  return db.update(supportMessages).set({ readByUser: true })
    .where(and(eq(supportMessages.userId, userId), eq(supportMessages.sender, "admin")));
}

// Count unread admin replies for a user (drives the customer's support badge).
export async function getUnreadSupportForUser(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select().from(supportMessages)
    .where(and(eq(supportMessages.userId, userId), eq(supportMessages.sender, "admin"), eq(supportMessages.readByUser, false)));
  return rows.length;
}

// Admin inbox — all messages joined to the customer, aggregated into threads.
export async function adminGetSupportThreads() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ msg: supportMessages, userName: users.name, userEmail: users.email })
    .from(supportMessages)
    .leftJoin(users, eq(supportMessages.userId, users.id))
    .orderBy(supportMessages.createdAt);

  const threads = new Map<number, any>();
  for (const r of rows) {
    const m = r.msg;
    let t = threads.get(m.userId);
    if (!t) {
      t = { userId: m.userId, userName: r.userName, userEmail: r.userEmail, messageCount: 0, unread: 0, lastMessage: null, lastAt: null };
      threads.set(m.userId, t);
    }
    t.messageCount += 1;
    if (m.sender === "user" && !m.readByAdmin) t.unread += 1;
    t.lastMessage = m.content;
    t.lastAt = m.createdAt;
    t.lastSender = m.sender;
  }
  // most recently active first
  return Array.from(threads.values()).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
}
