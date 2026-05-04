"use client";

import { api } from "~/trpc/react";
import { CreatePost } from "~/app/_components/CreatePost";
import { PostItem, type PostWithUser } from "~/app/_components/PostItem";
import Link from "next/link";

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
    <div className="relative border-b border-white/20 px-4 pt-4 pb-2">
      {/* V line connecting thread pieces */}
      <div className="absolute top-14 bottom-0 left-[2.25rem] z-0 w-0.5 bg-gray-800"></div>

      <div className="relative z-10 flex gap-3">
        <Link href={`/profile/${post.createdBy.id}`} className="shrink-0">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-800 bg-gray-600">
            <span className="sr-only">{post.createdBy.name}</span>
          </div>
        </Link>
        <div className="flex-1 pb-4">
          <div className="flex items-center gap-1 overflow-hidden text-sm whitespace-nowrap">
            <Link
              href={`/profile/${post.createdBy.id}`}
              className="truncate font-semibold text-white hover:underline"
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

function ThreadTrail({ post }: { post: any }) {
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
      <div className="p-4 text-sm font-semibold text-gray-400">Konuşma</div>
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
  initialData: any;
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

      <PostItem post={post as any} />

      <div className="border-b border-white/20 p-4 text-xl font-bold">
        Yanıtlar
      </div>

      <CreatePost parentId={postId} placeholder="Yanıtınızı yazın" />

      {post.replies?.map((reply: any) => (
        <PostItem key={reply.id} post={reply as any} />
      ))}
    </>
  );
}
