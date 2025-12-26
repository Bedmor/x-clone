"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function CreatePost({
  parentId,
  placeholder = "What is happening?!",
}: {
  parentId?: number;
  placeholder?: string;
}) {
  const [content, setContent] = useState("");
  const utils = api.useUtils();
  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      await utils.post.getAll.invalidate();
      if (parentId) {
        await utils.post.getPost.invalidate({ id: parentId });
      }
      setContent("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createPost.mutate({ content, parentId });
  };

  return (
    <form onSubmit={handleSubmit} className="border-b border-white/20 p-4">
      <textarea
        className="w-full resize-none bg-transparent text-xl outline-none"
        placeholder={placeholder}
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={createPost.isPending || !content.trim()}
          className="rounded-full bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {createPost.isPending ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
