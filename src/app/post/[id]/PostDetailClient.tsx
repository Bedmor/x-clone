"use client";

import { api } from "~/trpc/react";
import { CreatePost } from "~/app/_components/CreatePost";
import { PostItem } from "~/app/_components/PostItem";
import Link from "next/link";
import type { RouterOutputs } from "~/trpc/react";

type PostDetail = NonNullable<RouterOutputs["post"]["getPost"]>;
type ThreadPost = {
  id: number;
  content: string | null;
  createdAt: Date | string;
  createdBy: {
    id: string;
    name: string | null;
    username: string | null;
  };
  parent: ThreadPost | null;
};

function ThreadCard({ post }: { post: ThreadPost }) {
  return (
    <div className="relative border-b border-white/20 px-3 pt-4 pb-2 sm:px-4">
      {/* V line connecting thread pieces */}
      <div className="absolute top-14 bottom-0 left-9 z-0 w-0.5 bg-gray-800"></div>

      <div className="relative z-10 flex gap-3">
        <Link href={`/profile/${post.createdBy.id}`} className="shrink-0">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-800 bg-gray-600">
            <span className="sr-only">{post.createdBy.name}</span>
          </div>
        </Link>
        <div className="min-w-0 flex-1 pb-4">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1 overflow-hidden text-sm">
            <Link
              href={`/profile/${post.createdBy.id}`}
              className="max-w-full truncate font-semibold text-white hover:underline"
            >
              {post.createdBy.name ??
                post.createdBy.username ??
                post.createdBy.id}
            </Link>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500">
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
          <Link
            href={`/post/${post.id}`}
            className="mt-1 block text-[15px] leading-normal whitespace-pre-wrap text-white"
          >
            {post.content}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ThreadTrail({ post }: { post: PostDetail }) {
  if (!post.parent) return null;

  const ancestors: ThreadPost[] = [];
  let current: ThreadPost | null = post.parent;

  while (current) {
    ancestors.unshift(current);
    current = current.parent ?? null;
  }

  if (ancestors.length === 0) return null;

  return (
    <div className="border-b border-white/20">
      <div className="px-3 py-3 text-sm font-semibold text-gray-400 sm:px-4">
        Konuşma
      </div>
      {ancestors.map((ancestor) => (
        <ThreadCard key={ancestor.id} post={ancestor} />
      ))}
    </div>
  );
}

export function PostDetailClient({
  postId,
  initialData,
}: {
  postId: number;
  initialData: PostDetail;
}) {
  const { data: post } = api.post.getPost.useQuery(
    { id: postId },
    {
      initialData,
    },
  );

  if (!post) return null;

  return (
    <>
      <ThreadTrail post={post} />

      <PostItem post={post} />

      <div className="border-b border-white/20 px-3 py-4 text-lg font-bold sm:px-4 sm:text-xl">
        Yanıtlar
      </div>

      <CreatePost parentId={postId} placeholder="Yanıtınızı yazın" />

      {post.replies.map((reply) => (
        <PostItem key={reply.id} post={reply} />
      ))}
    </>
  );
}
