"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { PostItem } from "~/app/_components/PostItem";
import { PostSkeletonList } from "~/app/_components/PostSkeleton";
import { type inferRouterOutputs } from "@trpc/server";
import { type AppRouter } from "~/server/api/root";
import { Pin } from "lucide-react";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Post = RouterOutputs["user"]["getPosts"][number];

export function ProfileFeed({
  userId,
  pinnedPost,
}: {
  userId: string;
  pinnedPost?: Post | null;
}) {
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
      ) : (
        <>
          {tab === "posts" && pinnedPost && (
            <div className="border-b border-white/20">
              <div className="flex items-center gap-2 px-4 pt-2 text-xs font-bold text-gray-500">
                <Pin size={12} className="fill-gray-500" />
                <span>Pinned Post</span>
              </div>
              <PostItem post={pinnedPost} />
            </div>
          )}
          {posts?.length === 0 && !pinnedPost ? (
            <div className="p-4 text-center text-gray-500">
              No items to display.
            </div>
          ) : (
            posts
              ?.filter((p) => p.id !== pinnedPost?.id)
              .map((post) => <PostItem key={post.id} post={post} />)
          )}
        </>
      )}
    </div>
  );
}
