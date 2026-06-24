import { trpc } from "@/lib/trpc";

// Categories are free-form on products and can change over time, so the UI
// derives them from live data instead of a hard-coded list.

/** "club_jerseys" -> "Club Jerseys". Safe for any slug. */
export function labelizeCategory(slug: string | null | undefined): string {
  if (!slug) return "Item";
  return slug.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export type Category = { value: string; label: string; count: number };

/** Live categories present in the catalog, with counts, alphabetical. */
export function useCategories(): { categories: Category[]; isLoading: boolean } {
  const { data, isLoading } = trpc.products.categories.useQuery(undefined, { staleTime: 60_000 });
  const categories = (data || []).map(c => ({ value: c.value, label: labelizeCategory(c.value), count: c.count }));
  return { categories, isLoading };
}
