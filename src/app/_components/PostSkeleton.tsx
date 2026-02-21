export function PostSkeleton() {
  return (
    <div className="animate-pulse border-b border-white/20 p-4 transition-all duration-300">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 rounded-md bg-white/10" />
            <div className="h-4 w-16 rounded-md bg-white/5" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full rounded-md bg-white/10" />
            <div className="h-4 w-5/6 rounded-md bg-white/10" />
            <div className="h-4 w-2/3 rounded-md bg-white/10" />
          </div>
          <div className="mt-4 flex gap-6">
            <div className="h-5 w-12 rounded-md bg-white/10" />
            <div className="h-5 w-12 rounded-md bg-white/10" />
            <div className="h-5 w-12 rounded-md bg-white/10" />
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
