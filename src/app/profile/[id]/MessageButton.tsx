"use client";

import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { api } from "~/trpc/react";

export function MessageButton({ userId }: { userId: string }) {
  const router = useRouter();
  const createConversation = api.chat.createConversation.useMutation({
    onSuccess: (conversation) => {
      router.push(`/chat?conversationId=${conversation.id}`);
    },
  });

  const handleMessage = () => {
    createConversation.mutate({ participantId: userId });
  };

  return (
    <button
      onClick={handleMessage}
      disabled={createConversation.isPending}
      className="rounded-full border border-white/20 p-2 hover:bg-white/10 disabled:opacity-50"
      title="Message"
    >
      <Mail className="h-5 w-5" />
    </button>
  );
}
