import { useState } from "react";
import { Link } from "wouter";
import { Package, Heart, ShieldCheck, Ruler, Sparkles, Settings as SettingsIcon, RefreshCw, ChevronRight, ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWishlistIds } from "@/lib/wishlist";
import ProductCard from "@/components/ProductCard";
import OrderTracking from "@/components/OrderTracking";
import { TechLabel } from "@/components/tech";

type Profile = {
  favoriteSport?: string | null;
  favoriteTeam?: string | null;
  userType?: string | null;
  stylePreference?: string | null;
  recommendedSize?: string | null;
};

export default function ProfileDashboard({ profile, onRetake }: { profile: Profile; onRetake: () => void }) {
  const { user } = useAuth();
  const wishIds = useWishlistIds();
  const { data: orders } = trpc.orders.list.useQuery();
  const { data: recommended } = trpc.products.list.useQuery({ style: profile.stylePreference || undefined, limit: 4 });
  const { data: allProducts } = trpc.products.list.useQuery({ limit: 100 });
  const [showCancelled, setShowCancelled] = useState(false);

  const wishlist = (allProducts || []).filter((p: any) => wishIds.includes(p.id));
  const orderCount = orders?.length || 0;
  const activeOrders = (orders || []).filter((o: any) => o.status !== "cancelled");
  const cancelledOrders = (orders || []).filter((o: any) => o.status === "cancelled");

  const memberSince = (user as any)?.createdAt
    ? new Date((user as any).createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "—";
  const loginLabel =
    user?.loginMethod === "google" ? "Google"
    : user?.loginMethod === "email" ? "Email & password"
    : user?.loginMethod ? user.loginMethod : "HEIS ID";

  const tiles = [
    { icon: Package, title: "Your Orders", sub: `${orderCount} order${orderCount === 1 ? "" : "s"}`, href: "#orders" },
    { icon: Heart, title: "Your Wishlist", sub: `${wishlist.length} saved`, href: "#wishlist" },
    { icon: Ruler, title: "Size Profile", sub: profile.recommendedSize ? `Recommended: ${profile.recommendedSize}` : "Get your size", href: "/size-advisor" },
    { icon: ShieldCheck, title: "Settings", sub: "Account, password, theme", href: "/settings" },
    { icon: Sparkles, title: "AI Try-On", sub: "See it on you", href: "/catalog" },
    { icon: RefreshCw, title: "Preferences", sub: "Retake the quiz", action: onRetake },
  ];

  const prefs = [
    ["Favorite sport", profile.favoriteSport],
    ["Favorite team", profile.favoriteTeam],
    ["Fan / Player", profile.userType],
    ["Style", profile.stylePreference],
    ["Recommended size", profile.recommendedSize],
  ].filter(([, v]) => v);

  return (
    <div className="container py-12">
      {/* header */}
      <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
        <div>
          <TechLabel className="text-signal">Your account</TechLabel>
          <h1 className="display text-[clamp(2.4rem,6vw,4.5rem)] mt-1">Hi, {user?.name || "Athlete"}</h1>
        </div>
        <Link href="/settings" className="btn btn-outline">
          <SettingsIcon className="w-4 h-4" /> Settings
        </Link>
      </div>

      {/* account tiles */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-12">
        {tiles.map(t => {
          const inner = (
            <div className="flex items-center gap-4 border border-ink/15 p-5 hover:border-ink transition-colors h-full bg-card">
              <span className="w-11 h-11 grid place-items-center bg-secondary shrink-0"><t.icon className="w-5 h-5" /></span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">{t.title}</h3>
                <p className="tech-label mt-0.5 truncate">{t.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          );
          return t.action ? (
            <button key={t.title} onClick={t.action} className="text-left">{inner}</button>
          ) : t.href?.startsWith("#") ? (
            <a key={t.title} href={t.href}>{inner}</a>
          ) : (
            <Link key={t.title} href={t.href!}>{inner}</Link>
          );
        })}
      </div>

      {/* preferences + security */}
      <div className="grid lg:grid-cols-2 gap-6 mb-14">
        <div id="security" className="border border-ink/15 p-6">
          <div className="flex items-center justify-between">
            <TechLabel ink>Profile</TechLabel>
            <Link href="/settings" className="tech-label text-signal hover:underline">Edit</Link>
          </div>
          <div className="mt-4 space-y-3">
            <Field label="Name" value={user?.name || "—"} />
            <Field label="Email" value={user?.email || "—"} />
            <Field label="Sign-in" value={loginLabel} />
            <Field label="Member since" value={memberSince} />
          </div>
        </div>
        <div className="border border-ink/15 p-6">
          <TechLabel ink>Your preferences</TechLabel>
          {prefs.length > 0 ? (
            <div className="mt-4 space-y-3">
              {prefs.map(([label, value]) => <Field key={label as string} label={label as string} value={value as string} />)}
            </div>
          ) : (
            <p className="text-muted-foreground font-medium mt-4">No preferences yet.</p>
          )}
          <button onClick={onRetake} className="tech-label text-signal inline-flex items-center gap-1 mt-5">Retake quiz <RefreshCw className="w-3 h-3" /></button>
        </div>
      </div>

      {/* orders */}
      <section id="orders" className="mb-14">
        <div className="flex items-end justify-between gap-3 mb-5">
          <h2 className="display text-3xl">Your orders</h2>
          {orderCount > 0 && <Link href="/catalog" className="tech-label hover:text-signal hidden sm:inline">Continue shopping →</Link>}
        </div>

        {orderCount === 0 ? (
          <div className="border border-ink/15 p-10 text-center">
            <Package className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="font-bold mb-1">No orders yet</p>
            <p className="text-muted-foreground font-medium mb-5 text-sm">When you place an order, it'll show up here with live tracking.</p>
            <Link href="/catalog" className="btn btn-primary">Start shopping</Link>
          </div>
        ) : (
          <>
            {activeOrders.length > 0 ? (
              <div className="space-y-4">
                {activeOrders.map((o: any) => <OrderTracking key={o.id} order={o} />)}
              </div>
            ) : (
              <p className="text-muted-foreground font-medium text-sm">No active orders right now.</p>
            )}

            {/* cancelled — tucked behind a disclosure so they don't clutter the list */}
            {cancelledOrders.length > 0 && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowCancelled(s => !s)}
                  aria-expanded={showCancelled}
                  className="inline-flex items-center gap-2 tech-label text-muted-foreground hover:text-ink cursor-pointer"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCancelled ? "rotate-180" : ""}`} />
                  Cancelled orders ({cancelledOrders.length})
                </button>
                {showCancelled && (
                  <div className="space-y-3 mt-4">
                    {cancelledOrders.map((o: any) => <OrderTracking key={o.id} order={o} muted />)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* wishlist */}
      {wishlist.length > 0 && (
        <section id="wishlist" className="mb-14">
          <h2 className="display text-3xl mb-5">Your wishlist</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {wishlist.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* recommended */}
      {recommended && recommended.length > 0 && (
        <section>
          <h2 className="display text-3xl mb-5">Recommended for you</h2>
          <p className="text-muted-foreground font-medium -mt-3 mb-5">
            Based on your {profile.stylePreference ? `${profile.stylePreference.toLowerCase()} style` : "preferences"}.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {recommended.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="tech-label">{label}</span>
      <span className="font-bold text-sm capitalize">{value}</span>
    </div>
  );
}
