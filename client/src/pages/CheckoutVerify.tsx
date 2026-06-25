import { useEffect, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { Check, X, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import Layout from "@/components/Layout";
import { TechLabel } from "@/components/tech";

export default function CheckoutVerify() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  // `reference` for Paystack/mock; Flutterwave redirects back with `tx_ref`.
  const reference = params.get("reference") || params.get("tx_ref") || "";
  const outcome = (params.get("outcome") as "success" | "failed" | null) || undefined;

  const utils = trpc.useUtils();
  const [state, setState] = useState<"verifying" | "success" | "failed" | "pending" | "error" | "invalid">("verifying");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const ran = useRef(false);

  const verify = trpc.payments.verify.useMutation();

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!reference) { setState("invalid"); return; }
    verify.mutate(
      { reference, outcome },
      {
        onSuccess: async res => {
          setOrderNumber(res.orderNumber || "");
          setState(res.status);
          if (res.status === "success") {
            await Promise.all([utils.cart.list.invalidate(), utils.orders.list.invalidate()]);
          }
        },
        onError: () => setState("error"),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <div className="container py-24 text-center max-w-lg">
        {state === "verifying" && (
          <>
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-signal mb-5" />
            <h1 className="display text-4xl mb-2">Confirming payment…</h1>
            <p className="text-muted-foreground font-medium">Hang tight, this only takes a moment.</p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="w-16 h-16 bg-signal text-white grid place-items-center rounded-full mx-auto mb-6"><Check className="w-8 h-8" /></div>
            {orderNumber && <TechLabel className="text-signal">{orderNumber}</TechLabel>}
            <h1 className="display text-5xl mt-3 mb-4">Order confirmed</h1>
            <p className="text-muted-foreground font-medium mb-8">Thanks for your purchase. We've emailed your receipt and you can track the order from your account.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/profile" className="btn btn-primary">Track order <ArrowRight className="w-4 h-4" /></Link>
              <Link href="/catalog" className="btn btn-outline">Keep shopping</Link>
            </div>
          </>
        )}

        {state === "invalid" && (
          <>
            <div className="w-16 h-16 bg-secondary text-ink grid place-items-center rounded-full mx-auto mb-6"><X className="w-8 h-8" /></div>
            <h1 className="display text-4xl mb-3">Invalid checkout link</h1>
            <p className="text-muted-foreground font-medium mb-8">This checkout session is missing or malformed. Please start again from your cart.</p>
            <Link href="/cart" className="btn btn-primary">Back to cart</Link>
          </>
        )}

        {(state === "failed" || state === "error" || state === "pending") && (
          <>
            <div className="w-16 h-16 bg-destructive text-white grid place-items-center rounded-full mx-auto mb-6"><X className="w-8 h-8" /></div>
            <h1 className="display text-4xl mb-3">{state === "pending" ? "Payment pending" : "Payment not completed"}</h1>
            <p className="text-muted-foreground font-medium mb-8">
              {state === "pending"
                ? "We haven't received confirmation yet. If you were charged, your order will update automatically."
                : "Your payment didn't go through and you have not been charged. Your cart is still saved."}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/checkout" className="btn btn-primary"><RefreshCw className="w-4 h-4" /> Try again</Link>
              <Link href="/cart" className="btn btn-outline">Back to cart</Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
