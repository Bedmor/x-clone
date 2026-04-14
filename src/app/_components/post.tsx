"use client";

import { useState } from "react";

import { api } from "~/trpc/react";

export function LatestPost() {
  const [latestPost] = api.post.getLatest.useSuspenseQuery();

  const utils = api.useUtils();
  const [content, setContent] = useState("");
  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
      setContent("");
    },
  });

  return (
    <div className="w-full max-w-xs">
      {latestPost ? (
        <p className="truncate">En son gönderiniz: {latestPost.content}</p>
      ) : (
        <p>Henüz gönderiniz yok.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createPost.mutate({ content });
        }}
        className="flex flex-col gap-2"
      >
        <input
          type="text"
          placeholder="Neler oluyor?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-full bg-white/10 px-4 py-2 text-white"
        />
        <button
          type="submit"
          className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
          disabled={createPost.isPending}
        >
          {createPost.isPending ? "Gönderiliyor..." : "Gönder"}
        </button>
      </form>
    </div>
  );
}
