export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className="aspect-square w-full animate-pulse bg-[#F7F3EA] dark:bg-muted" />
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted/80" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted/70" />
        <div className="mt-auto h-10 w-full animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
