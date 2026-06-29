import { useEffect } from "react";
import { Link } from "wouter";
import { X, ArrowUpRight } from "lucide-react";

// Full-screen image viewer. Click the backdrop, the ✕, or press Esc to close.
// Optionally shows an action button (e.g. "View product") that links elsewhere.
export default function Lightbox({
  src,
  alt,
  onClose,
  href,
  actionLabel = "View product",
}: {
  src: string;
  alt?: string;
  onClose: () => void;
  href?: string;
  actionLabel?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 grid place-items-center p-4 cursor-zoom-out" onClick={onClose}>
      <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 grid place-items-center w-11 h-11 bg-white/10 hover:bg-white/25 text-white rounded-full transition-colors">
        <X className="w-5 h-5" />
      </button>
      <div className="flex flex-col items-center gap-4 cursor-default" onClick={e => e.stopPropagation()}>
        <img src={src} alt={alt || ""} className="max-w-full max-h-[80vh] object-contain select-none" />
        {href && (
          <Link href={href} onClick={onClose} className="btn btn-paper">
            {actionLabel} <ArrowUpRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
