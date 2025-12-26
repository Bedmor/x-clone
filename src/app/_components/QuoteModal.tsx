"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function QuoteModal({
  postId,
  isOpen,
  onClose,
}: {
  postId: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [content, setContent] = useState("");
  const utils = api.useUtils();
  const createQuote = api.post.create.useMutation({
    onSuccess: async () => {
      await utils.post.getAll.invalidate();
      await utils.post.getPost.invalidate({ id: postId });
      setContent("");
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createQuote.mutate({ content, repostOfId: postId });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-white/20 bg-black p-4">
        <div className="mb-4 flex justify-between">
          <h2 className="text-xl font-bold">Quote Post</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            className="mb-4 w-full resize-none border-b border-white/20 bg-transparent text-xl outline-none"
            placeholder="Add a comment..."
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createQuote.isPending || !content.trim()}
              className="rounded-full bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {createQuote.isPending ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
