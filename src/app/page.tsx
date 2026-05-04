import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { HomeTimeline } from "./_components/HomeTimeline";

export const dynamic = "force-dynamic";
export default async function Home() {
  const session = await auth();
  void api.post.getAll.prefetch({ tab: "for-you" });

  return (
    <HydrateClient>
      <div className="flex flex-col">
        <HomeTimeline isSignedIn={Boolean(session)} />
      </div>
    </HydrateClient>
  );
}
