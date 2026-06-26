// Live-ish football scores + fixtures for the homepage ticker.
// Source: TheSportsDB free tier (test key "3", no signup). It returns recent
// final results and upcoming fixtures across the top leagues. Results are cached
// in-memory for 5 minutes so we don't hammer the API on every page load.

const LEAGUES: { id: string; code: string }[] = [
  { id: "4328", code: "PL" },        // English Premier League
  { id: "4335", code: "LALIGA" },    // La Liga
  { id: "4332", code: "SERIE A" },   // Serie A
  { id: "4331", code: "BUNDES" },    // Bundesliga
  { id: "4334", code: "LIGUE 1" },   // Ligue 1
  { id: "4480", code: "UCL" },       // UEFA Champions League
];

import { ENV } from "./env";
import * as db from "../db";

const BASE = "https://www.thesportsdb.com/api/v1/json/3";
const TTL_MS = 5 * 60 * 1000;

// football-data.org competition code -> ticker label
const FD_COMP: Record<string, string> = {
  PL: "PL", PD: "LALIGA", SA: "SERIE A", BL1: "BUNDES", FL1: "LIGUE 1",
  CL: "UCL", EC: "EURO", WC: "WORLD CUP", ELC: "CHAMP", DED: "EREDIV", PPL: "PRIMEIRA",
};

export type Match = {
  id: string;
  league: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "LIVE" | "FT" | "UPCOMING";
  label: string; // "FT", "LIVE 67'", or "Sat 21:00"
};

let cache: { ts: number; data: Match[] } | null = null;

async function fetchJson(url: string, headers?: Record<string, string>): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function classify(e: any): { status: Match["status"]; label: string } {
  const s = String(e.strStatus || "").toLowerCase();
  const progress = String(e.strProgress || "").trim();
  const hasScore = e.intHomeScore != null && e.intAwayScore != null;

  if (s.includes("finish") || s === "ft" || s === "aet" || s === "pen") {
    return { status: "FT", label: "FT" };
  }
  if (s.includes("1h") || s.includes("2h") || s.includes("ht") || s.includes("live") || /\d/.test(progress)) {
    return { status: "LIVE", label: progress ? `LIVE ${progress}` : "LIVE" };
  }
  if (hasScore) return { status: "FT", label: "FT" };

  // Upcoming — format a short date/time label
  let label = "Upcoming";
  if (e.dateEvent) {
    const d = new Date(`${e.dateEvent}T${e.strTime || "00:00:00"}Z`);
    if (!isNaN(d.getTime())) {
      const day = d.toLocaleDateString("en-GB", { weekday: "short" });
      const time = (e.strTime || "").slice(0, 5);
      label = time ? `${day} ${time}` : day;
    }
  }
  return { status: "UPCOMING", label };
}

function toMatch(e: any, code: string): Match | null {
  if (!e?.strHomeTeam || !e?.strAwayTeam) return null;
  const { status, label } = classify(e);
  return {
    id: String(e.idEvent || `${e.strHomeTeam}-${e.strAwayTeam}`),
    league: code,
    home: e.strHomeTeam.replace(/\s*FC$/i, ""),
    away: e.strAwayTeam.replace(/\s*FC$/i, ""),
    homeScore: e.intHomeScore != null ? Number(e.intHomeScore) : null,
    awayScore: e.intAwayScore != null ? Number(e.intAwayScore) : null,
    status,
    label,
  };
}

// Free fallback: recent results + upcoming fixtures from TheSportsDB.
async function fetchTheSportsDb(): Promise<Match[]> {
  const calls = LEAGUES.flatMap(l => [
    fetchJson(`${BASE}/eventspastleague.php?id=${l.id}`).then(d => ({ code: l.code, events: d?.events || [] })),
    fetchJson(`${BASE}/eventsnextleague.php?id=${l.id}`).then(d => ({ code: l.code, events: d?.events || [] })),
  ]);
  const results = await Promise.allSettled(calls);
  const seen = new Set<string>();
  const live: Match[] = [], ft: Match[] = [], upcoming: Match[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const e of r.value.events.slice(0, 4)) {
      const m = toMatch(e, r.value.code);
      if (!m || seen.has(m.id)) continue;
      seen.add(m.id);
      (m.status === "LIVE" ? live : m.status === "FT" ? ft : upcoming).push(m);
    }
  }
  return [...live, ...ft, ...upcoming].slice(0, 20);
}

// Keyed provider: real in-play live scores from football-data.org (today's
// matches incl. IN_PLAY). Returns [] when no key is set so we fall back.
async function fetchFootballData(): Promise<Match[]> {
  if (!ENV.livescoreApiKey) return [];
  const d = await fetchJson("https://api.football-data.org/v4/matches", { "X-Auth-Token": ENV.livescoreApiKey });
  const matches: any[] = d?.matches || [];
  const live: Match[] = [], ft: Match[] = [], upcoming: Match[] = [];
  for (const m of matches) {
    const home = m.homeTeam?.shortName || m.homeTeam?.name;
    const away = m.awayTeam?.shortName || m.awayTeam?.name;
    if (!home || !away) continue;
    const code = FD_COMP[m.competition?.code] || String(m.competition?.code || "FOOTBALL").slice(0, 7).toUpperCase();
    const hs = m.score?.fullTime?.home ?? null;
    const as = m.score?.fullTime?.away ?? null;
    const st = String(m.status || "").toUpperCase();
    let status: Match["status"], label: string;
    if (st === "IN_PLAY" || st === "PAUSED") {
      status = "LIVE";
      label = m.minute ? `LIVE ${m.minute}'` : "LIVE";
    } else if (st === "FINISHED" || st === "AWARDED") {
      status = "FT"; label = "FT";
    } else {
      status = "UPCOMING";
      const dt = m.utcDate ? new Date(m.utcDate) : null;
      label = dt && !isNaN(dt.getTime())
        ? `${dt.toLocaleDateString("en-GB", { weekday: "short" })} ${dt.toISOString().slice(11, 16)}`
        : "Upcoming";
    }
    const match: Match = {
      id: String(m.id), league: code,
      home: home.replace(/\s*FC$/i, ""), away: away.replace(/\s*FC$/i, ""),
      homeScore: hs, awayScore: as, status, label,
    };
    (status === "LIVE" ? live : status === "FT" ? ft : upcoming).push(match);
  }
  return [...live, ...ft, ...upcoming].slice(0, 24);
}

let cacheTtl = TTL_MS;

export async function getMatchTicker(): Promise<Match[]> {
  if (cache && Date.now() - cache.ts < cacheTtl) return cache.data;

  let data: Match[] = [];
  if (ENV.livescoreApiKey) data = await fetchFootballData();
  if (data.length === 0) data = await fetchTheSportsDb();

  if (data.length > 0) {
    // Refresh more aggressively when something is live.
    cacheTtl = data.some(m => m.status === "LIVE") ? 45_000 : TTL_MS;
    cache = { ts: Date.now(), data };
    // Persist finished matches so the Livescore "History" survives ~12h even
    // after the live API stops returning them.
    const finished = data.filter(m => m.status === "FT");
    if (finished.length) { try { await db.upsertFinishedMatches(finished); } catch { /* non-fatal */ } }
  }
  return data.length > 0 ? data : cache?.data ?? [];
}
