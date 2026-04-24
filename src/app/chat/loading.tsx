export default function ChatLoading() {
  return (
    <div className="flex h-full min-h-[70vh]">
      <aside className="hidden w-80 border-r border-white/20 md:block">
        <div className="border-b border-white/20 p-4">
          <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
              <div className="space-y-2">
                <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-40 animate-pulse rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <section className="flex min-h-[70vh] flex-1 flex-col">
        <div className="border-b border-white/20 p-4">
          <div className="h-6 w-40 animate-pulse rounded bg-white/10" />
        </div>
        <div className="flex-1 space-y-4 p-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className={`h-10 animate-pulse rounded-2xl ${
                index % 2 === 0
                  ? "w-2/3 bg-white/10"
                  : "ml-auto w-1/2 bg-blue-500/20"
              }`}
            />
          ))}
        </div>
        <div className="border-t border-white/20 p-4">
          <div className="h-10 w-full animate-pulse rounded-full bg-white/10" />
        </div>
      </section>
    </div>
  );
}
