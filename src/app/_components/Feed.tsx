"use client";

import { api } from "~/trpc/react";
import { PostItem, type PostWithUser } from "./PostItem";
import {
  postContainsMutedKeyword,
  useMutedKeywords,
} from "~/app/settings/MutedKeywords";

const isPostWithUser = (value: unknown): value is PostWithUser => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PostWithUser>;
  return (
    typeof candidate.id === "number" &&
    typeof candidate.createdBy === "object" &&
    candidate.createdBy !== null &&
    typeof candidate._count === "object" &&
    candidate._count !== null
  );
};

export function Feed({ tab }: { tab: "for-you" | "following" }) {
  const mutedKeywords = useMutedKeywords();
  const queryResult = api.post.getAll.useSuspenseQuery({
    tab,
  });
  const rawPosts: unknown = queryResult[0];
  const posts = Array.isArray(rawPosts) ? rawPosts.filter(isPostWithUser) : [];
  const visiblePosts = posts.filter(
    (post) => !postContainsMutedKeyword(post, mutedKeywords),
  );

  return (
    <div className="flex flex-col">
      {visiblePosts.map((post, index) => (
        <PostItem key={post.id ?? index} post={post} />
      ))}
    </div>
  );
}
