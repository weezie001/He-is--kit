import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Search, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { fileToBase64 } from "@/lib/image";

const QUICK = ["red jersey", "boots", "tracksuit", "ball", "gym"];

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [imgResults, setImgResults] = useState<any[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
    else { setQ(""); setDebounced(""); setImgResults(null); }
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  const { data: suggestions } = trpc.products.search.useQuery(
    { q: debounced },
    { enabled: open && debounced.trim().length >= 2 }
  );
  const imageSearch = trpc.search.byImage.useMutation({
    onSuccess: d => setImgResults(d.results),
    onError: e => toast.error(e.message || "Image search failed"),
  });

  const results = imgResults ?? suggestions ?? [];

  const go = (id: number) => { onClose(); navigate(`/product/${id}`); };
  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image");
    setImgResults(null);
    imageSearch.mutate({ image: await fileToBase64(f) });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-paper border-b-2 border-ink shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
        <div className="container py-5">
          {/* search bar with image-search icon first */}
          <div className="flex items-center gap-2 border-2 border-ink px-2 h-12">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid place-items-center w-9 h-9 shrink-0 hover:text-signal transition-colors"
              aria-label="Search by image"
              title="Search by image"
            >
              {imageSearch.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            </button>
            <span className="w-px h-6 bg-ink/15" />
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={e => { setQ(e.target.value); setImgResults(null); }}
              placeholder="Search the catalog…"
              className="flex-1 bg-transparent outline-none font-medium min-w-0"
            />
            <button type="button" onClick={onClose} className="grid place-items-center w-9 h-9 shrink-0 hover:text-signal" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

          {/* suggestions */}
          {results.length > 0 ? (
            <div className="mt-3 max-h-[58vh] overflow-auto">
              {imgResults && <p className="tech-label mb-2">Visual matches</p>}
              <div className="grid sm:grid-cols-2 gap-2">
                {results.map((p: any) => (
                  <button key={p.id} onClick={() => go(p.id)} className="flex items-center gap-3 p-2 border border-ink/10 hover:border-ink transition-colors text-left">
                    <div className="w-12 h-12 bg-card shrink-0 overflow-hidden border border-ink/10">
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm truncate">{p.name}</p>
                      <p className="tech-label">{String(p.category || "").replace("_", " ")}</p>
                    </div>
                    <span className="mono font-bold text-sm whitespace-nowrap">₦{Number(p.price).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : debounced.trim().length >= 2 && !imageSearch.isPending ? (
            <p className="tech-label mt-3">No matches for "{debounced}"</p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="tech-label">Try:</span>
              {QUICK.map(s => (
                <button key={s} onClick={() => setQ(s)} className="px-3 py-1 border border-ink/15 text-xs font-bold uppercase tracking-wide hover:border-ink transition-colors">{s}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
