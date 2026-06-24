import { trpc } from "@/lib/trpc";
import { Radio, RefreshCw } from "lucide-react";
import { TechLabel } from "@/components/tech";

type Match = {
  id: string;
  league: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "LIVE" | "FT" | "UPCOMING";
  label: string;
};

function MatchCard({ m }: { m: Match }) {
  const hasScore = m.homeScore != null && m.awayScore != null;
  const live = m.status === "LIVE";
  return (
    <div className={`border p-4 flex flex-col gap-3 transition-colors ${live ? "border-signal bg-signal/5" : "border-ink/15 bg-card hover:border-ink"}`}>
      <div className="flex items-center justify-between">
        <span className="tech-label !text-ink">{m.league}</span>
        {live ? (
          <span className="inline-flex items-center gap-1 text-signal text-[11px] font-bold uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" /> {m.label}
          </span>
        ) : (
          <span className="tech-label">{m.label}</span>
        )}
      </div>
      <div className="space-y-1.5">
        <Row name={m.home} score={m.homeScore} hasScore={hasScore} />
        <Row name={m.away} score={m.awayScore} hasScore={hasScore} />
      </div>
    </div>
  );
}

function Row({ name, score, hasScore }: { name: string; score: number | null; hasScore: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-bold text-sm truncate">{name}</span>
      <span className="display text-xl tabular-nums">{hasScore ? score : "–"}</span>
    </div>
  );
}

export default function MatchCenter() {
  const { data, isFetching } = trpc.matches.ticker.useQuery(undefined, {
    refetchInterval: 45_000,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const matches = (data || []) as Match[];
  if (matches.length === 0) return null;

  const liveCount = matches.filter(m => m.status === "LIVE").length;

  return (
    <section className="bg-paper border-t border-ink">
      <div className="container py-14 lg:py-20">
        <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-4 h-4 text-signal" />
              <TechLabel ink>Match Center</TechLabel>
              {liveCount > 0 && (
                <span className="inline-flex items-center gap-1 bg-signal text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-card animate-pulse" /> {liveCount} live
                </span>
              )}
            </div>
            <h2 className="display text-[clamp(2.2rem,5vw,4rem)]">Live football</h2>
          </div>
          <span className="tech-label inline-flex items-center gap-1.5">
            <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} /> Updates every 45s
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {matches.slice(0, 8).map(m => <MatchCard key={m.id} m={m} />)}
        </div>
      </div>
    </section>
  );
}
