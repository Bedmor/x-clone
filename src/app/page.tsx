import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { Logo } from "./_components/Logo";
import { HomeTimeline } from "./_components/HomeTimeline";

export default async function Home() {
  const session = await auth();

  void api.post.getAll.prefetch({ tab: "for-you" });

  return (
    <HydrateClient>
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/20 bg-black/50 p-4 backdrop-blur">
          <h1 className="text-xl font-bold">Home</h1>
          <div className="md:hidden">
            <Logo className="h-6 w-6 text-white" />
          </div>
        </div>
        <HomeTimeline isSignedIn={Boolean(session)} />
      </div>
    </HydrateClient>
  );
}
