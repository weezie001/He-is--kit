import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with HEIS KITS-specific fields for sport profiling and preferences.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }), // for local email/password auth
  phone: varchar("phone", { length: 40 }),
  shippingAddress: json("shippingAddress"), // { address, city, country, postalCode }
  marketingOptIn: boolean("marketingOptIn").default(true),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  
  // Sport Profiler data
  favoriteSport: varchar("favoriteSport", { length: 50 }), // "football", "basketball", etc.
  favoriteTeam: varchar("favoriteTeam", { length: 100 }),
  userType: varchar("userType", { length: 50 }), // "fan" or "player"
  stylePreference: varchar("stylePreference", { length: 100 }), // "classic", "modern", "bold", etc.
  profileCompleted: boolean("profileCompleted").default(false),
  
  // Size Advisor data
  height: int("height"), // in cm
  weight: int("weight"), // in kg
  measurements: json("measurements"), // { chest: number, waist: number, etc. }
  recommendedSize: varchar("recommendedSize", { length: 10 }), // "XS", "S", "M", "L", "XL", "XXL"

  // Login security
  failedLoginAttempts: int("failedLoginAttempts").default(0).notNull(),
  lockedUntil: timestamp("lockedUntil"), // brute-force lockout window

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Products table for HEIS KITS catalog
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(),
  team: varchar("team", { length: 100 }), // e.g., "Manchester United", "Liverpool", "Generic"
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("originalPrice", { precision: 10, scale: 2 }),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  imageUrls: json("imageUrls"), // Array of image URLs
  color: varchar("color", { length: 100 }),
  material: varchar("material", { length: 100 }),
  sizes: json("sizes"), // { "XS": 10, "S": 20, "M": 15, ... } - stock levels
  style: varchar("style", { length: 100 }), // "classic", "modern", "bold", etc.
  tags: json("tags"), // Array of tags for search/filtering
  stock: int("stock").default(0),
  featured: boolean("featured").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Shopping cart items
 */
export const cartItems = mysqlTable("cartItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  size: varchar("size", { length: 10 }).notNull(),
  quantity: int("quantity").notNull().default(1),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

/**
 * Orders table
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "processing", "shipped", "delivered", "cancelled"]).default("pending").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  items: json("items"), // Array of { productId, size, quantity, price }
  shippingAddress: json("shippingAddress"), // { name, email, address, city, country, postalCode }
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed"]).default("pending").notNull(),
  paymentReference: varchar("paymentReference", { length: 120 }).unique(), // gateway transaction ref
  trackingNumber: varchar("trackingNumber", { length: 80 }),
  carrier: varchar("carrier", { length: 80 }),
  estimatedDelivery: varchar("estimatedDelivery", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Chat messages for expert chatbot
 */
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Search history for conversational search optimization
 */
export const searchHistory = mysqlTable("searchHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  query: text("query").notNull(),
  results: json("results"), // Array of product IDs returned
  clicked: json("clicked"), // Array of product IDs user clicked
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = typeof searchHistory.$inferInsert;

/**
 * Product reviews
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  userId: int("userId").notNull(),
  author: varchar("author", { length: 120 }),
  rating: int("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Customer support chat — one thread per user (keyed by userId).
 * `sender` says who wrote it; read flags track unread badges per side.
 */
export const supportMessages = mysqlTable("supportMessages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sender: mysqlEnum("sender", ["user", "admin"]).notNull(),
  content: text("content").notNull(),
  readByAdmin: boolean("readByAdmin").default(false).notNull(),
  readByUser: boolean("readByUser").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = typeof supportMessages.$inferInsert;

/**
 * Password reset tokens (local email/password accounts).
 * We store only a SHA-256 hash of the token; the raw token goes in the email link.
 */
export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

/**
 * Recently finished matches — kept ~12h so the Livescore "History" section
 * persists completed games even after the live API stops returning them.
 */
export const matchHistory = mysqlTable("matchHistory", {
  id: varchar("id", { length: 64 }).primaryKey(), // provider match id
  data: json("data").notNull(),                   // the Match object
  finishedAt: timestamp("finishedAt").defaultNow().notNull(),
});

export type MatchHistory = typeof matchHistory.$inferSelect;
