import { trpc } from "@/lib/trpc";
import { useWishlistIds } from "@/lib/wishlist";
import ProductCard from "@/components/ProductCard";
import { Heart } from "lucide-react";
import { TechLabel } from "@/components/tech";

/** Shows the user's wishlisted products (from localStorage). Renders nothing if empty. */
export default function WishlistRow() {
  const wishIds = useWishlistIds();
  const { data: products } = trpc.products.list.useQuery({ limit: 100 });
  const items = (products || []).filter((p: any) => wishIds.includes(p.id));

  if (items.length === 0) return null;

  return (
    <section className="container mt-16 pt-12 border-t border-ink">
      <div className="flex items-center gap-2 mb-6">
        <Heart className="w-5 h-5 text-signal fill-signal" />
        <TechLabel ink>Your wishlist</TechLabel>
        <span className="tech-label">· {items.length} saved</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {items.map((p: any) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
