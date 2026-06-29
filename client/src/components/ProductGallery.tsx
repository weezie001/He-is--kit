import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Auto-sliding product image gallery. Shows every image, advances on its own,
// pauses while hovered, with arrows, dots and a thumbnail strip. Falls back to a
// single static image when there's only one.
export default function ProductGallery({
  images,
  alt,
  intervalMs = 4000,
}: {
  images: string[];
  alt: string;
  intervalMs?: number;
}) {
  const count = images.length;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = (n: number) => setIdx(((n % count) + count) % count);

  // auto-advance
  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = setInterval(() => setIdx(i => (i + 1) % count), intervalMs);
    return () => clearInterval(t);
  }, [count, paused, intervalMs]);

  // keep the index valid if the image set changes
  useEffect(() => { setIdx(i => (i < count ? i : 0)); }, [count]);

  if (count === 0) return <div className="bg-secondary aspect-square" />;

  return (
    <div>
      <div
        className="relative bg-secondary aspect-square overflow-hidden group"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* sliding track — each slide is full width; translate by one slide per index */}
        <div
          className="flex h-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${alt} — image ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              className="w-full h-full object-cover shrink-0"
            />
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(idx - 1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-paper/80 hover:bg-paper text-ink shadow opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => go(idx + 1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-paper/80 hover:bg-paper text-ink shadow opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to image ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-signal" : "w-1.5 bg-white/70 hover:bg-white"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* thumbnail strip */}
      {count > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`View image ${i + 1}`}
              className={`shrink-0 w-16 h-16 overflow-hidden border-2 transition-colors ${i === idx ? "border-ink" : "border-transparent hover:border-ink/30"}`}
            >
              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
