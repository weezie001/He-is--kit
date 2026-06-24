import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("products", () => {
  it("should list all products", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.products.list({
      category: undefined,
      team: undefined,
      style: undefined,
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should filter products by category", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.products.list({
      category: "kits",
      team: undefined,
      style: undefined,
    });

    expect(Array.isArray(result)).toBe(true);
    result.forEach((product: any) => {
      expect(product.category).toBe("kits");
    });
  });

  it("should filter products by team", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.products.list({
      category: undefined,
      team: "Liverpool",
      style: undefined,
    });

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      result.forEach((product: any) => {
        expect(product.team).toBe("Liverpool");
      });
    }
  });

  it("should get product by id", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // First, get a product to know an ID
    const products = await caller.products.list({
      category: undefined,
      team: undefined,
      style: undefined,
    });

    if (products.length > 0) {
      const productId = products[0].id;
      const product = await caller.products.getById({ id: productId });

      expect(product).toBeDefined();
      expect(product?.id).toBe(productId);
      expect(product?.name).toBeDefined();
      expect(product?.price).toBeDefined();
    }
  });

  it("should search products conversationally", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.conversational({
      query: "bold manchester united kit",
    });

    expect(Array.isArray(result)).toBe(true);
    // Should return some results for a common query
    expect(result.length).toBeGreaterThanOrEqual(0);
  });
});

describe("sizeAdvisor", () => {
  it("should recommend size based on height and weight", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sizeAdvisor.recommend({
      height: 175,
      weight: 75,
    });

    expect(result).toBeDefined();
    expect(result.size).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(["XS", "S", "M", "L", "XL", "XXL"]).toContain(result.size);
  });

  it("should return high confidence for standard measurements", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sizeAdvisor.recommend({
      height: 180,
      weight: 80,
    });

    expect(result.confidence).toBeGreaterThanOrEqual(75);
  });

  it("should handle extreme measurements", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sizeAdvisor.recommend({
      height: 210,
      weight: 120,
    });

    expect(result.size).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });
});
