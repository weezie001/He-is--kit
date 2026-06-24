import { trpc } from "@/lib/trpc";
import { Radio, RefreshCw } from "lucide-react";
import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import { TechLabel, Tag } from "@/components/tech";

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

function MatchTable({ title, matches, accent }: { title: string; matches: Match[]; accent?: boolean }) {
  if (matches.length === 0) return null;
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-3">
        {accent && <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />}
        <TechLabel ink>{title}</TechLabel>
        <span className="tech-label">· {matches.length}</span>
      </div>
      <div className="border border-ink overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="surface-dark tech-label !text-white/70">
              <th className="text-left py-2.5 px-4 font-bold">Comp</th>
              <th className="text-right py-2.5 px-2 font-bold">Home</th>
              <th className="text-center py-2.5 px-3 font-bold">Score</th>
              <th className="text-left py-2.5 px-2 font-bold">Away</th>
              <th className="text-right py-2.5 px-4 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(m => {
              const hasScore = m.homeScore != null && m.awayScore != null;
              const live = m.status === "LIVE";
              return (
                <tr key={m.id} className={`border-t border-ink/10 ${live ? "bg-signal/5" : ""}`}>
                  <td className="py-3 px-4"><span className="tech-label">{m.league}</span></td>
                  <td className="py-3 px-2 text-right font-bold">{m.home}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="display text-lg tabular-nums">{hasScore ? `${m.homeScore}–${m.awayScore}` : "v"}</span>
                  </td>
                  <td className="py-3 px-2 text-left font-bold">{m.away}</td>
                  <td className="py-3 px-4 text-right">
                    {live ? (
                      <span className="inline-flex items-center gap-1 text-signal text-[11px] font-bold uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" /> {m.label}
                      </span>
                    ) : (
                      <span className="tech-label">{m.label}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Livescore() {
  const { data, isFetching } = trpc.matches.ticker.useQuery(undefined, {
    refetchInterval: 45_000,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
  const matches = (data || []) as Match[];
  const live = matches.filter(m => m.status === "LIVE");
  const results = matches.filter(m => m.status === "FT");
  const fixtures = matches.filter(m => m.status === "UPCOMING");

  const { data: recommended } = trpc.matches.recommended.useQuery(undefined, { staleTime: 5 * 60_000 });

  return (
    <Layout>
      <section className="border-b border-ink">
        <div className="container py-12">
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-4 h-4 text-signal" />
            <TechLabel ink>Live Football</TechLabel>
            {live.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-signal text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-card animate-pulse" /> {live.length} live
              </span>
            )}
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1 className="display text-[clamp(2.6rem,7vw,6rem)]">Livescore</h1>
            <span className="tech-label inline-flex items-center gap-1.5 mb-2">
              <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} /> Auto-updates · 45s
            </span>
          </div>
        </div>
      </section>

      <div className="container py-12">
        {matches.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="display text-3xl mb-2">No matches right now</h2>
            <p className="text-muted-foreground font-medium">Check back on match day for live scores and fixtures.</p>
          </div>
        ) : (
          <>
            <MatchTable title="Live now" matches={live} accent />
            <MatchTable title="Results" matches={results} />
            <MatchTable title="Fixtures" matches={fixtures} />
          </>
        )}

        {/* Recommended jerseys for the teams playing today */}
        {recommended && recommended.length > 0 && (
          <section className="mt-12 pt-12 border-t border-ink">
            <TechLabel>Because they're playing</TechLabel>
            <h2 className="display text-[clamp(2.2rem,5vw,4rem)] mt-2 mb-8">Recommended for you</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {recommended.map((r: any) => (
                <div key={`${r.team}-${r.product.id}`}>
                  <div className="mb-2"><Tag variant="ink">{r.team}</Tag></div>
                  <ProductCard product={r.product} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
