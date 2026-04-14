"use client";

import Link from "next/link";
import { Users } from "lucide-react";

import { api } from "~/trpc/react";
import { FollowButton } from "./FollowButton";
import { UserAvatar } from "./UserAvatar";

export function SuggestedUsers({ limit = 6 }: { limit?: number }) {
  const { data: users = [], isLoading } = api.user.getSuggestedUsers.useQuery({
    limit,
  });

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
        Tanıyor olabileceğiniz kişiler yükleniyor...
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
        Henüz öneri yok.
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-[0.2em] text-gray-400 uppercase">
        <Users className="h-4 w-4" />
        Tanıyor olabileceğiniz kişiler
      </div>
      <div className="space-y-4">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-3">
            <UserAvatar
              src={user.image}
              alt={user.name}
              className="h-10 w-10"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/profile/${user.id}`}
                className="block truncate font-bold hover:underline"
              >
                {user.name ?? user.username}
              </Link>
              <div className="truncate text-sm text-gray-400">
                @{user.username ?? user.id} · {user._count.followedBy} takipçi
              </div>
            </div>
            <FollowButton
              userId={user.id}
              initialIsFollowing={user.isFollowing}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
