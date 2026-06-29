import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ProductCard from "@/components/ProductCard";
import { TechLabel } from "@/components/tech";

// A "keep browsing" product grid that continues the catalog inline (under a
// product's reviews, or under the cart's wishlist). Grows on scroll so it
// behaves like the main catalog without leaving the page.
export default function CatalogContinues({
  excludeId,
  heading = "Keep shopping",
}: {
  excludeId?: number;
  heading?: string;
}) {
  const { data: products } = trpc.products.list.useQuery({ limit: 100 });
  const list = ((products as any[]) || []).filter(p => p.id !== excludeId);

  const PAGE = 12;
  const [visible, setVisible] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) setVisible(v => (v < list.length ? v + PAGE : v)); },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [list.length]);

  if (list.length === 0) return null;
  const shown = list.slice(0, visible);

  return (
    <section className="container mt-16 pt-12 border-t border-ink">
      <div className="flex items-end justify-between gap-3 mb-6">
        <div>
          <TechLabel className="text-signal">More from the shop</TechLabel>
          <h2 className="display text-3xl mt-1">{heading}</h2>
        </div>
        <Link href="/catalog" className="tech-label hover:text-signal inline-flex items-center gap-1 shrink-0">
          View all <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {shown.map((p: any) => <ProductCard key={p.id} product={p} />)}
      </div>
      {visible < list.length && (
        <div ref={sentinelRef} className="h-16 grid place-items-center mt-8">
          <span className="tech-label text-muted-foreground animate-pulse">Loading more…</span>
        </div>
      )}
    </section>
  );
}
