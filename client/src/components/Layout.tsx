import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, User, ArrowUpRight, Menu, X, ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

// Catalog is rendered first; these follow it.
const NAV = [
  { label: "Size Advisor", href: "/size-advisor" },
  { label: "Livescore", href: "/livescore" },
  { label: "Expert", href: "/chat" },
  { label: "Support", href: "/support" },
];

const TICKER = [
  "NEW DROP — WC2026 WORLDCUP COLLECTION",
  "AI VIRTUAL TRY-ON ENABLED",
  "FREE SHIPPING OVER ₦100,000",
  "FOR THE LOVE OF THE GAME",
];

function Ticker() {
  const row = (
    <span className="text-[12px] font-bold tracking-[0.16em] uppercase">
      {TICKER.flatMap((t, i) => [
        <span key={`t${i}`} className="px-5">{t}</span>,
        <span key={`d${i}`} className="text-signal" aria-hidden>✸</span>,
      ])}
    </span>
  );
  return (
    <div className="surface-dark marquee py-2">
      <div className="marquee__track">{row}{row}</div>
    </div>
  );
}

export function TechNav() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: cartItems } = trpc.cart.list.useQuery(undefined, { enabled: isAuthenticated, refetchOnWindowFocus: false });
  const cartCount = (cartItems || []).reduce((n: number, it: any) => n + (it.quantity || 1), 0);

  return (
    <header className="sticky top-0 z-50 bg-paper border-b border-ink">
      <Ticker />
      <nav className="container">
        <div className="flex items-center h-16 gap-4">
          {/* hamburger (mobile) */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden grid place-items-center w-10 h-10 -ml-2 hover:text-signal transition-colors"
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* wordmark */}
          <Link href="/" className="flex items-center gap-2 shrink-0 mr-auto md:mr-0" onClick={() => setMenuOpen(false)}>
            <span className="grid place-items-center w-9 h-9 bg-signal text-white display text-xl">H</span>
            <span className="display text-2xl tracking-tight">HEIS KITS</span>
          </Link>

          {/* nav links (desktop, centered) */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-8">
            <Link
              href="/catalog"
              className={`text-[13px] font-bold uppercase tracking-wide transition-colors relative py-1 ${location.startsWith("/catalog") ? "text-signal" : "text-ink hover:text-signal"}`}
            >
              Catalog
              {location.startsWith("/catalog") && <span className="absolute -bottom-0.5 left-0 w-full h-0.5 bg-signal" />}
            </Link>
            {NAV.map(item => {
              const active = location.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-[13px] font-bold uppercase tracking-wide transition-colors relative py-1 ${active ? "text-signal" : "text-ink hover:text-signal"}`}
                >
                  {item.label}
                  {active && <span className="absolute -bottom-0.5 left-0 w-full h-0.5 bg-signal" />}
                </Link>
              );
            })}
          </div>

          {/* utilities */}
          <div className="flex items-center gap-1 shrink-0">
            {isAdmin && (
              <Link href="/admin" className="hidden md:inline-flex items-center gap-1.5 px-3 h-10 text-[13px] font-bold uppercase tracking-wide text-signal hover:text-ink transition-colors" aria-label="Admin">
                <ShieldCheck className="w-4 h-4" /> Admin
              </Link>
            )}
            <Link href="/catalog?focus=search" className="grid place-items-center w-10 h-10 hover:text-signal transition-colors" aria-label="Search">
              <Search className="w-5 h-5" />
            </Link>
            <Link href="/cart" className="relative grid place-items-center w-10 h-10 hover:text-signal transition-colors" aria-label="Cart">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center bg-signal text-white text-[10px] font-bold rounded-full leading-none">{cartCount}</span>
              )}
            </Link>
            <Link href={isAuthenticated ? "/profile" : "/login"} className="ml-1 inline-flex items-center gap-2 surface-dark px-4 h-10 rounded-full text-[13px] font-bold uppercase tracking-wide hover:bg-signal transition-colors" aria-label="Account">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{isAuthenticated ? "Account" : "Sign in"}</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* mobile menu panel */}
      {menuOpen && (
        <div className="md:hidden border-t border-ink bg-paper">
          <div className="container py-2">
            <Link href="/catalog" onClick={() => setMenuOpen(false)} className={`flex items-center justify-between py-3 text-sm font-bold uppercase tracking-wide border-b border-ink/10 ${location.startsWith("/catalog") ? "text-signal" : "text-ink"}`}>
              Catalog <ArrowUpRight className="w-4 h-4" />
            </Link>
            {NAV.map(item => {
              const active = location.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between py-3 border-b border-ink/10 text-sm font-bold uppercase tracking-wide ${active ? "text-signal" : "text-ink"}`}
                >
                  {item.label}
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              );
            })}
            {isAdmin && (
              <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center justify-between py-3 text-sm font-bold uppercase tracking-wide text-signal">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Admin</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function TechFooter() {
  return (
    <footer className="surface-dark mt-20">
      <div className="container py-16">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2 mb-5">
              <span className="grid place-items-center w-10 h-10 bg-signal text-white display text-xl">H</span>
              <span className="display text-3xl">HEIS KITS</span>
            </div>
            <p className="text-sm text-white/60 max-w-sm font-medium leading-relaxed">
              Technical football apparel engineered for fans and players.
              Quality that withstands time and temperature.
            </p>
            <Link href="/catalog" className="btn btn-signal mt-6">Shop now <ArrowUpRight className="w-4 h-4" /></Link>
          </div>
          <FooterCol title="Shop" links={[["Catalog", "/catalog"], ["Search", "/search"], ["Size Advisor", "/size-advisor"]]} />
          <FooterCol title="Help" links={[["Contact", "/support"], ["Shipping", "/shipping"], ["Returns", "/returns"]]} />
          <FooterCol title="Account" links={[["Sign In", "/login"], ["Cart", "/cart"], ["Orders", "/profile"], ["Support", "/support"]]} />
        </div>
        <div className="hairline--soft mt-12 mb-6" style={{ height: 1 }} />
        <div className="flex flex-col md:flex-row justify-between gap-4 tech-label text-white/40">
          <span>© 2016 HEIS KITS — FOR THE LOVE OF THE GAME</span>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/returns" className="hover:text-white">Returns</Link>
            <span className="text-white/40">BUILT WITH AI · GEMINI POWERED</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="md:col-span-2">
      <div className="tech-label text-signal mb-4">{title}</div>
      <ul className="space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-sm font-medium text-white/70 hover:text-white inline-flex items-center gap-1 group">
              {label}
              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Page wrapper that adds the technical nav + footer. */
export default function Layout({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return (
    <div className="min-h-dvh bg-paper text-ink flex flex-col">
      <TechNav />
      <main className="flex-1">{children}</main>
      {footer && <TechFooter />}
    </div>
  );
}
