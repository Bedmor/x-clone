import { HydrateClient, api } from "~/trpc/server";

import { ExploreClient } from "./ExploreClient";

export default async function ExplorePage() {
  void api.post.getTrendingTags.prefetch({ limit: 8 });

  return (
    <HydrateClient>
      <ExploreClient />
    </HydrateClient>
  );
}
