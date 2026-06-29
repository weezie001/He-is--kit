import { useRef, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { fileToBase64 } from "@/lib/image";
import { useAuth } from "@/_core/hooks/useAuth";
import { Sparkles, Upload, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { Tag } from "@/components/tech";
import Lightbox from "@/components/Lightbox";

// Mirrors the server: try-on is only for wearable apparel/footwear.
const TRYON_CATEGORIES = new Set(["club_jerseys", "trainers", "boots", "track_suits", "training_kits", "gym_gear"]);

export default function VirtualTryOn({
  productId,
  category,
  sizes,
  defaultSize,
}: {
  productId: number;
  category: string;
  sizes: string[];
  defaultSize?: string;
}) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<{ b64Json: string; mimeType: string } | null>(null);
  const [size, setSize] = useState<string>(defaultSize || "");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: quota } = trpc.tryOn.quota.useQuery(undefined, { enabled: isAuthenticated });

  const tryOn = trpc.tryOn.generate.useMutation({
    onSuccess: () => utils.tryOn.quota.invalidate(),
    onError: err => toast.error(err.message || "Try-on failed. Use a clear, well-lit full-body photo."),
  });

  // Only render for clothing/footwear products.
  if (!TRYON_CATEGORIES.has(category)) return null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please upload an image file");
    setPreview(URL.createObjectURL(file));
    setUserImage(await fileToBase64(file));
    tryOn.reset();
  };

  const run = () => {
    if (!userImage) return toast.error("Upload a photo first");
    if (!size) return toast.error("Select and confirm your size first");
    tryOn.mutate({ productId, size, userImage });
  };

  const download = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `heiskits-tryon-${size || "fit"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank"); // fallback: open to save manually
    }
  };

  const resultUrl = tryOn.data?.image?.url;
  const outOfTries = quota && !quota.available && !resultUrl;

  const isJersey = category === "club_jerseys";

  return (
    <section className="mt-12 border-2 border-ink max-w-3xl">
      <div className="flex items-center justify-between px-5 py-3 surface-dark">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-signal" />
          <span className="font-bold uppercase tracking-wide text-sm">Virtual Try-On</span>
        </div>
        <Tag variant="signal">AI</Tag>
      </div>

      <div className="p-5">
        {!isAuthenticated ? (
          <div className="text-center py-8">
            <p className="font-medium mb-3">Sign in to see this on you with AI.</p>
            <Link href="/login" className="btn btn-primary">Sign in</Link>
          </div>
        ) : outOfTries ? (
          <div className="text-center py-8">
            <p className="font-bold mb-1">Try-on limit reached</p>
            <p className="text-sm text-muted-foreground font-medium">
              {quota!.globalRemaining <= 0
                ? "Virtual try-on is at capacity this month — it resets on the 1st."
                : `You've used all ${quota!.userCap} of your try-ons this month — they reset on the 1st.`}
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* controls */}
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-4">
                Upload a clear, well-lit full-body photo, confirm your size, and see it on you.
                {quota && <span className="text-ink font-bold"> {quota.userRemaining} of {quota.userCap} left this month.</span>}
              </p>

              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="shrink-0 w-28 h-36 border-2 border-dashed border-ink/25 hover:border-signal bg-secondary grid place-items-center text-muted-foreground transition-colors overflow-hidden"
                >
                  {preview ? (
                    <img src={preview} alt="your upload" className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex flex-col items-center gap-2"><Upload className="w-6 h-6" /><span className="tech-label">Upload</span></span>
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

                <div className="flex-1 min-w-0">
                  <div className="tech-label mb-2">Confirm size</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {sizes.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        className={`min-w-[3rem] py-2 px-3 text-sm font-bold border-2 transition-colors ${size === s ? "border-ink surface-dark" : "border-ink/15 hover:border-ink"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={run} disabled={tryOn.isPending || !userImage || !size} className="btn btn-signal">
                    {tryOn.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {tryOn.isPending ? "Generating…" : size ? `Try on size ${size}` : "Try it on"}
                  </button>
                  <p className="tech-label mt-2">White-background 4K studio shot · ~20–30s</p>
                </div>
              </div>
            </div>

            {/* result */}
            <div>
              <div className="tech-label mb-2">Your try-on</div>
              <div className={`${isJersey ? "aspect-square" : "aspect-[2/3]"} bg-secondary border border-ink/15 overflow-hidden grid place-items-center`}>
                {tryOn.isPending ? (
                  <div className="text-center text-muted-foreground">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2" />
                    <p className="tech-label">Compositing your fit…</p>
                  </div>
                ) : resultUrl ? (
                  <button type="button" onClick={() => setLightbox(resultUrl)} title="View full screen" className="w-full h-full cursor-zoom-in">
                    <img src={resultUrl} alt="try-on result" className="w-full h-full object-contain bg-white" />
                  </button>
                ) : (
                  <p className="tech-label text-muted-foreground px-4 text-center">Your try-on will appear here</p>
                )}
              </div>
              {resultUrl && (
                <div className="flex items-center justify-between gap-3 mt-3">
                  <button onClick={() => download(resultUrl)} className="btn btn-outline !py-2"><Download className="w-4 h-4" /> Download</button>
                  <span className="text-[11px] text-muted-foreground font-medium">Tap to enlarge · fit &amp; colours may vary</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {lightbox && <Lightbox src={lightbox} alt="try-on result" onClose={() => setLightbox(null)} />}
    </section>
  );
}
