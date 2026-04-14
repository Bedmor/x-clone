import Link from "next/link";

import { auth } from "~/server/auth";
import { HydrateClient, api } from "~/trpc/server";

import { BookmarksClient } from "./BookmarksClient";

export default async function BookmarksPage() {
  const session = await auth();

  if (!session) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold">Bookmarks</h1>
          <p className="mt-2 text-sm text-gray-400">
            Sign in to save posts and view them later.
          </p>
          <Link
            href="/signin"
            className="mt-4 inline-flex rounded-full bg-blue-500 px-4 py-2 font-semibold hover:bg-blue-600"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  void api.post.getBookmarks.prefetch();

  return (
    <HydrateClient>
      <BookmarksClient />
    </HydrateClient>
  );
}
