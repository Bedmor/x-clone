import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { CreatePost } from "./_components/CreatePost";
import { Feed } from "./_components/Feed";
import { Suspense } from "react";
import { PostSkeletonList } from "./_components/PostSkeleton";

export default async function Home() {
  const session = await auth();

  void api.post.getAll.prefetch();

  return (
    <HydrateClient>
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/20 bg-black/50 p-4 backdrop-blur">
          <h1 className="text-xl font-bold">Home</h1>
          <div className="font-bold md:hidden">X Clone</div>
        </div>
        {session && <CreatePost />}
        <Suspense fallback={<PostSkeletonList />}>
          <Feed />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
