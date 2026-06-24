import { trpc } from "@/lib/trpc";

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

// Shown if the live feed is unavailable, so the ticker never looks broken.
const FALLBACK: Match[] = [
  { id: "f1", league: "PL", home: "Arsenal", away: "Chelsea", homeScore: 2, awayScore: 1, status: "FT", label: "FT" },
  { id: "f2", league: "LALIGA", home: "Real Madrid", away: "Barcelona", homeScore: null, awayScore: null, status: "UPCOMING", label: "Sat 21:00" },
  { id: "f3", league: "SERIE A", home: "Napoli", away: "Inter", homeScore: 1, awayScore: 1, status: "FT", label: "FT" },
  { id: "f4", league: "UCL", home: "Man City", away: "Bayern", homeScore: null, awayScore: null, status: "UPCOMING", label: "Tue 20:00" },
  { id: "f5", league: "BUNDES", home: "Dortmund", away: "Leipzig", homeScore: 3, awayScore: 2, status: "FT", label: "FT" },
];

function MatchItem({ m }: { m: Match }) {
  const hasScore = m.homeScore != null && m.awayScore != null;
  return (
    <span className="inline-flex items-center gap-2.5 px-6">
      <span className="text-signal font-bold text-[10px] tracking-[0.18em]">{m.league}</span>
      <span className="font-bold text-[13px]">{m.home}</span>
      {hasScore ? (
        <span className="mono font-bold text-[13px]">{m.homeScore}–{m.awayScore}</span>
      ) : (
        <span className="text-white/40 text-[12px] font-medium">vs</span>
      )}
      <span className="font-bold text-[13px]">{m.away}</span>
      {m.status === "LIVE" ? (
        <span className="inline-flex items-center gap-1 text-signal text-[11px] font-bold uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
          {m.label}
        </span>
      ) : (
        <span className="text-white/45 text-[11px] font-bold uppercase tracking-wide">{m.label}</span>
      )}
    </span>
  );
}

export default function MatchTicker() {
  const { data } = trpc.matches.ticker.useQuery(undefined, {
    refetchInterval: 60_000,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const matches = data && data.length > 0 ? data : FALLBACK;

  const row = (
    <span>
      {matches.map((m, i) => (
        <span key={`${m.id}-${i}`} className="inline-flex items-center">
          <MatchItem m={m} />
          <span className="text-white/20" aria-hidden>✸</span>
        </span>
      ))}
    </span>
  );

  return (
    <div className="surface-dark border-y-2 border-ink py-3 marquee marquee--slow relative">
      {/* left LIVE badge */}
      <span className="absolute left-0 top-0 bottom-0 z-10 bg-signal text-white px-4 hidden sm:flex items-center gap-2 font-bold uppercase text-[11px] tracking-widest">
        <span className="w-2 h-2 rounded-full bg-card animate-pulse" /> Scores
      </span>
      <div className="marquee__track">
        {row}
        {row}
      </div>
    </div>
  );
}
