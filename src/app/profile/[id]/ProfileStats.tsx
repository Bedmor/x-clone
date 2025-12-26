"use client";

import { useState } from "react";
import { UserListModal } from "~/app/_components/UserListModal";

export function ProfileStats({
  userId,
  followingCount,
  followersCount,
}: {
  userId: string;
  followingCount: number;
  followersCount: number;
}) {
  const [modalType, setModalType] = useState<"followers" | "following" | null>(
    null,
  );

  return (
    <>
      <div className="mt-4 flex gap-4 text-gray-500">
        <button
          onClick={() => setModalType("following")}
          className="hover:underline"
        >
          <strong className="text-white">{followingCount}</strong> Following
        </button>
        <button
          onClick={() => setModalType("followers")}
          className="hover:underline"
        >
          <strong className="text-white">{followersCount}</strong> Followers
        </button>
      </div>
      {modalType && (
        <UserListModal
          userId={userId}
          type={modalType}
          onClose={() => setModalType(null)}
        />
      )}
    </>
  );
}
