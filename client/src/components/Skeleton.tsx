export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Matches the ProductCard layout for grid loading states. */
export function ProductCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="h-4 w-1/3 mt-3" />
      <Skeleton className="h-4 w-3/4 mt-2" />
      <Skeleton className="h-9 w-full mt-3" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}
