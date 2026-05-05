import { notFound } from "next/navigation";
import { api, HydrateClient } from "~/trpc/server";
import { PostDetailClient } from "./PostDetailClient";
import { SuggestedUsers } from "~/app/_components/SuggestedUsers";
import { auth } from "~/server/auth";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = parseInt(id);
  if (Number.isNaN(postId)) notFound();

  const session = await auth();
  const post = await api.post.getPost({ id: postId });

  if (!post) {
    notFound();
  }

  return (
    <HydrateClient>
      <div className="mx-auto flex w-full max-w-6xl gap-4 px-3 lg:gap-6 lg:px-5">
        <div className="min-w-0 flex-1 pb-24 lg:max-w-2xl">
          <div className="sticky top-0 z-10 hidden border-b border-white/20 bg-black/50 p-4 backdrop-blur md:block">
            <h1 className="text-xl font-bold">Gönderi</h1>
          </div>

          <PostDetailClient postId={postId} initialData={post} />
        </div>

        {session && (
          <aside className="hidden w-80 pt-4 lg:block">
            <SuggestedUsers limit={4} />
          </aside>
        )}
      </div>
    </HydrateClient>
  );
}
