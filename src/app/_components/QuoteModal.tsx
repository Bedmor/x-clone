"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

import { useSession } from "next-auth/react";
import {
  buildOptimisticPost,
  prependOptimisticPost,
  type FeedPost,
} from "./optimisticPost";

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
  const { data: session } = useSession();
  const utils = api.useUtils();
  const createQuote = api.post.create.useMutation({
    onMutate: async (newQuote) => {
      await utils.post.getAll.cancel();
      await utils.post.getPost.cancel({ id: postId });

      const prevForYou = utils.post.getAll.getData({ tab: "for-you" });
      const prevFollowing = utils.post.getAll.getData({ tab: "following" });
      const prevPost = utils.post.getPost.getData({ id: postId });

      const optimisticAuthor: FeedPost["createdBy"] = {
        id: session?.user?.id ?? "temp",
        name: session?.user?.name ?? "User",
        username: session?.user?.email ?? "user",
        image: session?.user?.image ?? null,
      };

      const optimisticQuote = buildOptimisticPost({
        id: -Date.now(),
        content: newQuote.content ?? null,
        mediaUrls: [],
        parentId: null,
        author: optimisticAuthor,
        repostOf: prevPost ?? null,
      });

      utils.post.getAll.setData({ tab: "for-you" }, (posts) =>
        prependOptimisticPost(posts, optimisticQuote),
      );
      utils.post.getAll.setData({ tab: "following" }, (posts) =>
        prependOptimisticPost(posts, optimisticQuote),
      );

      setContent("");
      onClose();

      return { prevForYou, prevFollowing, prevPost };
    },
    onError: (_error, newQuote, context) => {
      if (context?.prevForYou)
        utils.post.getAll.setData({ tab: "for-you" }, context.prevForYou);
      if (context?.prevFollowing)
        utils.post.getAll.setData({ tab: "following" }, context.prevFollowing);
      setContent(newQuote.content ?? "");
    },
    onSettled: async () => {
      await utils.post.getAll.invalidate();
      await utils.post.getPost.invalidate({ id: postId });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createQuote.mutate({ content, repostOfId: postId });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end bg-black/50 p-4 backdrop-blur-sm sm:justify-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/20 bg-black p-4 sm:rounded-xl">
        <div className="mb-4 flex justify-between">
          <h2 className="text-xl font-bold">Alıntıla</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            className="mb-4 w-full resize-none border-b border-white/20 bg-transparent text-xl outline-none"
            placeholder="Bir yorum ekleyin..."
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
              {createQuote.isPending ? (
                <div className="flex h-5 items-center justify-center">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              ) : (
                "Paylaş"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
