import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { fileToBase64 } from "@/lib/image";
import { Search as SearchIcon, Loader, ImagePlus, Sparkles, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import { TechLabel } from "@/components/tech";

const SUGGESTIONS = ["Red jersey", "Football boots", "Black tracksuit", "Gym gear"];

export default function Search() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // debounce the typed query for instant previews
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 180);
    return () => clearTimeout(t);
  }, [query]);

  const { data: suggestions, isFetching } = trpc.products.search.useQuery(
    { q: debounced },
    { enabled: debounced.trim().length > 0, staleTime: 30_000 }
  );

  const imageSearch = trpc.search.byImage.useMutation({
    onSuccess: data => { setResults(data.results); setHasSearched(true); setOpen(false); toast.success(`Found ${data.results.length} similar`); },
    onError: err => toast.error(err.message || "Image search failed"),
  });

  // close dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setOpen(false);
    setHasSearched(true);
    try {
      const res = await utils.products.search.fetch({ q });
      setResults(res);
    } catch {
      setResults(suggestions || []);
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please upload an image");
    imageSearch.mutate({ image: await fileToBase64(file) });
  };

  const sugg = suggestions || [];

  return (
    <Layout>
      <section className="border-b border-ink">
        <div className="container py-12">
          <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-signal" /><TechLabel ink>Search</TechLabel></div>
          <h1 className="display text-[clamp(2.6rem,7vw,6rem)]">Find it fast</h1>

          <div className="max-w-2xl mt-8" ref={boxRef}>
            <div className="relative">
              <form onSubmit={e => { e.preventDefault(); runSearch(query); }} className="flex gap-2">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    placeholder="Search jerseys, boots, gear…"
                    className="field !pl-12"
                    autoComplete="off"
                  />
                </div>
                <button type="submit" className="btn btn-primary shrink-0">
                  {isFetching ? <Loader className="w-5 h-5 animate-spin" /> : <SearchIcon className="w-5 h-5" />}
                </button>
              </form>

              {/* typeahead dropdown */}
              {open && debounced.trim().length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-card border-2 border-ink max-h-[60vh] overflow-auto shadow-[6px_6px_0_0_rgba(10,10,11,0.12)]">
                  {sugg.length === 0 ? (
                    <div className="p-4 tech-label">{isFetching ? "Searching…" : "No matches"}</div>
                  ) : (
                    sugg.map((p: any) => (
                      <button
                        key={p.id}
                        onMouseDown={() => navigate(`/product/${p.id}`)}
                        className="w-full flex items-center gap-3 p-2.5 hover:bg-secondary transition-colors text-left border-b border-ink/10 last:border-0"
                      >
                        <div className="w-12 h-12 bg-card border border-ink/10 overflow-hidden shrink-0">
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{p.name}</p>
                          <p className="tech-label mt-0.5">{(p.category || "").replace("_", " ")}</p>
                        </div>
                        <span className="font-bold text-sm mono whitespace-nowrap">₦{Number(p.price).toLocaleString()}</span>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              disabled={imageSearch.isPending}
              className="mt-3 w-full flex items-center justify-center gap-2 px-6 py-3.5 border-2 border-dashed border-ink/20 hover:border-signal hover:text-signal transition-colors font-bold uppercase tracking-wide text-sm"
            >
              {imageSearch.isPending ? <><Loader className="w-5 h-5 animate-spin" /> Analyzing…</> : <><ImagePlus className="w-5 h-5" /> Search by image</>}
            </button>
            <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

            {!hasSearched && (
              <div className="mt-6 flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => { setQuery(s); setDebounced(s); runSearch(s); }} className="px-4 py-2 rounded-full border-2 border-ink/15 hover:border-ink text-sm font-medium transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container py-12">
        {hasSearched && (
          <>
            <h2 className="display text-3xl mb-8">{results.length > 0 ? `${results.length} results` : "No matches"}</h2>
            {results.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {results.map((p: any) => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground font-medium mb-4">Try a different query or image.</p>
                <button onClick={() => { setQuery(""); setResults([]); setHasSearched(false); }} className="btn btn-outline">New search</button>
              </div>
            )}
          </>
        )}
      </section>
    </Layout>
  );
}
