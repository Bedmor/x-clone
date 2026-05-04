import Link from "next/link";
import { notFound } from "next/navigation";
import type { inferRouterOutputs } from "@trpc/server";

import { CreatePost } from "~/app/_components/CreatePost";
import { PostItem } from "~/app/_components/PostItem";
import type { AppRouter } from "~/server/api/root";
import { api, HydrateClient } from "~/trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PostType = NonNullable<RouterOutputs["post"]["getPost"]>;
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
    <div className="border-b border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link
          href={`/profile/${post.createdBy.id}`}
          className="font-semibold text-white hover:underline"
        >
          {post.createdBy.name ?? post.createdBy.username ?? post.createdBy.id}
        </Link>
        <span>·</span>
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>
      <Link
        href={`/post/${post.id}`}
        className="mt-2 block text-sm whitespace-pre-wrap text-gray-300 hover:underline"
      >
        {post.content}
      </Link>
    </div>
  );
}

function ThreadTrail({ post }: { post: PostType }) {
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

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = parseInt(id);
  if (Number.isNaN(postId)) notFound();

  const post = await api.post.getPost({ id: postId });

  if (!post) {
    notFound();
  }

  return (
    <HydrateClient>
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 hidden border-b border-white/20 bg-black/50 p-4 backdrop-blur md:block">
          <h1 className="text-xl font-bold">Gönderi</h1>
        </div>

        <ThreadTrail post={post} />

        <PostItem post={post} />

        <div className="border-b border-white/20 p-4 text-xl font-bold">
          Yanıtlar
        </div>

        <CreatePost parentId={postId} placeholder="Yanıtınızı yazın" />

        {post.replies.map((reply) => (
          <PostItem key={reply.id} post={reply} />
        ))}
      </div>
    </HydrateClient>
  );
}
