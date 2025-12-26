"use client";

import { api } from "~/trpc/react";
import { UserAvatar } from "./UserAvatar";
import Link from "next/link";
import { FollowButton } from "./FollowButton";

export function UserListModal({
  userId,
  type,
  onClose,
}: {
  userId: string;
  type: "followers" | "following";
  onClose: () => void;
}) {
  const { data: users, isLoading } =
    type === "followers"
      ? api.user.getFollowers.useQuery({ userId })
      : api.user.getFollowing.useQuery({ userId });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-white/20 bg-black p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold capitalize">{type}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">Loading...</div>
          ) : users?.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No users found</div>
          ) : (
            <div className="flex flex-col gap-4">
              {users?.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  <UserAvatar
                    src={user.image}
                    alt={user.name}
                    className="h-10 w-10"
                  />
                  <div className="flex-1 overflow-hidden">
                    <Link
                      href={`/profile/${user.id}`}
                      className="block truncate font-bold hover:underline"
                      onClick={onClose}
                    >
                      {user.name}
                    </Link>
                    <p className="truncate text-sm text-gray-500">
                      @{user.username ?? user.id}
                    </p>
                    {user.bio && (
                      <p className="truncate text-sm text-gray-400">
                        {user.bio}
                      </p>
                    )}
                  </div>
                  <FollowButton
                    userId={user.id}
                    initialIsFollowing={user.isFollowing}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
