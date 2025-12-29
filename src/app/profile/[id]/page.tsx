import { api, HydrateClient } from "~/trpc/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { UserAvatar } from "~/app/_components/UserAvatar";
import { FollowButton } from "~/app/_components/FollowButton";
import { auth } from "~/server/auth";
import { ProfileFeed } from "./ProfileFeed";
import { EditProfileButton } from "./EditProfileButton";
import { ProfileStats } from "./ProfileStats";
import { MessageButton } from "./MessageButton";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = await api.user.getProfile({ userId: id });

  if (!user) {
    notFound();
  }

  const isOwnProfile = session?.user?.id === user.id;

  return (
    <HydrateClient>
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 border-b border-white/20 bg-black/50 p-4 backdrop-blur">
          <h1 className="text-xl font-bold">{user.name}</h1>
          <p className="text-sm text-gray-500">{user._count.posts} posts</p>
        </div>
        <div className="relative h-48 bg-gray-800">
          {user.headerImage && (
            <Image
              src={user.headerImage}
              alt="Header"
              width={1200}
              height={320}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="p-4">
          <div className="relative -mt-20 flex items-start justify-between">
            <UserAvatar
              src={user.image}
              alt={user.name}
              className="h-32 w-32 border-4 border-black"
            />
            {isOwnProfile ? (
              <EditProfileButton user={user} />
            ) : (
              session && (
                <div className="flex gap-2">
                  <MessageButton userId={user.id} />
                  <FollowButton
                    userId={user.id}
                    initialIsFollowing={user.isFollowing}
                  />
                </div>
              )
            )}
          </div>
          <h2 className="mt-4 text-2xl font-bold">{user.name}</h2>
          <p className="text-gray-500">@{user.id}</p>
          {user.bio && <p className="mt-2 whitespace-pre-wrap">{user.bio}</p>}
          <div className="mt-2 flex gap-4 text-sm text-gray-500">
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
        <ProfileFeed userId={user.id} pinnedPost={user.pinnedPost} />
      </div>
    </HydrateClient>
  );
}
