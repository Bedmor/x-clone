"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export function BlockButton({
  userId,
  initialIsBlocked,
}: {
  userId: string;
  initialIsBlocked: boolean;
}) {
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked);
  const router = useRouter();

  const blockMutation = api.user.blockUser.useMutation({
    onSuccess: () => {
      setIsBlocked(true);
      router.refresh();
    },
  });

  const unblockMutation = api.user.unblockUser.useMutation({
    onSuccess: () => {
      setIsBlocked(false);
      router.refresh();
    },
  });

  const handleToggleBlock = () => {
    if (isBlocked) {
      unblockMutation.mutate({ userId });
    } else {
      blockMutation.mutate({ userId });
    }
  };

  return (
    <button
      onClick={handleToggleBlock}
      disabled={blockMutation.isPending || unblockMutation.isPending}
      className={`rounded-full px-4 py-2 font-bold transition-colors ${
        isBlocked
          ? "bg-red-600 text-white hover:bg-red-700"
          : "border border-gray-500 text-white hover:bg-white/10"
      }`}
    >
      {isBlocked ? "Engeli Kaldır" : "Engelle"}
    </button>
  );
}
