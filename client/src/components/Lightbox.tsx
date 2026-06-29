import { useEffect } from "react";
import { X } from "lucide-react";

// Full-screen image viewer. Click the backdrop, the ✕, or press Esc to close.
export default function Lightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
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
      <img src={src} alt={alt || ""} onClick={e => e.stopPropagation()} className="max-w-full max-h-[90vh] object-contain cursor-default select-none" />
    </div>
  );
}
