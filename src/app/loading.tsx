import { PostSkeletonList } from "./_components/PostSkeleton";

export default function Loading() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center pt-10">
      <div className="mb-8 flex items-center justify-center">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-ping rounded-full bg-blue-500 opacity-20"></div>
          <div className="absolute inset-0 animate-pulse rounded-full bg-blue-500 opacity-40"></div>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="absolute inset-0 h-12 w-12 animate-bounce fill-white"
          >
            <g>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </g>
          </svg>
        </div>
      </div>
      <div className="w-full max-w-2xl">
        <PostSkeletonList />
      </div>
    </div>
  );
}
