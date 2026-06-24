import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import Layout from "@/components/Layout";
import { TechLabel } from "@/components/tech";

// ⚠️ EDIT THESE with your real business details. They're interpolated into the
// policy text below. Have the final wording reviewed by a lawyer before launch.
const BUSINESS = {
  name: "HEIS KITS",
  legalEntity: "HEIS KITS Ltd", // [EDIT] registered company name
  email: "support@heiskits.com", // [EDIT] support/contact email
  address: "Lagos, Nigeria", // [EDIT] registered business address
  jurisdiction: "the Federal Republic of Nigeria", // [EDIT] governing law
  returnWindowDays: 14, // [EDIT] days to return an item
  updated: "June 2026", // [EDIT] last-updated date
};

type Kind = "terms" | "privacy" | "returns" | "shipping";

const TITLES: Record<Kind, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  returns: "Returns & Refunds",
  shipping: "Shipping Policy",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="font-bold text-lg mb-2">{title}</h2>
      <div className="text-[15px] leading-relaxed text-muted-foreground font-medium space-y-2">{children}</div>
    </div>
  );
}

function Body({ kind }: { kind: Kind }) {
  if (kind === "terms") return (
    <>
      <Section title="1. Agreement">By accessing {BUSINESS.name} you agree to these Terms. If you do not agree, please do not use the site.</Section>
      <Section title="2. Accounts">You're responsible for your account credentials and all activity under your account. Keep your password secure and notify us of any unauthorised use.</Section>
      <Section title="3. Orders & pricing">All orders are subject to acceptance and availability. Prices are shown in Nigerian Naira (₦) and may change. We may cancel an order if an item is mispriced or out of stock; you'll be refunded in full.</Section>
      <Section title="4. Payments">Payments are processed by our third-party payment provider. We do not store your full card details.</Section>
      <Section title="5. Intellectual property">All content, branding and imagery on {BUSINESS.name} is owned by {BUSINESS.legalEntity} and may not be reused without permission.</Section>
      <Section title="6. Limitation of liability">To the extent permitted by law, {BUSINESS.legalEntity} is not liable for indirect or consequential losses arising from use of the site.</Section>
      <Section title="7. Governing law">These Terms are governed by the laws of {BUSINESS.jurisdiction}.</Section>
      <Section title="8. Contact">Questions? Email <a className="text-signal underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.</Section>
    </>
  );
  if (kind === "privacy") return (
    <>
      <Section title="1. What we collect">Account details (name, email), order and shipping information, support messages, and basic usage data needed to run the store.</Section>
      <Section title="2. How we use it">To process orders and payments, provide support, send transactional emails (order updates, password resets), and — only with your consent — marketing.</Section>
      <Section title="3. Sharing">We share data only with the providers needed to operate (payments, email, hosting, delivery). We do not sell your personal data.</Section>
      <Section title="4. Cookies">We use essential cookies for sign-in and cart, and optional analytics cookies you can accept or decline via the cookie banner.</Section>
      <Section title="5. Your rights">You can access, correct, export or delete your data. Account deletion is available in Settings, or email us.</Section>
      <Section title="6. Security">Passwords are hashed, sessions are signed, and payment is handled by a PCI-compliant provider.</Section>
      <Section title="7. Contact">Data requests: <a className="text-signal underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.</Section>
    </>
  );
  if (kind === "returns") return (
    <>
      <Section title={`1. ${BUSINESS.returnWindowDays}-day returns`}>You may return unworn items with tags within {BUSINESS.returnWindowDays} days of delivery for a refund or exchange.</Section>
      <Section title="2. How to return">Start a return from your order page or email <a className="text-signal underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> with your order number. We'll share return instructions.</Section>
      <Section title="3. Refunds">Approved refunds are issued to your original payment method, typically within 5–10 business days of us receiving the item.</Section>
      <Section title="4. Non-returnable">For hygiene reasons, some items (e.g. certain accessories) may be non-returnable unless faulty. Faulty items are always eligible.</Section>
      <Section title="5. Cancellations">You can cancel an order from your account any time before it's marked delivered.</Section>
    </>
  );
  return (
    <>
      <Section title="1. Processing time">Orders are typically processed within 1–2 business days.</Section>
      <Section title="2. Delivery">Delivery times and fees are shown at checkout and depend on your location and the carrier.</Section>
      <Section title="3. Tracking">Once shipped, you'll receive tracking details and can follow your order from your account.</Section>
      <Section title="4. Issues">If your order is delayed, lost or arrives damaged, contact <a className="text-signal underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> and we'll make it right.</Section>
    </>
  );
}

export default function LegalPage({ kind }: { kind: Kind }) {
  return (
    <Layout>
      <section className="border-b border-ink">
        <div className="container py-12">
          <TechLabel className="text-signal">Legal</TechLabel>
          <h1 className="display text-[clamp(2.4rem,6vw,4.5rem)] mt-2">{TITLES[kind]}</h1>
          <p className="tech-label mt-3">Last updated: {BUSINESS.updated}</p>
        </div>
      </section>
      <div className="container py-12 max-w-2xl">
        <div className="flex items-start gap-2 border border-ink/15 bg-secondary/40 p-3 mb-8 text-xs font-medium text-muted-foreground">
          <AlertTriangle className="w-4 h-4 text-signal shrink-0 mt-0.5" />
          <span>Template content — replace with your finalised wording and have it reviewed by legal counsel before relying on it.</span>
        </div>
        <Body kind={kind} />
        <div className="mt-10 pt-6 border-t border-ink/15 flex flex-wrap gap-x-5 gap-y-2">
          {(["terms", "privacy", "returns", "shipping"] as Kind[]).filter(k => k !== kind).map(k => (
            <Link key={k} href={`/${k}`} className="tech-label hover:text-signal">{TITLES[k]}</Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
