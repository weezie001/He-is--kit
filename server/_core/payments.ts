// Payment gateway abstraction. Uses Paystack when PAYSTACK_SECRET_KEY is set;
// otherwise runs in MOCK mode so the full checkout → pay → verify → confirm
// flow works end-to-end locally. Switching to live is just adding the keys.
import { ENV } from "./env";

export type Provider = "paystack" | "mock";
export type PaymentInit = { authorizationUrl: string; reference: string; provider: Provider };
export type PaymentVerify = { status: "success" | "failed" | "pending"; amount?: number; provider: Provider; raw?: any };

export function paymentsProvider(): Provider {
  return ENV.paystackSecretKey ? "paystack" : "mock";
}

export async function initializePayment(opts: {
  amountKobo: number;
  email: string;
  reference: string;
  callbackUrl: string;
  origin: string;
  metadata?: any;
}): Promise<PaymentInit> {
  if (!ENV.paystackSecretKey) {
    // Mock: send the shopper to an in-app page that simulates the gateway.
    return {
      provider: "mock",
      reference: opts.reference,
      authorizationUrl: `${opts.origin}/checkout/mock-pay?reference=${encodeURIComponent(opts.reference)}`,
    };
  }
  const resp = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.paystackSecretKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      amount: opts.amountKobo,
      email: opts.email,
      reference: opts.reference,
      callback_url: opts.callbackUrl,
      metadata: opts.metadata,
    }),
  });
  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.status || !data?.data?.authorization_url) {
    throw new Error(data?.message || "Could not start payment");
  }
  return { provider: "paystack", reference: data.data.reference, authorizationUrl: data.data.authorization_url };
}

export async function verifyPayment(reference: string): Promise<PaymentVerify> {
  if (!ENV.paystackSecretKey) {
    // In mock mode the outcome is supplied by the mock-pay page.
    return { provider: "mock", status: "pending" };
  }
  const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${ENV.paystackSecretKey}` },
  });
  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.status) return { provider: "paystack", status: "failed", raw: data };
  const s = data.data?.status;
  return {
    provider: "paystack",
    status: s === "success" ? "success" : s === "failed" || s === "abandoned" ? "failed" : "pending",
    amount: data.data?.amount,
    raw: data.data,
  };
}
