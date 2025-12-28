"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { UserAvatar } from "../_components/UserAvatar";
import { Search } from "lucide-react";

export function NewChatModal({
  onClose,
  onSelectUser,
}: {
  onClose: () => void;
  onSelectUser: (userId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const { data: users, isLoading } = api.user.searchUsers.useQuery(
    { query },
    { enabled: query.length > 0 },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-white/20 bg-black p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">New Message</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            ✕
          </button>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search people"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full border border-white/20 bg-black py-2 pl-10 pr-4 text-white focus:border-blue-500 focus:outline-none"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">Loading...</div>
          ) : users?.length === 0 && query ? (
            <div className="p-4 text-center text-gray-500">No users found</div>
          ) : (
            <div className="flex flex-col gap-4">
              {users?.map((user) => (
                <div
                  key={user.id}
                  onClick={() => onSelectUser(user.id)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-white/10"
                >
                  <UserAvatar
                    src={user.image}
                    alt={user.name}
                    className="h-10 w-10"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold">{user.name}</span>
                    <span className="text-sm text-gray-500">@{user.username}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
