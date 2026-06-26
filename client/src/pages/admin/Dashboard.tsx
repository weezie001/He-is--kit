import { useState } from "react";
import { Link } from "wouter";
import { ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { labelizeCategory } from "@/lib/categories";
import AdminLayout from "@/components/AdminLayout";
import { formatNaira, StatCard, StatusBadge } from "./shared";

const BLAZE = "#ff2e1f";
const naira0 = (v: number) => `₦${Number(v || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
const nakShort = (v: number) => (v >= 1000 ? `₦${Math.round(v / 1000)}k` : `₦${v}`);

function ChartTip({ active, payload, label, kind }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink text-paper px-3 py-2 text-xs font-bold shadow-lg">
      <div className="tech-label !text-paper/70 mb-1">{label}</div>
      {kind === "category"
        ? <div>{naira0(payload[0].value)}</div>
        : <div>{naira0(payload[0].payload.revenue)} · {payload[0].payload.orders} order{payload[0].payload.orders === 1 ? "" : "s"}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [days, setDays] = useState(14);
  const { data, isLoading } = trpc.admin.stats.useQuery(undefined, { enabled: isAdmin });
  const { data: analytics } = trpc.admin.analytics.useQuery({ days }, { enabled: isAdmin });
  const RANGES = [7, 14, 30, 90];

  const categoryData = (analytics?.categoryRevenue || []).map(c => ({ label: labelizeCategory(c.category), revenue: c.revenue }));

  return (
    <AdminLayout title="Dashboard" description="Store performance at a glance.">
      {isLoading || !data ? (
        <div className="py-24 flex items-center justify-center gap-3 tech-label">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading stats…
        </div>
      ) : (
        <div className="space-y-10">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard label="Revenue" value={formatNaira(data.totalRevenue)} sub="Excludes cancelled" accent />
            <StatCard label="Orders" value={data.orderCount} sub={`${data.openOrderCount} need attention`} />
            <StatCard label="Products" value={data.productCount} />
            <StatCard label="Customers" value={data.customerCount} />
            <StatCard label="Open orders" value={data.openOrderCount} sub="Pending + processing" />
            <StatCard label="Low stock" value={data.lowStockCount} sub="≤ 10 in stock" />
          </div>

          {/* Analytics graphs */}
          <div className="grid lg:grid-cols-2 gap-6">
            <section>
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <h2 className="display text-2xl">Sales — last {days} days</h2>
                <div className="inline-flex border border-ink/20">
                  {RANGES.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDays(r)}
                      className={`px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${days === r ? "surface-dark" : "hover:bg-secondary"}`}
                    >
                      {r}d
                    </button>
                  ))}
                </div>
              </div>
              <div className="border border-ink/15 bg-card p-4 pt-5">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={analytics?.salesByDay || []} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BLAZE} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={BLAZE} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} width={52} tickFormatter={nakShort} />
                    <Tooltip content={<ChartTip kind="sales" />} cursor={{ stroke: BLAZE, strokeOpacity: 0.3 }} />
                    <Area type="monotone" dataKey="revenue" stroke={BLAZE} strokeWidth={2} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section>
              <h2 className="display text-2xl mb-4">Revenue by category</h2>
              <div className="border border-ink/15 bg-card p-4 pt-5">
                {categoryData.length === 0 ? (
                  <div className="h-[260px] grid place-items-center text-muted-foreground font-medium text-sm">No sales data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={nakShort} />
                      <YAxis type="category" dataKey="label" width={104} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTip kind="category" />} cursor={{ fill: "var(--secondary)" }} />
                      <Bar dataKey="revenue" fill={BLAZE} radius={[0, 2, 2, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>

          {/* Order status breakdown */}
          <section>
            <h2 className="display text-2xl mb-4">Orders by status</h2>
            <div className="border border-ink/15 bg-card p-5 space-y-3">
              {Object.entries(data.statusCounts).map(([status, count]) => {
                const max = Math.max(1, ...Object.values(data.statusCounts));
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="w-24 shrink-0"><StatusBadge status={status} /></div>
                    <div className="flex-1 h-3 bg-secondary overflow-hidden">
                      <div className="h-full bg-signal transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right font-bold mono text-sm">{count}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent orders */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="display text-2xl">Recent orders</h2>
                <Link href="/admin/orders" className="tech-label text-signal inline-flex items-center gap-1 hover:underline">
                  All orders <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="border border-ink/15 bg-card divide-y divide-ink/10">
                {data.recentOrders.length === 0 ? (
                  <p className="p-5 text-muted-foreground font-medium">No orders yet.</p>
                ) : (
                  data.recentOrders.map(o => (
                    <Link key={o.id} href="/admin/orders" className="flex items-center justify-between gap-3 p-4 hover:bg-secondary transition-colors">
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{o.orderNumber}</div>
                        <div className="tech-label mt-0.5 truncate normal-case tracking-normal font-medium">{o.userName || o.userEmail || "Guest"}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold mono text-sm">{formatNaira(o.totalAmount)}</span>
                        <StatusBadge status={o.status} />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            {/* Low stock */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="display text-2xl">Low stock</h2>
                <Link href="/admin/products" className="tech-label text-signal inline-flex items-center gap-1 hover:underline">
                  Manage <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="border border-ink/15 bg-card divide-y divide-ink/10">
                {data.lowStock.length === 0 ? (
                  <p className="p-5 text-muted-foreground font-medium">Everything well stocked.</p>
                ) : (
                  data.lowStock.map(p => (
                    <Link key={p.id} href="/admin/products" className="flex items-center gap-3 p-4 hover:bg-secondary transition-colors">
                      <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover bg-secondary border border-border shrink-0" loading="lazy" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm truncate">{p.name}</div>
                        <div className="tech-label mt-0.5 normal-case tracking-normal font-medium">{labelizeCategory(p.category)}</div>
                      </div>
                      <span className={`inline-flex items-center gap-1 font-bold mono text-sm shrink-0 ${p.stock === 0 ? "text-destructive" : "text-ink"}`}>
                        {p.stock === 0 && <AlertTriangle className="w-3.5 h-3.5" />}{p.stock}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
