// Per-page-load catalog shuffle.
//
// The product order is randomized on every refresh for variety, but stays
// STABLE within a session so infinite scroll, pagination and re-renders don't
// reshuffle mid-browse (which would duplicate/skip items). The order is derived
// from each product's id mixed with a single per-load seed, so every section
// that shows a product ranks it the same way — the whole catalog feels shuffled
// the same direction across all sections. A full page refresh re-runs this
// module and picks a new seed → a fresh order everywhere.
const SEED = Math.floor(Math.random() * 0xffffffff) >>> 0;

function rank(id: number): number {
  // Strong 32-bit integer finalizer (hash-prospector) — avalanches well so
  // consecutive ids get uncorrelated ranks and the order looks truly random.
  let x = (id ^ SEED) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x;
}

/** A new array of products shuffled consistently for this page load. */
export function shuffleProducts<T extends { id: number }>(list: T[]): T[] {
  return list.slice().sort((a, b) => rank(a.id) - rank(b.id));
}
