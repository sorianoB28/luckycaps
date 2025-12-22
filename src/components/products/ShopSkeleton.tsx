import { Skeleton } from "@/components/ui/skeleton";

export default function ShopSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[260px_1fr] md:px-8">
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-80 w-full" />
        ))}
      </div>
    </div>
  );
}
