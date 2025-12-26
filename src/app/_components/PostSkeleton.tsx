export function PostSkeleton() {
  return (
    <div className="animate-pulse border-b border-white/20 p-4">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 rounded bg-white/10" />
            <div className="h-4 w-16 rounded bg-white/10" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-white/10" />
            <div className="h-4 w-3/4 rounded bg-white/10" />
          </div>
          <div className="mt-3 flex gap-4">
            <div className="h-4 w-12 rounded bg-white/10" />
            <div className="h-4 w-12 rounded bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostSkeletonList() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 5 }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}
