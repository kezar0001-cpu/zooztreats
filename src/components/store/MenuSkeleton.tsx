// Loading placeholder shown while products are fetched from Supabase.
export function MenuSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-3xl border border-cream-300 bg-white shadow-soft"
        >
          <div className="aspect-[4/3] w-full animate-pulse bg-cream-200" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-2/3 animate-pulse rounded bg-cream-200" />
            <div className="h-4 w-full animate-pulse rounded bg-cream-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-cream-200" />
            <div className="h-10 w-full animate-pulse rounded-full bg-cream-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
