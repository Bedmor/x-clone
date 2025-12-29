"use client";

import { useState } from "react";
import { EditProfileModal } from "~/app/_components/EditProfileModal";

export function EditProfileButton({
  user,
}: {
  user: {
    id: string;
    name: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    image: string | null;
    headerImage: string | null;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-full border border-white/20 bg-transparent px-4 py-2 font-bold text-white backdrop-blur-md hover:bg-white/10"
      >
        Edit Profile
      </button>
      <EditProfileModal
        user={user}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
