export default function ProfileLoading() {
  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 border-b border-white/20 bg-black/50 p-4 backdrop-blur">
        <div className="h-6 w-40 animate-pulse rounded bg-white/10" />
        <div className="mt-2 h-4 w-24 animate-pulse rounded bg-white/5" />
      </div>

      <div className="h-48 animate-pulse bg-white/5" />

      <div className="p-4">
        <div className="relative -mt-20 flex items-start justify-between">
          <div className="h-32 w-32 animate-pulse rounded-full border-4 border-black bg-white/10" />
          <div className="h-9 w-28 animate-pulse rounded-full bg-white/10" />
        </div>

        <div className="mt-4 h-8 w-48 animate-pulse rounded bg-white/10" />
        <div className="mt-2 h-5 w-36 animate-pulse rounded bg-white/5" />
        <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/5" />
        <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-white/5" />

        <div className="mt-6 flex gap-4">
          <div className="h-4 w-20 animate-pulse rounded bg-white/5" />
          <div className="h-4 w-20 animate-pulse rounded bg-white/5" />
        </div>
      </div>

      <div className="border-b border-white/20">
        <div className="flex">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex-1 p-4">
              <div className="mx-auto h-5 w-20 animate-pulse rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-white/10 p-4">
            <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/5" />
            <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
