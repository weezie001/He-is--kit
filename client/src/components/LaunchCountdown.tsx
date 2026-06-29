import { useEffect, useState } from "react";
import { LAUNCH_AT_MS } from "@shared/const";
import { Clock } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");

// Compact launch countdown — stays visible (e.g. in the hero) after the overlay
// is closed. Disappears once the launch moment passes.
export default function LaunchCountdown({ className = "" }: { className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = LAUNCH_AT_MS - now;
  if (remaining <= 0) return null;

  const sec = Math.floor(remaining / 1000);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;

  return (
    <div className={`inline-flex items-center gap-2 border-2 border-ink bg-paper px-3 py-1.5 ${className}`}>
      <Clock className="w-3.5 h-3.5 text-signal shrink-0" />
      <span className="tech-label">Launch in</span>
      <span className="display text-lg tabular-nums leading-none">{pad(h)}:{pad(m)}:{pad(s)}</span>
    </div>
  );
}
