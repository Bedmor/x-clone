"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { PostItem } from "./PostItem";

export function Feed() {
  const [tab, setTab] = useState<"for-you" | "following">("for-you");
  const [posts] = api.post.getAll.useSuspenseQuery({ tab });

  return (
    <div className="flex flex-col">
      <div className="flex border-b border-white/20">
        <button
          onClick={() => setTab("for-you")}
          className={`flex-1 p-4 text-center font-bold transition-colors hover:bg-white/10 ${
            tab === "for-you"
              ? "border-b-4 border-blue-500 text-white"
              : "text-gray-500"
          }`}
        >
          Sana Özel
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
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </div>
  );
}
