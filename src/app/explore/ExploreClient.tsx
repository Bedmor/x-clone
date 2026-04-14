"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  TrendingUp,
  Hash,
  Users,
  Newspaper,
  Sparkles,
} from "lucide-react";

import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import { PostItem } from "../_components/PostItem";
import {
  postContainsMutedKeyword,
  useMutedKeywords,
} from "~/app/settings/MutedKeywords";

export function ExploreClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [mode, setMode] = useState<"top" | "people" | "posts" | "tags">(
    (searchParams.get("type") as "top" | "people" | "posts" | "tags" | null) ??
      "top",
  );

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setMode(
      (searchParams.get("type") as
        | "top"
        | "people"
        | "posts"
        | "tags"
        | null) ?? "top",
    );
  }, [searchParams]);

  const trimmedQuery = query.trim();
  const mutedKeywords = useMutedKeywords();
  const shouldSearch = trimmedQuery.length > 0;
  const showPeople = mode === "top" || mode === "people";
  const showPosts = mode === "top" || mode === "posts";
  const showTags = mode === "top" || mode === "tags";

  const { data: users = [], isLoading: usersLoading } =
    api.user.searchUsers.useQuery(
      { query: trimmedQuery },
      { enabled: shouldSearch && showPeople },
    );
  const postsQuery = api.post.searchPosts.useQuery(
    { query: trimmedQuery },
    { enabled: shouldSearch && showPosts },
  );
  const posts: RouterOutputs["post"]["searchPosts"] = postsQuery.data ?? [];
  const postsLoading = postsQuery.isLoading;
  const { data: tags = [], isLoading: tagsLoading } =
    api.post.searchTags.useQuery(
      { query: trimmedQuery, limit: 12 },
      { enabled: shouldSearch && showTags },
    );
  const { data: trendingTags = [], isLoading: trendingLoading } =
    api.post.getTrendingTags.useQuery(
      { limit: 8 },
      { enabled: trimmedQuery.length === 0 },
    );
  const trendingPostsQuery = api.post.getTrendingPosts.useQuery(
    { limit: 6 },
    { enabled: trimmedQuery.length === 0 },
  );
  const trendingPosts: RouterOutputs["post"]["getTrendingPosts"] =
    trendingPostsQuery.data ?? [];
  const trendingPostsLoading = trendingPostsQuery.isLoading;
  const visibleTrendingPosts = trendingPosts.filter(
    (post) => !postContainsMutedKeyword(post, mutedKeywords),
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (trimmedQuery.length > 0) params.set("q", trimmedQuery);
    if (mode !== "top") params.set("type", mode);
    router.replace(
      `${pathname}${params.toString() ? `?${params.toString()}` : ""}`,
    );
  };

  const topCards = useMemo(
    () =>
      trendingTags.slice(0, 4).map((tag) => (
        <Link
          key={tag.tag}
          href={`/hashtag/${tag.tag}`}
          className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
        >
          <div className="text-sm text-gray-400">#{tag.tag}</div>
          <div className="mt-1 text-xl font-bold">{tag.count} posts</div>
        </Link>
      )),
    [trendingTags],
  );

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <div className="mb-3 flex items-center gap-2 text-sm tracking-[0.2em] text-gray-400 uppercase">
          <Search className="h-4 w-4" />
          Explore
        </div>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people, posts, or hashtags"
            className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none placeholder:text-gray-500 focus:border-blue-500"
          />
          <button
            type="submit"
            className="rounded-2xl bg-blue-500 px-4 py-3 font-semibold hover:bg-blue-600"
          >
            Search
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { id: "top", label: "Top", icon: Sparkles },
              { id: "people", label: "People", icon: Users },
              { id: "posts", label: "Posts", icon: Newspaper },
              { id: "tags", label: "Tags", icon: Hash },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setMode(id);
                const params = new URLSearchParams();
                if (trimmedQuery.length > 0) params.set("q", trimmedQuery);
                if (id !== "top") params.set("type", id);
                router.replace(
                  `${pathname}${params.toString() ? `?${params.toString()}` : ""}`,
                );
              }}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                mode === id
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {trimmedQuery.length === 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold">
            <TrendingUp className="h-5 w-5" />
            Trending tags
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {trendingLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-gray-400">
                Loading trending tags...
              </div>
            ) : trendingTags.length > 0 ? (
              trendingTags.map((tag) => (
                <Link
                  key={tag.tag}
                  href={`/hashtag/${tag.tag}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
                >
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Hash className="h-4 w-4" />
                    Trending
                  </div>
                  <div className="mt-2 text-xl font-bold">#{tag.tag}</div>
                  <div className="mt-1 text-sm text-gray-400">
                    {tag.count} posts
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-gray-400">
                No hashtags yet. Start by posting with a tag like #launch or
                #design.
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">{topCards}</div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-bold">
              <Newspaper className="h-5 w-5" />
              Trending posts
            </div>
            <div className="overflow-hidden rounded-3xl border border-white/10">
              {trendingPostsLoading ? (
                <div className="p-4 text-sm text-gray-400">
                  Loading trending posts...
                </div>
              ) : trendingPosts.length > 0 ? (
                visibleTrendingPosts.map((post) => (
                  <PostItem key={post.id} post={post} />
                ))
              ) : (
                <div className="p-4 text-sm text-gray-400">
                  No trending posts yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {showPeople && (
            <section>
              <div className="mb-3 text-lg font-bold">People</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {usersLoading ? (
                  <div className="text-sm text-gray-400">
                    Searching people...
                  </div>
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <Link
                      key={user.id}
                      href={`/profile/${user.id}`}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
                    >
                      <div className="font-semibold">
                        {user.name ?? user.username}
                      </div>
                      <div className="text-sm text-gray-400">
                        @{user.username ?? user.id}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-sm text-gray-400">No people found.</div>
                )}
              </div>
            </section>
          )}

          {showTags && (
            <section>
              <div className="mb-3 text-lg font-bold">Tags</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {tagsLoading ? (
                  <div className="text-sm text-gray-400">Searching tags...</div>
                ) : tags.length > 0 ? (
                  tags.map((tag) => (
                    <Link
                      key={tag.tag}
                      href={`/hashtag/${tag.tag}`}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
                    >
                      <div className="text-lg font-bold">#{tag.tag}</div>
                      <div className="text-sm text-gray-400">
                        {tag.count} posts
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-sm text-gray-400">
                    No matching tags found.
                  </div>
                )}
              </div>
            </section>
          )}

          {showPosts && (
            <section>
              <div className="mb-3 text-lg font-bold">Posts</div>
              <div className="overflow-hidden rounded-3xl border border-white/10">
                {postsLoading ? (
                  <div className="p-4 text-sm text-gray-400">
                    Searching posts...
                  </div>
                ) : posts.length > 0 ? (
                  posts
                    .filter(
                      (post) => !postContainsMutedKeyword(post, mutedKeywords),
                    )
                    .map((post) => <PostItem key={post.id} post={post} />)
                ) : (
                  <div className="p-4 text-sm text-gray-400">
                    No posts found.
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
