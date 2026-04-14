"use client";

import { Suspense, useState } from "react";

import { CreatePost } from "./CreatePost";
import { Feed } from "./Feed";
import { PostSkeletonList } from "./PostSkeleton";
import { SuggestedUsers } from "./SuggestedUsers";

export function HomeTimeline({ isSignedIn }: { isSignedIn: boolean }) {
  const [tab, setTab] = useState<"for-you" | "following">("for-you");

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6 px-3 lg:px-5">
      <div className="min-w-0 flex-1 lg:max-w-2xl">
        <div className="flex border-b border-white/20">
          <button
            onClick={() => setTab("for-you")}
            className={`flex-1 p-4 text-center font-bold transition-colors hover:bg-white/10 ${
              tab === "for-you"
                ? "border-b-4 border-blue-500 text-white"
                : "text-gray-500"
            }`}
          >
            Sana Ozel
          </button>
          <button
            onClick={() => setTab("following")}
            className={`flex-1 p-4 text-center font-bold transition-colors hover:bg-white/10 ${
              tab === "following"
                ? "border-b-4 border-blue-500 text-white"
                : "text-gray-500"
            }`}
          >
            Takip Edilenler
          </button>
        </div>

        {isSignedIn && <CreatePost />}

        <Suspense fallback={<PostSkeletonList />}>
          <Feed tab={tab} />
        </Suspense>
      </div>

      {isSignedIn && (
        <aside className="hidden w-80 pt-4 lg:block">
          <SuggestedUsers limit={4} />
        </aside>
      )}
    </div>
  );
}
