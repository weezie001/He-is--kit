import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWishlist } from "@/lib/wishlist";
import { labelizeCategory } from "@/lib/categories";
import { sizesForCategory } from "@shared/const";
import { Tag } from "@/components/tech";

type Product = {
  id: number;
  name: string;
  team?: string | null;
  price: string;
  imageUrl: string;
  category?: string;
  style?: string | null;
  color?: string | null;
  featured?: boolean;
  sizes?: Record<string, number> | null;
};

export default function ProductCard({ product }: { product: Product; index?: number }) {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { wished, toggle } = useWishlist(product.id);
  const utils = trpc.useUtils();
  const [adding, setAdding] = useState(false);

  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => {
      utils.cart.list.invalidate();
      toast.success("Added to cart");
    },
    onError: e => toast.error(e.message || "Could not add to cart"),
  });

  // Quick-add picks the first size for the category (M for clothes, 41 for
  // footwear, "One Size" otherwise) — matches the product page's options.
  const defaultSize = sizesForCategory(product.category)[0] || "One Size";

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Sign in to add to cart");
      navigate("/login");
      return;
    }
    setAdding(true);
    try {
      await addToCart.mutateAsync({ productId: product.id, size: defaultSize, quantity: 1 });
    } finally {
      setAdding(false);
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
    toast.message(wished ? "Removed from wishlist" : "Saved to wishlist");
  };

  return (
    <div className="group flex flex-col">
      <Link href={`/product/${product.id}`} className="block relative">
        <div className="relative aspect-square overflow-hidden bg-card border border-border">
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {product.featured && (
            <div className="absolute top-3 left-3"><Tag variant="signal">Featured</Tag></div>
          )}
          {/* wishlist heart */}
          <button
            onClick={handleWishlist}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            className={`absolute top-3 right-3 w-9 h-9 grid place-items-center rounded-full border transition-colors ${
              wished ? "bg-signal text-white border-signal" : "bg-card/90 text-ink border-border hover:border-ink"
            }`}
          >
            <Heart className={`w-4 h-4 ${wished ? "fill-current" : ""}`} />
          </button>
        </div>
      </Link>

      {/* info */}
      <div className="pt-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="tech-label">{labelizeCategory(product.category)}</span>
          <span className="tech-label">{product.color || product.style || ""}</span>
        </div>
        <Link href={`/product/${product.id}`} className="block mt-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-[15px] leading-tight group-hover:text-signal transition-colors">{product.name}</h3>
            <span className="font-bold text-[15px] mono whitespace-nowrap">₦{Number(product.price).toLocaleString()}</span>
          </div>
        </Link>

        {/* actions */}
        <div className="flex gap-2 mt-3">
          <button onClick={handleAdd} disabled={adding} className="btn btn-primary flex-1 !py-2.5 !px-3 !text-[12px]">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}
