"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { UserAvatar } from "../_components/UserAvatar";
import { Search } from "lucide-react";
import { Logo } from "../_components/Logo";

export function NewChatModal({
  onClose,
  onCreateConversation,
}: {
  onClose: () => void;
  onCreateConversation: (participantIds: string[], title?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<
    Array<{
      id: string;
      name: string | null;
      username: string | null;
      image: string | null;
    }>
  >([]);
  const [groupTitle, setGroupTitle] = useState("");

  const { data: users, isLoading } = api.user.searchUsers.useQuery(
    { query },
    { enabled: query.trim().length >= 2 },
  );

  const toggleUser = (user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  }) => {
    setSelectedUsers((current) =>
      current.some((item) => item.id === user.id)
        ? current.filter((item) => item.id !== user.id)
        : [...current, user],
    );
  };

  const handleCreate = () => {
    if (selectedUsers.length === 0) {
      return;
    }

    onCreateConversation(
      selectedUsers.map((user) => user.id),
      selectedUsers.length > 1 && groupTitle.trim().length > 0
        ? groupTitle.trim()
        : undefined,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-white/20 bg-black p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Yeni Mesaj</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            ✕
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Kişi ara"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full border border-white/20 bg-black py-2 pr-4 pl-10 text-white focus:border-blue-500 focus:outline-none"
            autoFocus
          />
        </div>

        {selectedUsers.length > 1 && (
          <input
            type="text"
            value={groupTitle}
            onChange={(event) => setGroupTitle(event.target.value)}
            placeholder="Grup adı (opsiyonel)"
            className="mb-4 w-full rounded-full border border-white/20 bg-black px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        )}

        {selectedUsers.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => toggleUser(user)}
                className="rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-sm text-blue-200"
              >
                @{user.username ?? user.id}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Logo className="h-6 w-6 animate-spin text-white" />
            </div>
          ) : users?.length === 0 && query ? (
            <div className="p-4 text-center text-gray-500">
              Kullanıcı bulunamadı
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {users?.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUser(user)}
                  className={`flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-white/10 ${
                    selectedUsers.some((item) => item.id === user.id)
                      ? "border border-blue-400/40 bg-blue-500/10"
                      : "border border-transparent"
                  }`}
                >
                  <UserAvatar
                    src={user.image}
                    alt={user.name}
                    className="h-10 w-10"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold">{user.name}</span>
                    <span className="text-sm text-gray-500">
                      @{user.username}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={selectedUsers.length === 0}
          className="mt-4 rounded-full bg-blue-500 py-2 font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {selectedUsers.length > 1
            ? `Grup oluştur (${selectedUsers.length})`
            : "Sohbet başlat"}
        </button>
      </div>
    </div>
  );
}
