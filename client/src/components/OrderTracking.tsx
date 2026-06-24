import { useState } from "react";
import { Check, Package, Truck, Home, ClipboardList, X, Loader2 } from "lucide-react";
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

export default function OrderTracking({ order }: { order: any }) {
  const cancelled = order.status === "cancelled";
  const delivered = order.status === "delivered";
  const reached = STATUS_INDEX[order.status] ?? 0;
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;
  const [confirm, setConfirm] = useState(false);
  const utils = trpc.useUtils();

  const cancel = trpc.orders.cancel.useMutation({
    onSuccess: () => { utils.orders.list.invalidate(); toast.success("Order cancelled"); },
    onError: e => toast.error(e.message || "Could not cancel order"),
  });
  const canCancel = !cancelled && !delivered;

  return (
    <div className="border border-ink/15">
      {/* header */}
      <div className="flex items-center justify-between gap-3 flex-wrap p-5 border-b border-ink/10">
        <div>
          <span className="font-bold">{order.orderNumber}</span>
          <p className="tech-label mt-1">{itemCount} item{itemCount === 1 ? "" : "s"} · ₦{Number(order.totalAmount).toLocaleString()}</p>
        </div>
        <span className={`tag ${cancelled ? "" : "tag--ink"} ${cancelled ? "!border-destructive !text-destructive" : ""}`}>{order.status}</span>
      </div>

      {/* tracking meta */}
      {(order.trackingNumber || order.carrier || order.estimatedDelivery) && (
        <div className="flex flex-wrap gap-x-8 gap-y-2 px-5 py-3 border-b border-ink/10">
          {order.carrier && <Meta label="Carrier" value={order.carrier} />}
          {order.trackingNumber && <Meta label="Tracking #" value={order.trackingNumber} />}
          {order.estimatedDelivery && <Meta label="Est. delivery" value={order.estimatedDelivery} />}
        </div>
      )}

      {/* timeline */}
      <div className="p-5">
        {cancelled ? (
          <div className="flex items-center gap-2 text-destructive font-bold">
            <X className="w-5 h-5" /> Order cancelled
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-0">
            {STAGES.map((s, i) => {
              const done = i <= reached;
              const current = i === reached;
              return (
                <div key={s.key} className="flex sm:flex-col sm:items-center sm:flex-1 gap-3 sm:gap-0 relative">
                  {/* connector */}
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
        )}
      </div>

      {/* cancel (allowed until delivered) */}
      {canCancel && (
        <div className="px-5 py-3 border-t border-ink/10 flex items-center justify-end gap-2">
          {!confirm ? (
            <button onClick={() => setConfirm(true)} className="tech-label text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Cancel order
            </button>
          ) : (
            <>
              <span className="tech-label">Cancel this order?</span>
              <button onClick={() => cancel.mutate({ orderId: order.id })} disabled={cancel.isPending} className="inline-flex items-center gap-1 bg-destructive text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide">
                {cancel.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Yes, cancel
              </button>
              <button onClick={() => setConfirm(false)} className="tech-label text-muted-foreground hover:text-ink px-2">Keep</button>
            </>
          )}
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
