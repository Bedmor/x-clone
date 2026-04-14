"use client";

import { useMemo, useState } from "react";

import { api } from "~/trpc/react";
import { UserAvatar } from "./UserAvatar";

export function SharePostModal({
  postId,
  content,
  mediaUrls,
  isOpen,
  onClose,
}: {
  postId: number;
  content?: string | null;
  mediaUrls?: string[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const { data: users = [], isLoading } = api.user.searchUsers.useQuery(
    { query },
    { enabled: query.trim().length > 0 && isOpen },
  );

  const createConversation = api.chat.createConversation.useMutation();
  const sendMessage = api.chat.sendMessage.useMutation({
    onSuccess: () => {
      onClose();
      setQuery("");
      alert("Post sent in DM.");
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const shareText = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/post/${postId}`;
    const preview = content?.trim()
      ? `\"${content.trim().slice(0, 120)}\"\n`
      : "";
    const media = mediaUrls?.length ? `\nMedia: ${mediaUrls.join(" ")}` : "";
    return `${preview}${link}${media}`;
  }, [content, mediaUrls, postId]);

  const handleSend = async (userId: string) => {
    try {
      const conversation = await createConversation.mutateAsync({
        participantId: userId,
      });

      await sendMessage.mutateAsync({
        conversationId: conversation.id,
        content: shareText,
      });
    } catch (error) {
      alert((error as Error).message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-black p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Send post in DM</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            x
          </button>
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search user"
          className="mb-3 w-full rounded-xl border border-white/20 bg-black px-3 py-2"
        />

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {isLoading ? (
            <div className="text-sm text-gray-400">Searching...</div>
          ) : users.length > 0 ? (
            users.map((user) => (
              <button
                key={user.id}
                onClick={() => void handleSend(user.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-2 text-left hover:bg-white/10"
                disabled={createConversation.isPending || sendMessage.isPending}
              >
                <UserAvatar
                  src={user.image}
                  alt={user.name}
                  className="h-10 w-10"
                />
                <div>
                  <div className="font-medium">{user.name ?? "Unknown"}</div>
                  <div className="text-sm text-gray-400">
                    @{user.username ?? user.id}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-sm text-gray-400">No users found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
