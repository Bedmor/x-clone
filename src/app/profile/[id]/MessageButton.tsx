"use client";

import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { api } from "~/trpc/react";

export function MessageButton({
  userId,
  disabled,
}: {
  userId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const createConversation = api.chat.createConversation.useMutation({
    onSuccess: (conversation) => {
      router.push(`/chat?conversationId=${conversation.id}`);
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const handleMessage = () => {
    if (disabled) return;
    createConversation.mutate({ participantIds: [userId] });
  };

  return (
    <button
      onClick={handleMessage}
      disabled={(disabled ?? false) || createConversation.isPending}
      className="rounded-full border border-white/20 p-2 hover:bg-white/10 disabled:opacity-50"
      title={disabled ? "Bu kullanıcı mesaj kabul etmiyor" : "Mesaj"}
    >
      <Mail className="h-5 w-5" />
    </button>
  );
}
