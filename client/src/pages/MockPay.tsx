import { Link, useSearch, useLocation } from "wouter";
import { Lock, Check, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import Layout from "@/components/Layout";
import { TechLabel } from "@/components/tech";

/**
 * Simulated payment gateway — only reached when no real provider keys are set.
 * Lets you complete or fail a payment so the full flow is testable end-to-end.
 */
export default function MockPay() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const reference = new URLSearchParams(search).get("reference") || "";

  if (!loading && !isAuthenticated) {
    return (
      <Layout footer={false}>
        <div className="container py-24 text-center max-w-md">
          <h1 className="display text-3xl mb-4">Sign in to continue</h1>
          <Link href="/login" className="btn btn-primary">Sign in</Link>
        </div>
      </Layout>
    );
  }

  const finish = (outcome: "success" | "failed") =>
    navigate(`/checkout/verify?reference=${encodeURIComponent(reference)}&outcome=${outcome}`);

  return (
    <Layout footer={false}>
      <div className="container py-24 max-w-md">
        <div className="border-2 border-ink p-8 text-center">
          <div className="w-12 h-12 bg-ink text-paper grid place-items-center rounded-full mx-auto mb-4"><Lock className="w-6 h-6" /></div>
          <TechLabel className="text-signal">Demo gateway</TechLabel>
          <h1 className="display text-3xl mt-2 mb-2">Simulate payment</h1>
          <p className="text-sm text-muted-foreground font-medium mb-1">No real provider is configured.</p>
          <p className="tech-label mb-7">Ref: {reference || "—"}</p>

          <div className="space-y-3">
            <button onClick={() => finish("success")} className="btn btn-signal w-full"><Check className="w-4 h-4" /> Pay successfully</button>
            <button onClick={() => finish("failed")} className="btn btn-outline w-full"><X className="w-4 h-4" /> Cancel / fail payment</button>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">In production, add <span className="mono">FLUTTERWAVE_SECRET_KEY</span> to replace this with the real checkout.</p>
      </div>
    </Layout>
  );
}
