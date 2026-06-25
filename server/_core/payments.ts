// Payment gateway abstraction. The provider is chosen by which keys are present:
//   Flutterwave (preferred) → Paystack → MOCK (built-in simulated gateway), so
// the full checkout → pay → verify → confirm flow works end-to-end even with no
// keys set. Switching to live is just adding the keys.
//
// Amounts in this module are always MAJOR units (e.g. Naira), normalised so
// callers never juggle kobo — each provider converts as needed internally.
import { ENV } from "./env";

export type Provider = "flutterwave" | "paystack" | "mock";
export type PaymentInit = { authorizationUrl: string; reference: string; provider: Provider };
export type PaymentVerify = {
  status: "success" | "failed" | "pending";
  amount?: number; // major units (Naira)
  currency?: string;
  provider: Provider;
  raw?: any;
};

export function paymentsProvider(): Provider {
  if (ENV.flutterwaveSecretKey) return "flutterwave";
  if (ENV.paystackSecretKey) return "paystack";
  return "mock";
}

export async function initializePayment(opts: {
  amount: number; // major units (Naira), NOT kobo
  currency?: string; // default NGN
  email: string;
  name?: string;
  reference: string; // our tx_ref
  origin: string;
  metadata?: any;
}): Promise<PaymentInit> {
  const provider = paymentsProvider();
  const currency = opts.currency || "NGN";

  if (provider === "mock") {
    // Mock: send the shopper to an in-app page that simulates the gateway.
    return {
      provider: "mock",
      reference: opts.reference,
      authorizationUrl: `${opts.origin}/checkout/mock-pay?reference=${encodeURIComponent(opts.reference)}`,
    };
  }

  if (provider === "flutterwave") {
    // IMPORTANT: a clean redirect_url with NO query string. Flutterwave appends
    // `?status=…&tx_ref=…&transaction_id=…`; a pre-existing "?" would corrupt it.
    const redirectUrl = `${opts.origin}/checkout/verify`;
    const resp = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${ENV.flutterwaveSecretKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        tx_ref: opts.reference,
        amount: opts.amount, // major units (Naira)
        currency,
        redirect_url: redirectUrl,
        customer: { email: opts.email, name: opts.name },
        meta: opts.metadata,
        customizations: { title: "HEIS KITS", description: "Order payment" },
      }),
    });
    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.status !== "success" || !data?.data?.link) {
      throw new Error(data?.message || "Could not start payment");
    }
    return { provider: "flutterwave", reference: opts.reference, authorizationUrl: data.data.link };
  }

  // Paystack — amounts are in kobo (minor units).
  const callbackUrl = `${opts.origin}/checkout/verify?reference=${encodeURIComponent(opts.reference)}`;
  const resp = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.paystackSecretKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(opts.amount * 100), // kobo
      email: opts.email,
      reference: opts.reference,
      callback_url: callbackUrl,
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
  const provider = paymentsProvider();

  if (provider === "mock") {
    // In mock mode the outcome is supplied by the mock-pay page.
    return { provider: "mock", status: "pending" };
  }

  if (provider === "flutterwave") {
    // Verify by our own reference (tx_ref) so we never need to thread the
    // gateway's transaction_id through the redirect.
    const resp = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${ENV.flutterwaveSecretKey}` } },
    );
    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.status !== "success") return { provider: "flutterwave", status: "failed", raw: data };
    const s = data.data?.status;
    return {
      provider: "flutterwave",
      status: s === "successful" ? "success" : s === "failed" || s === "cancelled" ? "failed" : "pending",
      amount: typeof data.data?.amount === "number" ? data.data.amount : undefined, // already major units
      currency: data.data?.currency,
      raw: data.data,
    };
  }

  // Paystack
  const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${ENV.paystackSecretKey}` },
  });
  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.status) return { provider: "paystack", status: "failed", raw: data };
  const s = data.data?.status;
  return {
    provider: "paystack",
    status: s === "success" ? "success" : s === "failed" || s === "abandoned" ? "failed" : "pending",
    amount: typeof data.data?.amount === "number" ? data.data.amount / 100 : undefined, // kobo → Naira
    currency: data.data?.currency,
    raw: data.data,
  };
}
