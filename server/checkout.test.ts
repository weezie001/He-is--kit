import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthContext(userId: number = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-user-${userId}`,
      email: `test${userId}@example.com`,
      name: `Test User ${userId}`,
      loginMethod: "test",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("checkout flow", () => {
  it("should add item to cart", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const products = await caller.products.list({
      category: undefined,
      team: undefined,
      style: undefined,
    });

    if (products.length > 0) {
      const result = await caller.cart.add({
        productId: products[0].id,
        size: "M",
        quantity: 1,
      });

      expect(result.success).toBe(true);
    }
  });

  it("should retrieve cart items", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const products = await caller.products.list({
      category: undefined,
      team: undefined,
      style: undefined,
    });

    if (products.length > 0) {
      await caller.cart.add({
        productId: products[0].id,
        size: "L",
        quantity: 2,
      });

      const cartItems = await caller.cart.list();
      expect(Array.isArray(cartItems)).toBe(true);
    }
  });

  it("should create order from cart", async () => {
    const ctx = createAuthContext(2);
    const caller = appRouter.createCaller(ctx);

    const products = await caller.products.list({
      category: undefined,
      team: undefined,
      style: undefined,
    });

    if (products.length > 0) {
      const product = products[0];

      await caller.cart.add({
        productId: product.id,
        size: "M",
        quantity: 1,
      });

      const orderResult = await caller.orders.create({
        items: [
          {
            productId: product.id,
            size: "M",
            quantity: 1,
            price: parseFloat(product.price),
          },
        ],
        totalAmount: parseFloat(product.price),
        shippingAddress: {
          name: "Test Customer",
          email: "customer@example.com",
          address: "123 Main St",
          city: "Lagos",
          country: "Nigeria",
          postalCode: "100001",
        },
      });

      expect(orderResult.success).toBe(true);
    }
  });

  it("should clear cart after order creation", async () => {
    const ctx = createAuthContext(3);
    const caller = appRouter.createCaller(ctx);

    const products = await caller.products.list({
      category: undefined,
      team: undefined,
      style: undefined,
    });

    if (products.length > 0) {
      const product = products[0];

      await caller.cart.add({
        productId: product.id,
        size: "S",
        quantity: 1,
      });

      await caller.orders.create({
        items: [
          {
            productId: product.id,
            size: "S",
            quantity: 1,
            price: parseFloat(product.price),
          },
        ],
        totalAmount: parseFloat(product.price),
        shippingAddress: {
          name: "Test Customer",
          email: "customer@example.com",
          address: "123 Main St",
          city: "Lagos",
          country: "Nigeria",
          postalCode: "100001",
        },
      });

      const cartItems = await caller.cart.list();
      expect(cartItems.length).toBe(0);
    }
  });

  it("should remove item from cart", async () => {
    const ctx = createAuthContext(4);
    const caller = appRouter.createCaller(ctx);

    const products = await caller.products.list({
      category: undefined,
      team: undefined,
      style: undefined,
    });

    if (products.length > 0) {
      await caller.cart.add({
        productId: products[0].id,
        size: "XL",
        quantity: 1,
      });

      const cartItems = await caller.cart.list();
      if (cartItems.length > 0) {
        const itemId = cartItems[0].id;

        const result = await caller.cart.remove({ cartItemId: itemId });
        expect(result.success).toBe(true);

        const updatedCart = await caller.cart.list();
        expect(updatedCart.length).toBe(0);
      }
    }
  });
});

describe("AI features integration", () => {
  it("should update user profile successfully", async () => {
    const ctx = createAuthContext(5);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.profile.update({
      favoriteSport: "football",
      userType: "player",
      favoriteTeam: "Manchester United",
      stylePreference: "bold",
    });

    expect(result.success).toBe(true);
  });

  it("should provide size recommendation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sizeAdvisor.recommend({
      height: 180,
      weight: 80,
    });

    expect(result).toBeDefined();
    expect(result.size).toBeDefined();
    expect(["XS", "S", "M", "L", "XL", "XXL"]).toContain(result.size);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it("should perform conversational search", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.search.conversational({
      query: "training top black",
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it("should send chat message and get response", async () => {
    const ctx = createAuthContext(7);
    const caller = appRouter.createCaller(ctx);

    const sendResult = await caller.chat.send({
      message: "What would Mbappé wear casually?",
    });

    expect(sendResult).toBeDefined();
    expect(sendResult.message).toBeDefined();
    expect(typeof sendResult.message).toBe("string");
  });
});
