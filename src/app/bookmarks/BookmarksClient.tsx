"use client";

import { Bookmark } from "lucide-react";

import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import { PostItem } from "../_components/PostItem";
import {
  postContainsMutedKeyword,
  useMutedKeywords,
} from "~/app/settings/MutedKeywords";

export function BookmarksClient() {
  const bookmarksQuery = api.post.getBookmarks.useQuery();
  const posts: RouterOutputs["post"]["getBookmarks"] =
    bookmarksQuery.data ?? [];
  const isLoading = bookmarksQuery.isLoading;
  const mutedKeywords = useMutedKeywords();
  const visiblePosts = posts.filter(
    (post) => !postContainsMutedKeyword(post, mutedKeywords),
  );

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 hidden border-b border-white/20 bg-black/50 p-4 backdrop-blur md:block">
        <div className="flex items-center gap-2 text-sm tracking-[0.2em] text-gray-400 uppercase">
          <Bookmark className="h-4 w-4" />
          Kaydedilenler
        </div>
        <h1 className="mt-1 text-2xl font-bold">Yer İşaretleri</h1>
      </div>

      <div className="overflow-hidden rounded-b-3xl border-x border-b border-white/10">
        {isLoading ? (
          <div className="p-4 text-sm text-gray-400">
            Yer işaretleri yükleniyor...
          </div>
        ) : visiblePosts.length > 0 ? (
          visiblePosts.map((post) => <PostItem key={post.id} post={post} />)
        ) : (
          <div className="p-6 text-sm text-gray-400">
            Buraya gönderi kaydedin, sonra okuyun.
          </div>
        )}
      </div>
    </div>
  );
}
