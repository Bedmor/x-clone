"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { PostItem } from "~/app/_components/PostItem";
import { PostSkeletonList } from "~/app/_components/PostSkeleton";

export function ProfileFeed({ userId }: { userId: string }) {
  const [tab, setTab] = useState<"posts" | "replies" | "likes">("posts");

  const postsQuery = api.user.getPosts.useQuery(
    { userId },
    { enabled: tab === "posts" },
  );
  const repliesQuery = api.user.getReplies.useQuery(
    { userId },
    { enabled: tab === "replies" },
  );
  const likesQuery = api.user.getLikes.useQuery(
    { userId },
    { enabled: tab === "likes" },
  );

  const posts =
    tab === "posts"
      ? postsQuery.data
      : tab === "replies"
        ? repliesQuery.data
        : likesQuery.data;

  const isLoading =
    tab === "posts"
      ? postsQuery.isLoading
      : tab === "replies"
        ? repliesQuery.isLoading
        : likesQuery.isLoading;

  return (
    <div>
      <div className="border-b border-white/20">
        <div className="flex">
          <button
            onClick={() => setTab("posts")}
            className={`flex-1 p-4 text-center font-bold hover:bg-white/10 ${
              tab === "posts"
                ? "border-b-4 border-blue-500 text-white"
                : "text-gray-500"
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setTab("replies")}
            className={`flex-1 p-4 text-center font-bold hover:bg-white/10 ${
              tab === "replies"
                ? "border-b-4 border-blue-500 text-white"
                : "text-gray-500"
            }`}
          >
            Replies
          </button>
          <button
            onClick={() => setTab("likes")}
            className={`flex-1 p-4 text-center font-bold hover:bg-white/10 ${
              tab === "likes"
                ? "border-b-4 border-blue-500 text-white"
                : "text-gray-500"
            }`}
          >
            Likes
          </button>
        </div>
      </div>
      {isLoading ? (
        <PostSkeletonList />
      ) : posts?.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No items to display.
        </div>
      ) : (
        posts?.map((post) => <PostItem key={post.id} post={post} />)
      )}
    </div>
  );
}
