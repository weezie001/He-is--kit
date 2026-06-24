import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Loader2, Settings2, Package, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { labelizeCategory } from "@/lib/categories";
import AdminLayout from "@/components/AdminLayout";
import { Modal } from "./Products";
import { formatNaira, formatDate, StatusBadge, ORDER_STATUSES, PAYMENT_STATUSES } from "./shared";

const FILTERS = ["all", ...ORDER_STATUSES] as const;

export default function AdminOrders() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: orders, isLoading } = trpc.admin.orders.list.useQuery(undefined, { enabled: isAdmin });

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [managing, setManaging] = useState<any | null>(null);

  const filtered = useMemo(() => {
    const list = (orders as any[]) || [];
    return filter === "all" ? list : list.filter(o => o.status === filter);
  }, [orders, filter]);

  return (
    <AdminLayout title="Orders" description={orders ? `${orders.length} total` : "Manage customer orders"}>
      {/* status filters */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-5">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-[12px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${filter === f ? "bg-ink text-paper" : "hover:text-signal"}`}
          >
            {f}{f !== "all" && orders ? ` (${(orders as any[]).filter(o => o.status === f).length})` : ""}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-24 flex items-center justify-center gap-3 tech-label"><Loader2 className="w-5 h-5 animate-spin" /> Loading orders…</div>
      ) : filtered.length === 0 ? (
        <div className="border border-ink/15 p-10 text-center text-muted-foreground font-medium">No orders{filter !== "all" ? ` with status "${filter}"` : " yet"}.</div>
      ) : (
        <div className="border border-ink/15 bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-ink/15 text-left">
                <th scope="col" className="p-3 tech-label font-bold">Order</th>
                <th scope="col" className="p-3 tech-label font-bold">Customer</th>
                <th scope="col" className="p-3 tech-label font-bold">Date</th>
                <th scope="col" className="p-3 tech-label font-bold text-right">Total</th>
                <th scope="col" className="p-3 tech-label font-bold">Status</th>
                <th scope="col" className="p-3 tech-label font-bold">Payment</th>
                <th scope="col" className="p-3 tech-label font-bold text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {filtered.map(o => {
                const itemCount = Array.isArray(o.items) ? o.items.reduce((n: number, it: any) => n + (it.quantity || 1), 0) : 0;
                return (
                  <tr key={o.id} className="hover:bg-secondary/60 transition-colors">
                    <td className="p-3">
                      <div className="font-bold whitespace-nowrap">{o.orderNumber}</div>
                      <div className="tech-label mt-0.5 normal-case tracking-normal font-medium">{itemCount} item{itemCount === 1 ? "" : "s"}</div>
                      {/* item thumbnails preview */}
                      <div className="flex items-center gap-1 mt-1.5">
                        {(Array.isArray(o.items) ? o.items : []).slice(0, 4).map((it: any, i: number) => (
                          it.product?.imageUrl
                            ? <img key={i} src={it.product.imageUrl} alt={it.product.name} title={it.product.name} className="w-7 h-7 object-cover bg-secondary border border-border" loading="lazy" />
                            : <span key={i} className="w-7 h-7 grid place-items-center bg-secondary border border-border text-muted-foreground"><ImageOff className="w-3 h-3" /></span>
                        ))}
                        {Array.isArray(o.items) && o.items.length > 4 && (
                          <span className="text-[10px] font-bold text-muted-foreground ml-0.5">+{o.items.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 min-w-0">
                      <div className="font-bold truncate max-w-[200px]">{o.userName || "—"}</div>
                      <div className="tech-label mt-0.5 normal-case tracking-normal font-medium truncate max-w-[200px]">{o.userEmail || "—"}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">{formatDate(o.createdAt)}</td>
                    <td className="p-3 text-right font-bold mono whitespace-nowrap">{formatNaira(o.totalAmount)}</td>
                    <td className="p-3"><StatusBadge status={o.status} /></td>
                    <td className="p-3"><StatusBadge status={o.paymentStatus} /></td>
                    <td className="p-3 text-right">
                      <button onClick={() => setManaging(o)} className="inline-flex items-center gap-1.5 border border-ink px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide hover:bg-ink hover:text-paper transition-colors">
                        <Settings2 className="w-3.5 h-3.5" /> Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {managing && <ManageOrderModal order={managing} onClose={() => setManaging(null)} />}
    </AdminLayout>
  );
}

function ManageOrderModal({ order, onClose }: { order: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    status: order.status as string,
    paymentStatus: order.paymentStatus as string,
    trackingNumber: order.trackingNumber || "",
    carrier: order.carrier || "",
    estimatedDelivery: order.estimatedDelivery || "",
  });

  const update = trpc.admin.orders.update.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.admin.orders.list.invalidate(), utils.admin.stats.invalidate()]);
      toast.success("Order updated");
      onClose();
    },
    onError: e => toast.error(e.message || "Could not update order"),
  });

  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const addr = order.shippingAddress || {};

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      orderId: order.id,
      status: form.status as any,
      paymentStatus: form.paymentStatus as any,
      trackingNumber: form.trackingNumber.trim(),
      carrier: form.carrier.trim(),
      estimatedDelivery: form.estimatedDelivery.trim(),
    });
  };

  return (
    <Modal title={order.orderNumber} onClose={onClose} wide>
      {/* summary */}
      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <div className="border border-ink/15 p-4">
          <span className="tech-label">Customer</span>
          <p className="font-bold mt-1">{order.userName || "—"}</p>
          <p className="text-sm text-muted-foreground">{order.userEmail || "—"}</p>
        </div>
        <div className="border border-ink/15 p-4">
          <span className="tech-label">Ship to</span>
          <p className="font-bold mt-1">{addr.name || order.userName || "—"}</p>
          <p className="text-sm text-muted-foreground">
            {[addr.address, addr.city, addr.country, addr.postalCode].filter(Boolean).join(", ") || "No address on file"}
          </p>
        </div>
      </div>

      {/* items */}
      <div className="border border-ink/15 mb-5">
        <div className="px-4 py-3 border-b border-ink/10 flex items-center justify-between">
          <span className="tech-label inline-flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Items</span>
          <span className="font-bold mono text-sm">{formatNaira(order.totalAmount)}</span>
        </div>
        {items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No item details stored.</p>
        ) : (
          <div className="divide-y divide-ink/10">
            {items.map((it, i) => {
              const p = it.product;
              const qty = it.quantity || 1;
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  {p ? (
                    <Link href={`/product/${p.id}`} className="shrink-0">
                      <img src={p.imageUrl} alt={p.name} className="w-14 h-14 object-cover bg-secondary border border-border" loading="lazy" />
                    </Link>
                  ) : (
                    <div className="w-14 h-14 grid place-items-center bg-secondary border border-border shrink-0 text-muted-foreground"><ImageOff className="w-5 h-5" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate">{p ? p.name : `Product #${it.productId} (removed)`}</div>
                    <div className="tech-label mt-0.5 normal-case tracking-normal font-medium">
                      {[p && labelizeCategory(p.category), p?.color, it.size && `Size ${it.size}`].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="mono text-sm">{qty} × {formatNaira(it.price)}</div>
                    <div className="font-bold mono text-sm">{formatNaira(Number(it.price || 0) * qty)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* editable fields */}
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="tech-label block mb-1.5">Order status</span>
            <select className="field" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="tech-label block mb-1.5">Payment status</span>
            <select className="field" value={form.paymentStatus} onChange={e => setForm(p => ({ ...p, paymentStatus: e.target.value }))}>
              {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="tech-label block mb-1.5">Carrier</span>
            <input className="field" value={form.carrier} onChange={e => setForm(p => ({ ...p, carrier: e.target.value }))} placeholder="DHL" />
          </label>
          <label className="block">
            <span className="tech-label block mb-1.5">Tracking #</span>
            <input className="field" value={form.trackingNumber} onChange={e => setForm(p => ({ ...p, trackingNumber: e.target.value }))} placeholder="HK123…" />
          </label>
          <label className="block">
            <span className="tech-label block mb-1.5">Est. delivery</span>
            <input className="field" value={form.estimatedDelivery} onChange={e => setForm(p => ({ ...p, estimatedDelivery: e.target.value }))} placeholder="3–5 days" />
          </label>
        </div>
        <p className="tech-label normal-case tracking-normal font-medium text-muted-foreground">Tracking details appear on the customer's order page.</p>
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={update.isPending} className="btn btn-primary">
            {update.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save changes
          </button>
          <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
