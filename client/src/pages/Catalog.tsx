import { useEffect, useMemo, useRef, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { Search, X, ImagePlus, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { fileToBase64 } from "@/lib/image";
import { useCategories } from "@/lib/categories";
import { shuffleProducts } from "@/lib/shuffle";
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
  const imageRef = useRef<HTMLInputElement>(null);
  const [imageResults, setImageResults] = useState<any[] | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("heis_search_history") || "[]"); } catch { return []; }
  });
  const recordSearch = (q: string) => {
    const v = q.trim();
    if (!v) return;
    setHistory(prev => {
      const next = [v, ...prev.filter(x => x.toLowerCase() !== v.toLowerCase())].slice(0, 8);
      try { localStorage.setItem("heis_search_history", JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const clearHistory = () => { setHistory([]); try { localStorage.removeItem("heis_search_history"); } catch {} };

  const imageSearch = trpc.search.byImage.useMutation({
    onSuccess: data => { setImageResults(data.results); toast.success(`Found ${data.results.length} visual match${data.results.length === 1 ? "" : "es"}`); },
    onError: e => toast.error(e.message || "Image search failed"),
  });
  const handleImageSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image");
    imageSearch.mutate({ image: await fileToBase64(file) });
  };

  const { categories } = useCategories();

  // keep the filter in sync with the URL (nav dropdown links)
  useEffect(() => setSelectedCategory(urlCat), [urlCat]);
  // focus the search box when arriving via the nav search button
  useEffect(() => { if (wantFocus) setTimeout(() => searchRef.current?.focus(), 80); }, [wantFocus]);
  // close the suggestions dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setSearchOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data: products, isLoading } = trpc.products.list.useQuery({ category: selectedCategory });
  // shuffle the catalog per page load (stable within the session)
  const shuffled = useMemo(() => shuffleProducts((products as any[]) || []), [products]);

  // live client-side text filter on top of the category filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = shuffled;
    if (!q) return list;
    return list.filter(p =>
      `${p.name} ${p.category} ${p.team || ""} ${p.color || ""} ${p.style || ""}`.toLowerCase().includes(q)
    );
  }, [shuffled, query]);

  // typeahead suggestions (product matches) for the search dropdown
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as any[];
    const seen = new Set<string>(); const out: any[] = [];
    for (const p of shuffled) {
      if (out.length >= 6) break;
      if (!seen.has(p.name) && `${p.name} ${p.team || ""} ${p.category}`.toLowerCase().includes(q)) { seen.add(p.name); out.push(p); }
    }
    return out;
  }, [shuffled, query]);

  // Infinite scroll — render a growing slice, load more as the sentinel nears.
  const PAGE = 12;
  const [visible, setVisible] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setVisible(PAGE); }, [selectedCategory, query]); // reset on filter change
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) setVisible(v => (v < filtered.length ? v + PAGE : v)); },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);
  const shown = filtered.slice(0, visible);

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

          {/* search panel — image-search icon, then the text search bar */}
          <div className="mt-7 flex items-center gap-2 max-w-2xl">
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              disabled={imageSearch.isPending}
              title="Search by image"
              aria-label="Search by image"
              className="shrink-0 grid place-items-center w-[3.25rem] h-[3.25rem] border-2 border-ink/15 hover:border-signal hover:text-signal transition-colors disabled:opacity-50"
            >
              {imageSearch.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            </button>
            <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageSearch} />
            <div ref={boxRef} className="relative flex-1">
              <input
                ref={searchRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={e => { if (e.key === "Enter") { recordSearch(query); setSearchOpen(false); } }}
                placeholder="Search jerseys, boots, gear…"
                className="field !pr-12 !py-3.5 text-base"
                autoComplete="off"
              />
              {query ? (
                <button onClick={() => { setQuery(""); searchRef.current?.focus(); }} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 hover:text-signal">
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              )}

              {/* autofill suggestions + recent searches */}
              {searchOpen && (suggestions.length > 0 || (!query.trim() && history.length > 0)) && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-card border-2 border-ink max-h-[60vh] overflow-auto shadow-[6px_6px_0_0_rgba(10,10,11,0.12)]">
                  {query.trim() ? (
                    suggestions.map((p: any) => (
                      <button key={p.id} onMouseDown={() => { recordSearch(p.name); navigate(`/product/${p.id}`); }}
                        className="w-full flex items-center gap-3 p-2.5 hover:bg-secondary transition-colors text-left border-b border-ink/10 last:border-0">
                        <div className="w-10 h-10 bg-card border border-ink/10 overflow-hidden shrink-0"><img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /></div>
                        <span className="flex-1 min-w-0 font-bold text-sm truncate">{p.name}</span>
                        <span className="font-bold text-sm mono whitespace-nowrap">₦{Number(p.price).toLocaleString()}</span>
                      </button>
                    ))
                  ) : (
                    <>
                      <div className="px-3 pt-2.5 pb-1 flex items-center justify-between tech-label">
                        <span>Recent searches</span>
                        <button onMouseDown={clearHistory} className="hover:text-signal">Clear</button>
                      </div>
                      {history.map(h => (
                        <button key={h} onMouseDown={() => { setQuery(h); recordSearch(h); setSearchOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary transition-colors text-left border-b border-ink/10 last:border-0">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> <span className="text-sm font-medium truncate">{h}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
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
        {imageResults !== null ? (
          <>
            <div className="flex items-center justify-between gap-3 mb-6">
              <h2 className="display text-2xl">{imageResults.length} visual match{imageResults.length === 1 ? "" : "es"}</h2>
              <button onClick={() => setImageResults(null)} className="btn btn-outline !py-2">Clear</button>
            </div>
            {imageResults.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {imageResults.map((p: any) => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <p className="text-muted-foreground font-medium">No visual matches — try another photo.</p>
            )}
          </>
        ) : isLoading ? (
          <ProductGridSkeleton count={12} />
        ) : filtered.length > 0 ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {shown.map((p: any, i: number) => (
                <Reveal key={p.id} delay={(i % 4) * 60}>
                  <ProductCard product={p} index={i + 1} />
                </Reveal>
              ))}
            </div>
            {visible < filtered.length && (
              <div ref={sentinelRef} className="h-16 grid place-items-center mt-8">
                <span className="tech-label text-muted-foreground animate-pulse">Loading more…</span>
              </div>
            )}
          </>
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
