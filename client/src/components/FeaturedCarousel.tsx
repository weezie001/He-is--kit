import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";

/**
 * Static (no auto-scroll) horizontal product rail. Manually scrollable and
 * swipeable: native touch swipe on mobile, click-and-drag with a mouse on
 * desktop, plus prev/next arrows. Scroll-snaps to each card.
 */
export default function FeaturedCarousel({ products }: { products: any[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scroller.current;
    if (!el) return;
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [products, updateArrows]);

  // rAF tween so arrows animate everywhere (CSS `behavior:"smooth"` is a no-op
  // in some embedded/headless webviews).
  const anim = useRef<number | null>(null);
  const nudge = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    if (anim.current) cancelAnimationFrame(anim.current);
    const start = el.scrollLeft;
    const target = Math.max(0, Math.min(start + dir * Math.min(el.clientWidth * 0.85, 560), el.scrollWidth - el.clientWidth));
    const dur = 350;
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 === null) t0 = ts;
      const p = Math.min(1, (ts - t0) / dur);
      el.scrollLeft = start + (target - start) * ease(p);
      if (p < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };
  useEffect(() => () => { if (anim.current) cancelAnimationFrame(anim.current); }, []);

  // --- click-and-drag to scroll (mouse only; touch uses native scrolling) ---
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return; // let native touch scroll handle it
    const el = scroller.current;
    if (!el) return;
    drag.current = { down: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = scroller.current;
    if (!el || !drag.current.down) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 5) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - dx;
  };
  const endDrag = () => { drag.current.down = false; };
  // Suppress the click that follows a drag so cards don't navigate mid-swipe.
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return (
    <div className="relative group/rail">
      {/* arrows (desktop) */}
      <button
        type="button"
        onClick={() => nudge(-1)}
        disabled={!canLeft}
        aria-label="Previous"
        className={`hidden md:grid place-items-center absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-paper border-2 border-ink shadow-[3px_3px_0_rgba(0,0,0,0.15)] transition-opacity hover:bg-ink hover:text-paper ${canLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => nudge(1)}
        disabled={!canRight}
        aria-label="Next"
        className={`hidden md:grid place-items-center absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-paper border-2 border-ink shadow-[3px_3px_0_rgba(0,0,0,0.15)] transition-opacity hover:bg-ink hover:text-paper ${canRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div
        ref={scroller}
        onScroll={updateArrows}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
        className="flex gap-4 lg:gap-6 overflow-x-auto px-4 lg:px-8 pb-2 select-none cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {products.map((p: any, i: number) => (
          <div key={p.id ?? i} className="shrink-0 w-[230px] sm:w-[260px]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
