import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { fileToBase64 } from "@/lib/image";
import { Sparkles, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tag } from "@/components/tech";

const VIEWS = ["front", "three-quarter angle", "side", "back"];

export default function VirtualTryOn({ productId }: { productId: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<{ b64Json: string; mimeType: string } | null>(null);
  const [selectedViews, setSelectedViews] = useState<string[]>(["front", "three-quarter angle"]);

  const tryOn = trpc.tryOn.generate.useMutation({
    onError: err => toast.error(err.message || "Try-on failed. Try a clearer full-body photo."),
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please upload an image file");
    setPreview(URL.createObjectURL(file));
    setUserImage(await fileToBase64(file));
    tryOn.reset();
  };

  const toggleView = (v: string) =>
    setSelectedViews(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));

  const run = () => {
    if (!userImage) return toast.error("Upload a photo first");
    if (selectedViews.length === 0) return toast.error("Pick at least one angle");
    tryOn.mutate({ productId, userImage, views: selectedViews });
  };

  return (
    <div className="mt-10 border-2 border-ink">
      <div className="flex items-center justify-between px-5 py-3 surface-dark">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-signal" />
          <span className="font-bold uppercase tracking-wide text-sm">Virtual Try-On</span>
        </div>
        <Tag variant="signal">AI</Tag>
      </div>

      <div className="p-5">
        <p className="text-sm text-muted-foreground font-medium mb-4">
          Upload a clear, full-body photo and see this product on you.
        </p>

        <div className="flex items-start gap-4 flex-wrap">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="shrink-0 w-32 h-40 border-2 border-dashed border-ink/25 hover:border-signal bg-secondary grid place-items-center text-muted-foreground transition-colors overflow-hidden"
          >
            {preview ? (
              <img src={preview} alt="your upload" className="w-full h-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6" />
                <span className="tech-label">Upload</span>
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

          <div className="flex-1 min-w-[200px]">
            <div className="tech-label mb-2">Angles</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {VIEWS.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleView(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border-2 capitalize transition-colors ${
                    selectedViews.includes(v) ? "border-signal bg-signal text-white" : "border-ink/15 hover:border-ink"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button type="button" onClick={run} disabled={tryOn.isPending || !userImage} className="btn btn-signal">
              {tryOn.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {tryOn.isPending ? "Generating…" : "Try it on"}
            </button>
          </div>
        </div>

        {tryOn.isPending && (
          <p className="text-sm text-muted-foreground mt-4 font-medium">
            Compositing {selectedViews.length} view{selectedViews.length > 1 ? "s" : ""}… this can take 10–30s.
          </p>
        )}

        {tryOn.data && tryOn.data.images.length > 0 && (
          <div className="mt-5">
            <div className="tech-label mb-3">Your try-on</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {tryOn.data.images.map((img, i) => (
                <a key={i} href={img.url} target="_blank" rel="noreferrer" className="block group">
                  <div className="aspect-[3/4] overflow-hidden bg-secondary border border-ink/15">
                    <img src={img.url} alt={img.view} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <p className="tech-label mt-1 text-center capitalize">{img.view}</p>
                </a>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 font-medium">
              AI-generated preview — actual fit and colors may vary.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
