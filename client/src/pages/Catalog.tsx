import { useEffect, useMemo, useRef, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { Search, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCategories } from "@/lib/categories";
import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import { ProductGridSkeleton } from "@/components/Skeleton";
import { TechLabel } from "@/components/tech";

export default function Catalog() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const urlCat = params.get("category") || undefined;
  const wantFocus = params.get("focus") === "search";

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(urlCat);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const { categories } = useCategories();

  // keep the filter in sync with the URL (nav dropdown links)
  useEffect(() => setSelectedCategory(urlCat), [urlCat]);
  // focus the search box when arriving via the nav search button
  useEffect(() => { if (wantFocus) setTimeout(() => searchRef.current?.focus(), 80); }, [wantFocus]);

  const { data: products, isLoading } = trpc.products.list.useQuery({ category: selectedCategory });

  // live client-side text filter on top of the category filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (products as any[]) || [];
    if (!q) return list;
    return list.filter(p =>
      `${p.name} ${p.category} ${p.team || ""} ${p.color || ""} ${p.style || ""}`.toLowerCase().includes(q)
    );
  }, [products, query]);

  const pickCategory = (value?: string) => {
    setSelectedCategory(value);
    navigate(value ? `/catalog?category=${value}` : "/catalog");
  };

  return (
    <Layout>
      {/* header + search panel */}
      <section className="border-b border-ink">
        <div className="container py-12 lg:py-16">
          <TechLabel>The full lineup</TechLabel>
          <div className="mt-3">
            <h1 className="display text-[clamp(3rem,8vw,7rem)]">Shop all</h1>
          </div>

          {/* search panel — right in front of the heading */}
          <div className="mt-7 relative max-w-2xl">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search jerseys, boots, gear…"
              className="field !pl-12 !pr-12 !py-3.5 text-base"
              autoComplete="off"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 hover:text-signal">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* category filter — dynamic, flexible pills */}
          <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <FilterPill active={!selectedCategory} onClick={() => pickCategory(undefined)}>All</FilterPill>
            {categories.map(c => (
              <FilterPill key={c.value} active={selectedCategory === c.value} onClick={() => pickCategory(c.value)}>
                {c.label}
              </FilterPill>
            ))}
          </div>
        </div>
      </section>

      {/* grid */}
      <section className="container py-12">
        {isLoading ? (
          <ProductGridSkeleton count={12} />
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {filtered.map((p: any, i: number) => (
              <Reveal key={p.id} delay={(i % 4) * 60}>
                <ProductCard product={p} index={i + 1} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <h2 className="display text-4xl mb-3">Nothing here yet</h2>
            <p className="text-muted-foreground font-medium mb-5">
              {query ? `No products match "${query}".` : "No products found in this category."}
            </p>
            {(query || selectedCategory) && (
              <button onClick={() => { setQuery(""); pickCategory(undefined); }} className="btn btn-outline">Reset filters</button>
            )}
          </div>
        )}
      </section>
    </Layout>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 text-[12px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${
        active ? "bg-ink text-paper border-ink" : "border-ink/15 hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}
