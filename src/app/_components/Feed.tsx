"use client";

import { api } from "~/trpc/react";
import { PostItem } from "./PostItem";

export function Feed() {
  const [posts] = api.post.getAll.useSuspenseQuery();

  return (
    <div className="flex flex-col">
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </div>
  );
}
