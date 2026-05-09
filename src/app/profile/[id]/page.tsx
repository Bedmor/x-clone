import { api, HydrateClient } from "~/trpc/server";
import type { RouterOutputs } from "~/trpc/react";
import { notFound } from "next/navigation";
import Image from "next/image";
import { UserAvatar } from "~/app/_components/UserAvatar";
import { FollowButton } from "~/app/_components/FollowButton";
import { auth } from "~/server/auth";
import { ProfileFeed } from "./ProfileFeed";
import { EditProfileButton } from "./EditProfileButton";
import { ProfileStats } from "./ProfileStats";
import { MessageButton } from "./MessageButton";
import { BlockButton } from "./BlockButton";
import { ReportUserButton } from "./ReportUserButton";
import { linkifyText } from "~/app/_lib/linkify";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user: RouterOutputs["user"]["getProfile"] | null =
    await api.user.getProfile({ userId: id });

  if (!user) {
    notFound();
  }

  const isOwnProfile = session?.user?.id === user.id;

  return (
    <HydrateClient>
      <div className="mx-auto flex w-full max-w-6xl gap-4 px-3 lg:gap-6 lg:px-5">
        <div className="min-w-0 flex-1 pb-24 lg:max-w-2xl">
          <div className="sticky top-0 z-10 hidden border-b border-white/20 bg-black/50 p-4 backdrop-blur md:block">
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-sm text-gray-500">{user._count.posts} gönderi</p>
          </div>
          <div className="relative h-36 bg-gray-800 sm:h-48">
            {user.headerImage && (
              <Image
                src={user.headerImage}
                alt="Başlık"
                width={1200}
                height={320}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="px-3 pb-4 sm:px-4">
            <div className="relative -mt-14 flex flex-wrap items-start justify-between gap-3 sm:-mt-20 sm:flex-nowrap">
              <UserAvatar
                src={user.image}
                alt={user.name}
                className="h-24 w-24 border-4 border-black sm:h-32 sm:w-32"
              />
              {isOwnProfile ? (
                <EditProfileButton user={user} />
              ) : (
                session && (
                  <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto sm:flex-nowrap">
                    <MessageButton
                      userId={user.id}
                      disabled={!user.canMessage}
                    />
                    <ReportUserButton userId={user.id} />
                    <BlockButton
                      userId={user.id}
                      initialIsBlocked={user.isBlocked}
                    />
                    <FollowButton
                      userId={user.id}
                      initialIsFollowing={user.isFollowing}
                    />
                  </div>
                )
              )}
            </div>
            <h2 className="mt-3 text-2xl font-bold">{user.name}</h2>
            <p className="text-gray-500">@{user.username ?? user.id}</p>
            {user.bio && (
              <p className="mt-2 whitespace-pre-wrap">
                {linkifyText(
                  user.bio,
                  (url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-blue-400 hover:underline"
                    >
                      {url}
                    </a>
                  ),
                  (username, i) => (
                    <a
                      key={i}
                      href={`/profile/${username}`}
                      className="text-blue-400 hover:underline"
                    >
                      @{username}
                    </a>
                  ),
                  (tag, i) => (
                    <a
                      key={i}
                      href={`/hashtag/${tag}`}
                      className="text-cyan-400 hover:underline"
                    >
                      #{tag}
                    </a>
                  ),
                )}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
              {user.location && <span>📍 {user.location}</span>}
              {user.website && (
                <a
                  href={user.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  🔗 {user.website}
                </a>
              )}
            </div>
            <ProfileStats
              userId={user.id}
              followingCount={user._count.following}
              followersCount={user._count.followedBy}
            />
          </div>
          {user.isBlocked || user.hasBlocked ? (
            <div className="p-8 text-center text-gray-500">
              {user.isBlocked
                ? "Bu kullanıcıyı engellediniz."
                : "Bu kullanıcı sizi engelledi."}
            </div>
          ) : !user.canViewPosts ? (
            <div className="p-8 text-center text-gray-500">
              This account is private. Follow to see posts.
            </div>
          ) : (
            <ProfileFeed userId={user.id} pinnedPost={user.pinnedPost} />
          )}
        </div>
      </div>
    </HydrateClient>
  );
}
