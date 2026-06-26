import { useState } from "react";
import { Link } from "wouter";
import {
  Check, Package, Truck, Home, ClipboardList, X, Loader2,
  ChevronDown, RotateCcw, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const STAGES = [
  { key: "ordered", label: "Ordered", icon: ClipboardList },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "out", label: "Out for delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

// order.status enum -> index of the furthest reached stage
const STATUS_INDEX: Record<string, number> = {
  pending: 0, processing: 1, shipped: 2, delivered: 4,
};

// Status -> human label + pill styling (colour is always paired with a word/icon).
const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Order placed", cls: "bg-secondary text-ink" },
  processing: { label: "Processing", cls: "bg-ink text-paper" },
  shipped: { label: "Shipped", cls: "bg-ink text-paper" },
  delivered: { label: "Delivered", cls: "bg-signal text-white" },
  cancelled: { label: "Cancelled", cls: "border border-destructive text-destructive" },
};

const naira = (v: any) => `₦${Number(v || 0).toLocaleString()}`;
const fmtDate = (d: any) => {
  const t = d ? new Date(d) : null;
  return t && !isNaN(t.getTime())
    ? t.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "";
};

function Thumb({ item, size = "w-12 h-12", muted = false }: { item: any; size?: string; muted?: boolean }) {
  const src = item?.product?.imageUrl;
  return (
    <span className={`${size} shrink-0 grid place-items-center bg-secondary overflow-hidden border border-ink/10 ${muted ? "grayscale opacity-80" : ""}`}>
      {src ? (
        <img src={src} alt={item?.product?.name || "Product"} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <Package className="w-4 h-4 text-muted-foreground" />
      )}
    </span>
  );
}

export default function OrderTracking({ order, muted = false, defaultOpen = false }: { order: any; muted?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [confirm, setConfirm] = useState(false);
  const utils = trpc.useUtils();

  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.reduce((n, it) => n + (Number(it.quantity) || 1), 0);
  const cancelled = order.status === "cancelled";
  const delivered = order.status === "delivered";
  const reached = STATUS_INDEX[order.status] ?? 0;
  const canCancel = !cancelled && !delivered;
  const meta = STATUS_META[order.status] || STATUS_META.pending;
  const addr: any = order.shippingAddress || {};

  const cancel = trpc.orders.cancel.useMutation({
    onSuccess: () => { utils.orders.list.invalidate(); toast.success("Order cancelled"); setConfirm(false); },
    onError: e => toast.error(e.message || "Could not cancel order"),
  });

  const addToCart = trpc.cart.add.useMutation();
  const [buying, setBuying] = useState(false);
  const buyAgain = async () => {
    const available = items.filter(it => it.product);
    if (!available.length) { toast.error("These items are no longer available"); return; }
    setBuying(true);
    try {
      for (const it of available) {
        await addToCart.mutateAsync({ productId: it.productId, size: it.size, quantity: Number(it.quantity) || 1 });
      }
      await utils.cart.list.invalidate();
      toast.success(available.length === items.length ? "Added to cart" : "Available items added to cart");
    } catch {
      toast.error("Could not add items to cart");
    } finally {
      setBuying(false);
    }
  };

  const panelId = `order-${order.id}-details`;

  return (
    <div className={`border border-ink/15 bg-card transition-colors ${muted ? "opacity-75 hover:opacity-100" : ""}`}>
      {/* header — toggles details */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center gap-4 p-4 sm:p-5 text-left cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
      >
        {/* thumbnails preview */}
        <div className="hidden sm:flex -space-x-2">
          {items.slice(0, 3).map((it, i) => <Thumb key={i} item={it} muted={muted} />)}
          {items.length > 3 && (
            <span className="w-12 h-12 shrink-0 grid place-items-center bg-secondary border border-ink/10 text-xs font-bold">+{items.length - 3}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold">{order.orderNumber}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 ${meta.cls}`}>{meta.label}</span>
          </div>
          <p className="tech-label mt-1">
            {fmtDate(order.createdAt) && <>{fmtDate(order.createdAt)} · </>}
            {itemCount} item{itemCount === 1 ? "" : "s"} · {naira(order.totalAmount)}
          </p>
        </div>

        <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* details */}
      {open && (
        <div id={panelId} className="border-t border-ink/10">
          {/* items ordered */}
          <ul className="divide-y divide-ink/5">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                {it.product ? (
                  <Link href={`/product/${it.productId}`} className="shrink-0"><Thumb item={it} muted={muted} /></Link>
                ) : (
                  <Thumb item={it} muted={muted} />
                )}
                <div className="min-w-0 flex-1">
                  {it.product ? (
                    <Link href={`/product/${it.productId}`} className="font-bold text-sm hover:text-signal block truncate">{it.product.name}</Link>
                  ) : (
                    <span className="font-bold text-sm block truncate">Product #{it.productId}</span>
                  )}
                  <p className="tech-label mt-0.5">{it.size ? `Size ${it.size} · ` : ""}Qty {it.quantity || 1}</p>
                </div>
                <span className="font-bold text-sm mono whitespace-nowrap">{naira(Number(it.price || 0) * (it.quantity || 1))}</span>
              </li>
            ))}
          </ul>

          {/* timeline (not for cancelled) */}
          {cancelled ? (
            <div className="px-4 sm:px-5 py-4 border-t border-ink/10 flex items-center gap-2 text-destructive font-bold text-sm">
              <X className="w-4 h-4" /> This order was cancelled
            </div>
          ) : (
            <div className="px-4 sm:px-5 py-5 border-t border-ink/10">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-0">
                {STAGES.map((s, i) => {
                  const done = i <= reached;
                  const current = i === reached;
                  return (
                    <div key={s.key} className="flex sm:flex-col sm:items-center sm:flex-1 gap-3 sm:gap-0 relative">
                      {i < STAGES.length - 1 && (
                        <span className={`hidden sm:block absolute top-4 left-1/2 w-full h-0.5 ${i < reached ? "bg-signal" : "bg-ink/15"}`} />
                      )}
                      <span className={`relative z-10 w-8 h-8 rounded-full grid place-items-center shrink-0 ${done ? "bg-signal text-white" : "bg-secondary text-muted-foreground"} ${current ? "ring-4 ring-signal/20" : ""}`}>
                        {done ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                      </span>
                      <span className={`text-[11px] font-bold uppercase tracking-wide sm:mt-2 sm:text-center ${done ? "text-ink" : "text-muted-foreground"}`}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* tracking meta */}
          {(order.trackingNumber || order.carrier || order.estimatedDelivery) && (
            <div className="flex flex-wrap gap-x-8 gap-y-2 px-4 sm:px-5 py-3 border-t border-ink/10">
              {order.carrier && <Meta label="Carrier" value={order.carrier} />}
              {order.trackingNumber && <Meta label="Tracking #" value={order.trackingNumber} />}
              {order.estimatedDelivery && <Meta label="Est. delivery" value={order.estimatedDelivery} />}
            </div>
          )}

          {/* shipping address */}
          {(addr.name || addr.address) && (
            <div className="px-4 sm:px-5 py-3 border-t border-ink/10 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <div className="tech-label">Shipping to</div>
                <p className="text-sm font-medium mt-0.5">
                  {[addr.name, addr.address, addr.city, addr.country, addr.postalCode].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          )}

          {/* actions */}
          <div className="px-4 sm:px-5 py-3 border-t border-ink/10 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={buyAgain}
              disabled={buying}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide hover:text-signal cursor-pointer disabled:opacity-50"
            >
              {buying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Buy again
            </button>

            {canCancel && (
              !confirm ? (
                <button onClick={() => setConfirm(true)} className="tech-label text-muted-foreground hover:text-destructive inline-flex items-center gap-1 cursor-pointer">
                  <X className="w-3.5 h-3.5" /> Cancel order
                </button>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span className="tech-label">Cancel this order?</span>
                  <button onClick={() => cancel.mutate({ orderId: order.id })} disabled={cancel.isPending} className="inline-flex items-center gap-1 bg-destructive text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50">
                    {cancel.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Yes, cancel
                  </button>
                  <button onClick={() => setConfirm(false)} className="tech-label text-muted-foreground hover:text-ink px-2 cursor-pointer">Keep</button>
                </span>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="tech-label">{label}</div>
      <div className="font-bold text-sm mt-0.5 mono">{value}</div>
    </div>
  );
}
