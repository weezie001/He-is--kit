import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ArrowLeft, Lock, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import Layout from "@/components/Layout";
import { TechLabel } from "@/components/tech";

const shippingSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  address: z.string().min(5),
  city: z.string().min(2),
  country: z.string().min(2),
  postalCode: z.string().min(2),
});

const FIELDS: { name: keyof typeof EMPTY; label: string; type?: string; half?: boolean }[] = [
  { name: "name", label: "Full name" },
  { name: "email", label: "Email", type: "email" },
  { name: "address", label: "Address" },
  { name: "city", label: "City", half: true },
  { name: "postalCode", label: "Postal code", half: true },
  { name: "country", label: "Country" },
];
const EMPTY = { name: "", email: "", address: "", city: "", country: "", postalCode: "" };

export default function Checkout() {
  const { isAuthenticated, user } = useAuth();
  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [formData, setFormData] = useState({ ...EMPTY });

  const { data: cartItems } = trpc.cart.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: payConfig } = trpc.payments.config.useQuery();

  // Prefill name/email from the signed-in user (once).
  useEffect(() => {
    if (user) setFormData(p => ({ ...p, name: p.name || user.name || "", email: p.email || user.email || "" }));
  }, [user]);

  const initialize = trpc.payments.initialize.useMutation({
    onSuccess: ({ authorizationUrl }) => { window.location.href = authorizationUrl; },
    onError: e => toast.error(e.message || "Could not start payment"),
  });

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <h2 className="display text-4xl mb-4">Sign in to checkout</h2>
          <Link href="/login" className="btn btn-primary">Sign in</Link>
        </div>
      </Layout>
    );
  }

  const items = cartItems || [];
  const subtotal = items.reduce((sum: number, item: any) => sum + Number(item.product?.price || 0) * item.quantity, 0);
  const tax = Math.round(subtotal * 0.075); // match server rounding so the displayed total == amount charged
  const total = subtotal + tax;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { toast.error("Your cart is empty"); return; }
    try { shippingSchema.parse(formData); setStep("payment"); }
    catch { toast.error("Please fill in all fields correctly"); }
  };

  const startPayment = () => {
    if (items.length === 0) return toast.error("Your cart is empty");
    initialize.mutate({ shippingAddress: formData });
  };

  const isMock = payConfig?.provider === "mock";
  const providerLabel =
    payConfig?.provider === "flutterwave" ? "Flutterwave"
    : payConfig?.provider === "paystack" ? "Paystack"
    : "Demo gateway";

  return (
    <Layout>
      <section className="border-b border-ink">
        <div className="container py-12">
          <Link href="/cart" className="inline-flex items-center gap-1 tech-label hover:text-signal mb-3"><ArrowLeft className="w-4 h-4" /> Back to cart</Link>
          <h1 className="display text-[clamp(2.6rem,7vw,6rem)]">Checkout</h1>
        </div>
      </section>

      <div className="container py-12 grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {/* steps */}
          <div className="flex gap-8 mb-10">
            {[["shipping", "1", "Shipping"], ["payment", "2", "Payment"]].map(([key, num, label]) => {
              const active = step === key;
              return (
                <div key={key} className={`flex items-center gap-2 ${active ? "text-ink" : "text-muted-foreground"}`}>
                  <span className={`w-8 h-8 grid place-items-center rounded-full font-bold text-sm ${active ? "bg-signal text-white" : "bg-secondary"}`}>{num}</span>
                  <span className="font-bold uppercase tracking-wide text-sm">{label}</span>
                </div>
              );
            })}
          </div>

          {step === "shipping" && (
            <form onSubmit={handleShippingSubmit} className="grid sm:grid-cols-2 gap-4">
              {FIELDS.map(f => (
                <div key={f.name} className={f.half ? "" : "sm:col-span-2"}>
                  <label className="tech-label block mb-1.5">{f.label}</label>
                  <input type={f.type || "text"} name={f.name} value={formData[f.name]} onChange={handleInputChange} className="field" required />
                </div>
              ))}
              <button type="submit" className="btn btn-primary sm:col-span-2 mt-2">Continue to payment <ArrowRight className="w-4 h-4" /></button>
            </form>
          )}

          {step === "payment" && (
            <div className="space-y-5">
              <div className="border border-ink/15 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-5 h-5 text-signal" />
                  <span className="font-bold">{isMock ? "Demo payment gateway" : `Secure payment — ${providerLabel}`}</span>
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {isMock
                    ? "No real payment provider is configured, so you'll be taken to a simulated gateway to complete the order. Add payment keys to go live."
                    : `You'll be redirected to ${providerLabel} to pay securely by card, bank, USSD or transfer, then returned here.`}
                </p>
                {!isMock && payConfig?.provider === "flutterwave" && (
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed border-t border-ink/10 pt-3">
                    Payments are processed securely by <b>Flutterwave</b>, a PCI-DSS Level 1–certified payment provider trusted across Africa. Your card and bank details are encrypted and entered on Flutterwave's secure page — <b>HEIS KITS never sees or stores them</b>.
                  </p>
                )}
                <div className="mt-3 text-sm">
                  <span className="tech-label">Shipping to</span>
                  <p className="font-medium mt-1">{formData.name} · {[formData.address, formData.city, formData.country, formData.postalCode].filter(Boolean).join(", ")}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep("shipping")} className="btn btn-outline flex-1" disabled={initialize.isPending}>Back</button>
                <button type="button" onClick={startPayment} disabled={initialize.isPending} className="btn btn-signal flex-1">
                  {initialize.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Pay ₦{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* summary */}
        <div className="border-2 border-ink p-6 h-fit lg:sticky lg:top-28">
          <h2 className="display text-2xl mb-5">Summary</h2>
          <div className="space-y-2 mb-5 pb-5 border-b border-ink/15 max-h-56 overflow-y-auto">
            {items.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm gap-2">
                <span className="text-muted-foreground truncate">{item.product?.name} × {item.quantity}</span>
                <span className="font-bold mono whitespace-nowrap">₦{(Number(item.product?.price || 0) * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2 text-sm font-medium">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="mono">₦{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax (7.5%)</span><span className="mono">₦{tax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
          </div>
          <div className="flex justify-between items-baseline mt-5 pt-5 border-t border-ink/15">
            <span className="font-bold uppercase tracking-wide text-sm">Total</span>
            <span className="display text-3xl">₦{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
