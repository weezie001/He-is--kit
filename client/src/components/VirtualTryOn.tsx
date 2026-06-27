import { useRef, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { fileToBase64 } from "@/lib/image";
import { useAuth } from "@/_core/hooks/useAuth";
import { Sparkles, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tag } from "@/components/tech";

export default function VirtualTryOn({ productId }: { productId: number }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<{ b64Json: string; mimeType: string } | null>(null);

  const { data: quota } = trpc.tryOn.quota.useQuery(undefined, { enabled: isAuthenticated });

  const tryOn = trpc.tryOn.generate.useMutation({
    onSuccess: () => { utils.tryOn.quota.invalidate(); },
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

  const run = () => {
    if (!userImage) return toast.error("Upload a photo first");
    tryOn.mutate({ productId, userImage, views: ["front"] });
  };

  const outOfTries = quota && !quota.available;

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
        {!isAuthenticated ? (
          <div className="text-center py-6">
            <p className="font-medium mb-3">Sign in to see this kit on you with AI.</p>
            <Link href="/login" className="btn btn-primary">Sign in</Link>
          </div>
        ) : outOfTries ? (
          <div className="text-center py-6">
            <p className="font-bold mb-1">Try-on limit reached</p>
            <p className="text-sm text-muted-foreground font-medium">
              {quota!.globalRemaining <= 0
                ? "Virtual try-on is at capacity this month — it resets on the 1st."
                : `You've used all ${quota!.userCap} of your try-ons this month — they reset on the 1st.`}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground font-medium mb-4">
              Upload a clear, full-body photo and see this product on you.
              {quota && <span className="text-ink font-bold"> {quota.userRemaining} of {quota.userCap} left this month.</span>}
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
                <button type="button" onClick={run} disabled={tryOn.isPending || !userImage} className="btn btn-signal">
                  {tryOn.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {tryOn.isPending ? "Generating…" : "Try it on"}
                </button>
                <p className="tech-label mt-2">One photorealistic front view · ~10–30s</p>
              </div>
            </div>

            {tryOn.isPending && (
              <p className="text-sm text-muted-foreground mt-4 font-medium">Compositing your try-on… this can take 10–30s.</p>
            )}

            {tryOn.data && tryOn.data.images.length > 0 && (
              <div className="mt-5">
                <div className="tech-label mb-3">Your try-on</div>
                <a href={tryOn.data.images[0].url} target="_blank" rel="noreferrer" className="block group w-48 max-w-full">
                  <div className="aspect-[3/4] overflow-hidden bg-secondary border border-ink/15">
                    <img src={tryOn.data.images[0].url} alt="try-on" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                </a>
                <p className="text-[11px] text-muted-foreground mt-3 font-medium">
                  AI-generated preview — actual fit and colors may vary.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
