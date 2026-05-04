import { notFound } from "next/navigation";
import { api, HydrateClient } from "~/trpc/server";
import { PostDetailClient } from "./PostDetailClient";

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
      <div className="flex flex-col pb-24">
        <div className="sticky top-0 z-10 hidden border-b border-white/20 bg-black/50 p-4 backdrop-blur md:block">
          <h1 className="text-xl font-bold">Gönderi</h1>
        </div>

        <PostDetailClient postId={postId} initialData={post} />
      </div>
    </HydrateClient>
  );
}
