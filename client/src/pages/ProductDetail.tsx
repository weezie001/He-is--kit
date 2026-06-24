import { useState } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { ShoppingCart, ChevronLeft, AlertCircle, Minus, Plus, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import VirtualTryOn from "@/components/VirtualTryOn";
import Reviews from "@/components/Reviews";
import { TechLabel, Tag } from "@/components/tech";

export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const { isAuthenticated } = useAuth();
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const { data: product, isLoading } = trpc.products.getById.useQuery(
    { id: parseInt(params?.id || "0") },
    { enabled: !!params?.id }
  );

  const addToCartMutation = trpc.cart.add.useMutation({
    onSuccess: () => {
      toast.success("Added to cart");
      setSelectedSize("");
      setQuantity(1);
    },
    onError: error => toast.error(error.message || "Failed to add to cart"),
  });

  const handleAddToCart = async () => {
    if (!selectedSize) return toast.error("Select a size first");
    if (!isAuthenticated) return toast.error("Please sign in to add items");
    setIsAdding(true);
    await addToCartMutation.mutateAsync({ productId: product!.id, size: selectedSize, quantity });
    setIsAdding(false);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 grid md:grid-cols-2 gap-12">
          <div className="aspect-square bg-secondary animate-pulse" />
          <div className="space-y-4">
            <div className="h-12 bg-secondary animate-pulse w-3/4" />
            <div className="h-6 bg-secondary animate-pulse w-1/2" />
            <div className="h-32 bg-secondary animate-pulse" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <h1 className="display text-5xl mb-4">Not found</h1>
          <Link href="/catalog" className="btn btn-primary">Back to catalog</Link>
        </div>
      </Layout>
    );
  }

  const sizes = product.sizes ? Object.keys(product.sizes) : ["XS", "S", "M", "L", "XL", "XXL"];
  const specs = [
    ["Material", product.material],
    ["Color", product.color],
    ["Style", product.style],
    ["Team", product.team],
  ].filter(([, v]) => v);

  return (
    <Layout>
      <div className="container py-6">
        <Link href="/catalog" className="inline-flex items-center gap-1 tech-label hover:text-signal">
          <ChevronLeft className="w-4 h-4" /> Back to catalog
        </Link>
      </div>

      <div className="container pb-16 grid lg:grid-cols-2 gap-10 lg:gap-16">
        {/* image */}
        <div className="relative bg-secondary aspect-square overflow-hidden">
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          {product.featured && <div className="absolute top-4 left-4"><Tag variant="signal">Featured</Tag></div>}
        </div>

        {/* info */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Tag variant="ink">{(product.category || "").replace("_", " ")}</Tag>
            {product.team && <TechLabel>{product.team}</TechLabel>}
          </div>
          <h1 className="display text-[clamp(2.4rem,5vw,4rem)] leading-[0.9]">{product.name}</h1>

          <div className="flex items-baseline gap-3 mt-5">
            <span className="display text-4xl">₦{Number(product.price).toLocaleString()}</span>
            {product.originalPrice && (
              <span className="text-xl text-muted-foreground line-through mono">₦{Number(product.originalPrice).toLocaleString()}</span>
            )}
          </div>

          {product.description && (
            <p className="text-muted-foreground font-medium mt-5 leading-relaxed max-w-lg">{product.description}</p>
          )}

          {/* size */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <TechLabel ink>Select size</TechLabel>
              <Link href="/size-advisor" className="tech-label text-signal inline-flex items-center gap-1">
                Size advisor <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size: string) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`min-w-[3.5rem] py-3 px-4 font-bold border-2 transition-colors ${
                    selectedSize === size ? "border-ink surface-dark" : "border-ink/15 hover:border-ink"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            {product.stock === 0 && (
              <div className="flex items-center gap-2 text-destructive text-sm mt-3 font-bold">
                <AlertCircle className="w-4 h-4" /> Out of stock
              </div>
            )}
          </div>

          {/* qty + add */}
          <div className="flex items-stretch gap-3 mt-8">
            <div className="flex items-center border-2 border-ink">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 h-full hover:bg-ink hover:text-white transition-colors" aria-label="Decrease">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-bold mono">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="px-4 h-full hover:bg-ink hover:text-white transition-colors" aria-label="Increase">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {isAuthenticated ? (
              <button onClick={handleAddToCart} disabled={isAdding || product.stock === 0} className="btn btn-primary flex-1">
                <ShoppingCart className="w-4 h-4" /> {isAdding ? "Adding…" : "Add to cart"}
              </button>
            ) : (
              <Link href="/login" className="btn btn-primary flex-1">
                <ShoppingCart className="w-4 h-4" /> Sign in to shop
              </Link>
            )}
          </div>

          {/* specs */}
          {specs.length > 0 && (
            <div className="mt-10 border-t border-ink/15">
              {specs.map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between py-3 border-b border-ink/10">
                  <span className="tech-label">{label}</span>
                  <span className="font-bold text-sm capitalize">{value as string}</span>
                </div>
              ))}
            </div>
          )}

          {/* Virtual Try-On */}
          <VirtualTryOn productId={product.id} />
        </div>
      </div>

      {/* Reviews */}
      <div className="container pb-20">
        <Reviews productId={product.id} />
      </div>
    </Layout>
  );
}
