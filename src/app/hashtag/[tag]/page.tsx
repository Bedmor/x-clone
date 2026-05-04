import Link from "next/link";
import { notFound } from "next/navigation";

import type { RouterOutputs } from "~/trpc/react";
import { HydrateClient, api } from "~/trpc/server";
import { PostItem } from "~/app/_components/PostItem";

function getReadableTag(tag: string | string[] | undefined) {
  if (!tag) return null;

  const value = Array.isArray(tag) ? tag[0] : tag;
  return value ? value.replace(/^#/, "").trim() : null;
}

export default async function HashtagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const resolvedParams = await params;
  const tag = getReadableTag(resolvedParams.tag);

  if (!tag) notFound();

  const posts: RouterOutputs["post"]["getHashtagFeed"] =
    await api.post.getHashtagFeed({ tag });

  return (
    <HydrateClient>
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 hidden border-b border-white/20 bg-black/50 p-4 backdrop-blur md:block">
          <Link
            href="/explore"
            className="text-sm text-gray-400 hover:text-white"
          >
            Keşfete geri dön
          </Link>
          <h1 className="mt-1 text-2xl font-bold">#{tag}</h1>
          <p className="text-sm text-gray-400">Bu etiketi içeren gönderiler</p>
        </div>

        <div className="overflow-hidden rounded-b-3xl border-x border-b border-white/10">
          {posts.length > 0 ? (
            posts.map((post) => <PostItem key={post.id} post={post} />)
          ) : (
            <div className="p-6 text-sm text-gray-400">
              #{tag} için henüz gönderi yok. İlk sen paylaş.
            </div>
          )}
        </div>
      </div>
    </HydrateClient>
  );
}
