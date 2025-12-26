"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import Link from "next/link";
import { ReplyModal } from "./ReplyModal";
import { Heart, MessageCircle, Repeat } from "lucide-react";
import { UserAvatar } from "./UserAvatar";

type PostWithUser = RouterOutputs["post"]["getAll"][number];

export function PostItem({ post }: { post: PostWithUser }) {
  const isRepost = !!post.repostOf;
  const displayPost: PostWithUser = isRepost
    ? (post.repostOf as PostWithUser)
    : post;
  const dp = displayPost as unknown as PostWithUser;

  const [isReplyOpen, setIsReplyOpen] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(dp.isLiked);
  const [likesCount, setLikesCount] = useState<number>(dp._count.likes ?? 0);
  const [isReposted, setIsReposted] = useState<boolean>(dp.isReposted ?? false);
  const [repostsCount, setRepostsCount] = useState<number>(
    dp._count.reposts ?? 0,
  );

  const utils = api.useUtils();

  const toggleLike = api.post.toggleLike.useMutation({
    onMutate: async () => {
      const wasLiked = isLiked;
      setIsLiked(!wasLiked);
      setLikesCount((prev: number) => (wasLiked ? prev - 1 : prev + 1));
    },
    onError: () => {
      setIsLiked(dp.isLiked);
      setLikesCount(dp._count.likes ?? 0);
    },
    onSettled: () => {
      void utils.post.getAll.invalidate();
      void utils.post.getPost.invalidate({ id: dp.id });
    },
  });

  const toggleRepost = api.post.toggleRepost.useMutation({
    onMutate: async () => {
      const wasReposted = isReposted;
      setIsReposted(!wasReposted);
      setRepostsCount((prev: number) => (wasReposted ? prev - 1 : prev + 1));
    },
    onError: () => {
      setIsReposted(dp.isReposted ?? false);
      setRepostsCount(dp._count.reposts ?? 0);
    },
    onSettled: () => {
      void utils.post.getAll.invalidate();
      void utils.post.getPost.invalidate({ id: displayPost.id });
    },
  });

  return (
    <>
      <div className="border-b border-white/20 p-4 hover:bg-white/5">
        {isRepost && (
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Repeat className="h-4 w-4" />
            <Link
              href={`/profile/${post.createdBy.id}`}
              className="hover:underline"
            >
              {post.createdBy.name} reposted
            </Link>
          </div>
        )}
        <div className="flex gap-3">
          <UserAvatar
            src={dp.createdBy.image}
            alt={dp.createdBy.name}
            className="h-10 w-10"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${dp.createdBy.id}`}
                className="font-bold hover:underline"
              >
                {dp.createdBy.name ?? "Unknown"}
              </Link>
              <span className="text-gray-500">
                {new Date(dp.createdAt).toLocaleDateString()}
              </span>
            </div>
            <Link
              href={`/post/${dp.id}`}
              className="mt-1 block whitespace-pre-wrap"
            >
              {dp.content?.split(/(@\w+)/g).map((part, i) => {
                if (part.startsWith("@")) {
                  const username = part.slice(1);
                  return (
                    <Link
                      key={i}
                      href={`/profile/${username}`}
                      className="text-blue-400 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {part}
                    </Link>
                  );
                }
                return part;
              })}
            </Link>
            <div className="mt-3 flex gap-4 text-gray-500">
              <button
                onClick={() => toggleLike.mutate({ postId: displayPost.id })}
                className={`flex items-center gap-1 hover:text-red-500 ${
                  isLiked ? "text-red-500" : ""
                }`}
              >
                <Heart className={isLiked ? "fill-current" : ""} />
                <span>{likesCount}</span>
              </button>
              <button
                onClick={() => setIsReplyOpen(true)}
                className="flex items-center gap-1 hover:text-blue-500"
              >
                <MessageCircle />
                <span>{dp._count.replies}</span>
              </button>
              <button
                onClick={() => toggleRepost.mutate({ postId: dp.id })}
                className={`flex items-center gap-1 hover:text-green-500 ${
                  isReposted ? "text-green-500" : ""
                }`}
              >
                <Repeat className={isReposted ? "text-green-500" : ""} />
                <span>{repostsCount}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <ReplyModal
        postId={displayPost.id}
        isOpen={isReplyOpen}
        onClose={() => setIsReplyOpen(false)}
      />
    </>
  );
}
