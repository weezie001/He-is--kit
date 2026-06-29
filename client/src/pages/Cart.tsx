import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import WishlistRow from "@/components/WishlistRow";
import CatalogContinues from "@/components/CatalogContinues";
import ProductCard from "@/components/ProductCard";
import { TechLabel } from "@/components/tech";

const SHIPPING = 2500;

export default function Cart() {
  const { isAuthenticated } = useAuth();
  const { data: cartItems, isLoading, refetch } = trpc.cart.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: moreProducts } = trpc.products.list.useQuery({ limit: 12 });

  const removeFromCart = trpc.cart.remove.useMutation({
    onSuccess: () => { refetch(); toast.success("Item removed"); },
  });
  const clearCart = trpc.cart.clear.useMutation({
    onSuccess: () => { refetch(); toast.success("Cart cleared"); },
  });

  const EmptyState = ({ title, sub, cta }: { title: string; sub: string; cta: { label: string; href: string } }) => (
    <div className="container py-24 text-center">
      <ShoppingCart className="w-14 h-14 mx-auto text-ink/20 mb-5" />
      <h2 className="display text-4xl mb-2">{title}</h2>
      <p className="text-muted-foreground font-medium mb-7">{sub}</p>
      <Link href={cta.href} className="btn btn-primary">{cta.label} <ArrowRight className="w-4 h-4" /></Link>
    </div>
  );

  if (!isAuthenticated) {
    return <Layout><EmptyState title="Sign in to view your cart" sub="Your bag is waiting." cta={{ label: "Sign in", href: "/login" }} /></Layout>;
  }
  if (isLoading) {
    return <Layout><div className="container py-24 text-center tech-label">Loading cart…</div></Layout>;
  }
  if (!cartItems || cartItems.length === 0) {
    return (
      <Layout>
        <EmptyState title="Your cart is empty" sub="Explore the lineup and add some gear." cta={{ label: "Shop the catalog", href: "/catalog" }} />
        <WishlistRow />
        <CatalogContinues heading="Continue shopping" />
        <div className="pb-16" />
      </Layout>
    );
  }

  const subtotal = cartItems.reduce((sum: number, item: any) => sum + Number(item.product?.price || 0) * item.quantity, 0);
  const total = subtotal + SHIPPING;

  const cartIds = new Set(cartItems.map((i: any) => i.product?.id));
  const moreForYou = (moreProducts as any[] || []).filter(p => !cartIds.has(p.id)).slice(0, 8);

  return (
    <Layout>
      <section className="border-b border-ink">
        <div className="container py-12">
          <TechLabel>Your bag</TechLabel>
          <h1 className="display text-[clamp(2.6rem,7vw,6rem)] mt-2">Cart</h1>
          <p className="mono text-sm font-bold mt-2">{cartItems.length} <span className="text-muted-foreground font-medium">items</span></p>
        </div>
      </section>

      <div className="container py-12 grid lg:grid-cols-3 gap-8">
        {/* items */}
        <div className="lg:col-span-2 divide-y divide-ink/10 border-y border-ink/10">
          {cartItems.map((item: any) => (
            <div key={item.id} className="flex gap-4 py-5">
              <Link href={`/product/${item.product?.id}`} className="w-24 h-24 bg-secondary overflow-hidden shrink-0">
                <img src={item.product?.imageUrl} alt={item.product?.name} className="w-full h-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/product/${item.product?.id}`} className="font-bold text-lg hover:text-signal transition-colors">{item.product?.name}</Link>
                <div className="flex gap-4 mt-1 tech-label">
                  <span>Size · {item.size}</span>
                  <span>Qty · {item.quantity}</span>
                </div>
                <p className="display text-xl mt-3">₦{(Number(item.product?.price || 0) * item.quantity).toLocaleString()}</p>
              </div>
              <button onClick={() => removeFromCart.mutate({ cartItemId: item.id })} className="text-muted-foreground hover:text-destructive transition-colors h-fit" aria-label="Remove">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          <div className="py-4">
            <button onClick={() => clearCart.mutate()} className="tech-label text-muted-foreground hover:text-destructive">Clear cart</button>
          </div>
        </div>

        {/* summary */}
        <div className="border-2 border-ink p-6 h-fit lg:sticky lg:top-28">
          <h3 className="display text-2xl mb-5">Summary</h3>
          <div className="space-y-3 text-sm font-medium">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="mono">₦{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="mono">₦{SHIPPING.toLocaleString()}</span></div>
          </div>
          <div className="flex justify-between items-baseline mt-5 pt-5 border-t border-ink/15">
            <span className="font-bold uppercase tracking-wide text-sm">Total</span>
            <span className="display text-3xl">₦{total.toLocaleString()}</span>
          </div>
          <Link href="/checkout" className="btn btn-primary w-full mt-6">Checkout <ArrowRight className="w-4 h-4" /></Link>
          <Link href="/catalog" className="btn btn-outline w-full mt-3">Keep shopping</Link>
        </div>
      </div>

      {/* More for you */}
      {moreForYou.length > 0 && (
        <section className="container pb-4">
          <h2 className="display text-3xl mb-6">More for you</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {moreForYou.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <WishlistRow />

      {/* Catalog continues under the wishlist */}
      <CatalogContinues heading="Continue shopping" />
      <div className="pb-16" />
    </Layout>
  );
}
