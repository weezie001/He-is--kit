import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, Receipt, Users, Headphones, Sparkles, ArrowUpRight, LogOut, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Layout from "@/components/Layout";

const NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Orders", href: "/admin/orders", icon: Receipt },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Support", href: "/admin/support", icon: Headphones },
  { label: "AI Insights", href: "/admin/insights", icon: Sparkles },
];

function isActive(location: string, href: string, exact?: boolean) {
  return exact ? location === href : location === href || location.startsWith(href + "/");
}

/**
 * Admin shell — role-gated wrapper with a dark sidebar.
 * Renders the storefront Layout for the gate states (loading / sign-in / forbidden)
 * so a non-admin can still navigate away.
 */
export default function AdminLayout({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const { data: threads } = trpc.support.threads.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 15000,
  });
  const supportUnread = (threads as any[] | undefined)?.reduce((n, t) => n + (t.unread || 0), 0) || 0;

  if (loading) {
    return (
      <Layout>
        <div className="container py-32 flex items-center justify-center gap-3 tech-label">
          <Loader2 className="w-5 h-5 animate-spin" /> Checking access…
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container py-24 text-center max-w-md mx-auto">
          <ShieldAlert className="w-10 h-10 mx-auto text-signal mb-4" />
          <h2 className="display text-4xl mb-3">Admin access</h2>
          <p className="text-muted-foreground font-medium mb-6">Sign in with an admin account to manage the store.</p>
          <Link href="/login" className="btn btn-primary">Sign in</Link>
        </div>
      </Layout>
    );
  }

  if (user?.role !== "admin") {
    return (
      <Layout>
        <div className="container py-24 text-center max-w-md mx-auto">
          <ShieldAlert className="w-10 h-10 mx-auto text-destructive mb-4" />
          <h2 className="display text-4xl mb-3">Not authorized</h2>
          <p className="text-muted-foreground font-medium mb-6">Your account doesn't have admin permissions.</p>
          <Link href="/" className="btn btn-outline">Back to shop</Link>
        </div>
      </Layout>
    );
  }

  return (
    <div className="min-h-dvh bg-paper text-ink lg:grid lg:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="surface-dark lg:sticky lg:top-0 lg:h-dvh flex flex-col">
        <div className="p-5 lg:p-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <span className="grid place-items-center w-9 h-9 bg-signal text-white display text-xl">H</span>
            <span className="display text-2xl">HEIS KITS</span>
          </Link>
          <span className="tech-label text-signal mt-2 inline-block">Admin Console</span>
        </div>

        {/* nav — horizontal scroll on mobile, vertical on desktop */}
        <nav className="flex lg:flex-col gap-1 p-3 lg:p-4 overflow-x-auto lg:overflow-visible flex-1">
          {NAV.map(item => {
            const active = isActive(location, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide whitespace-nowrap rounded-none transition-colors shrink-0 ${
                  active ? "bg-signal text-white" : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" /> {item.label}
                {item.href === "/admin/support" && supportUnread > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] px-1 grid place-items-center bg-signal text-white text-[10px] font-bold rounded-full">{supportUnread}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* View store + Sign out — a row under the nav on mobile, footer column on desktop */}
        <div className="flex flex-row lg:flex-col gap-1 p-3 lg:p-4 border-t border-white/10 overflow-x-auto">
          <Link href="/" className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide whitespace-nowrap text-white/70 hover:text-white transition-colors">
            <ArrowUpRight className="w-4 h-4 shrink-0" /> View store
          </Link>
          <button onClick={() => logout()} className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide whitespace-nowrap text-white/70 hover:text-signal transition-colors">
            <LogOut className="w-4 h-4 shrink-0" /> Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="min-w-0">
        <div className="container py-8 lg:py-10">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
            <div>
              <h1 className="display text-[clamp(2rem,5vw,3.4rem)] leading-none">{title}</h1>
              {description && <p className="text-muted-foreground font-medium mt-2">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
