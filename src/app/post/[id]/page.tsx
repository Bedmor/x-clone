import { api, HydrateClient } from "~/trpc/server";
import { notFound } from "next/navigation";
import { PostItem } from "~/app/_components/PostItem";
import { CreatePost } from "~/app/_components/CreatePost";
import type { ComponentProps } from "react";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) notFound();

  const post = await api.post.getPost({ id: postId });

  if (!post) {
    notFound();
  }

  return (
    <HydrateClient>
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 border-b border-white/20 bg-black/50 p-4 backdrop-blur">
          <h1 className="text-xl font-bold">Post</h1>
        </div>

        <PostItem post={post as ComponentProps<typeof PostItem>["post"]} />

        <div className="border-b border-white/20 p-4 text-xl font-bold">
          Replies
        </div>

        <CreatePost parentId={postId} placeholder="Post your reply" />

        {post.replies.map((reply) => (
          <PostItem
            key={reply.id}
            post={reply as ComponentProps<typeof PostItem>["post"]}
          />
        ))}
      </div>
    </HydrateClient>
  );
}
