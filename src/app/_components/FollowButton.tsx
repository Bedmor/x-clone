"use client";

import { api } from "~/trpc/react";
import { useState } from "react";

export function FollowButton({
  userId,
  initialIsFollowing,
}: {
  userId: string;
  initialIsFollowing: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const utils = api.useUtils();

  const toggleFollow = api.user.toggleFollow.useMutation({
    onMutate: async () => {
      setIsFollowing((prev) => !prev);
    },
    onSuccess: () => {
      void utils.user.getProfile.invalidate({ userId });
    },
    onError: () => {
      setIsFollowing((prev) => !prev);
    },
  });

  return (
    <button
      onClick={() => toggleFollow.mutate({ userId })}
      className={`rounded-full px-4 py-2 font-bold transition ${
        isFollowing
          ? "border border-white/20 bg-transparent text-white hover:border-red-500 hover:bg-red-500/10 hover:text-red-500"
          : "bg-white text-black hover:bg-white/90"
      }`}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
