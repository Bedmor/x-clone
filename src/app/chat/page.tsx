"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import Ably from "ably";
import { UserAvatar } from "../_components/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import { Send, MailPlus, Image as ImageIcon, Loader2 } from "lucide-react";
import { NewChatModal } from "./NewChatModal";
import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { type inferRouterOutputs } from "@trpc/server";
import { type AppRouter } from "~/server/api/root";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ChatMessage = RouterOutputs["chat"]["getMessages"]["messages"][number];

export default function ChatPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const initialConversationId = searchParams.get("conversationId");

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(initialConversationId);
  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // New states
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const utils = api.useUtils();

  useEffect(() => {
    if (initialConversationId) {
      setSelectedConversationId(initialConversationId);
    }
  }, [initialConversationId]);

  const { data: conversations, refetch: refetchConversations } =
    api.chat.getConversations.useQuery(undefined, {
      refetchInterval: 5000, // Poll for unread updates
    });

  const createConversation = api.chat.createConversation.useMutation({
    onSuccess: (conversation) => {
      setSelectedConversationId(conversation.id);
      setShowNewChatModal(false);
      void refetchConversations();
    },
  });

  const { mutate: markConversationAsRead } = api.chat.markAsRead.useMutation({
    onSuccess: () => {
      void utils.chat.getConversations.invalidate();
    },
  });

  const sendMessageMutation = api.chat.sendMessage.useMutation();

  const handleSelectUser = (userId: string) => {
    createConversation.mutate({ participantId: userId });
  };

  // Infinite Query for messages
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
  } = api.chat.getMessages.useInfiniteQuery(
    { conversationId: selectedConversationId!, limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!selectedConversationId,
      refetchOnWindowFocus: false,
    },
  );

  const messages =
    messagesData?.pages
      .slice()
      .reverse()
      .flatMap((page) => page.messages.slice().reverse()) ?? [];

  // Mark as read when conversation opens
  useEffect(() => {
    if (selectedConversationId) {
      markConversationAsRead({ conversationId: selectedConversationId });
    }
  }, [selectedConversationId, markConversationAsRead]);

  // Ably connection
  useEffect(() => {
    if (!session?.user?.id) return;

    const client = new Ably.Realtime({ authUrl: "/api/ably" });
    setAblyClient(client);

    return () => {
      client.close();
    };
  }, [session?.user?.id]);

  // Handle Online Status (Global Presence)
  useEffect(() => {
    if (!ablyClient || !session?.user?.id) return;

    const presenceChannel = ablyClient.channels.get("global-presence");

    const updateOnlineUsers = async () => {
      const members = await presenceChannel.presence.get();
      const userIds = new Set(members.map((m) => m.clientId));
      setOnlineUsers(userIds);
    };

    void presenceChannel.presence.enter();
    void presenceChannel.presence.subscribe(
      "enter",
      () => void updateOnlineUsers(),
    );
    void presenceChannel.presence.subscribe(
      "leave",
      () => void updateOnlineUsers(),
    );
    void presenceChannel.presence.subscribe(
      "update",
      () => void updateOnlineUsers(),
    );

    // Initial fetch
    void updateOnlineUsers();

    return () => {
      void presenceChannel.presence.leave();
      presenceChannel.presence.unsubscribe();
      presenceChannel.unsubscribe();
    };
  }, [ablyClient, session?.user?.id]);

  // Handle Messages and Typing
  useEffect(() => {
    if (!ablyClient || !selectedConversationId) return;

    const channel = ablyClient.channels.get(
      `conversation-${selectedConversationId}`,
    );

    // Subscribe to new messages
    void channel.subscribe("new_message", (message) => {
      const typedMessage = message.data as unknown as ChatMessage;

      // Manually update the cache
      utils.chat.getMessages.setInfiniteData(
        { conversationId: selectedConversationId, limit: 20 },
        (oldData) => {
          if (!oldData) {
            return {
              pages: [
                {
                  messages: [typedMessage],
                  nextCursor: undefined,
                },
              ],
              pageParams: [],
            };
          }

          const newPages = [...oldData.pages];
          const firstPage = newPages[0];

          if (firstPage) {
            newPages[0] = {
              ...firstPage,
              messages: [typedMessage, ...firstPage.messages],
            };
          }

          return {
            ...oldData,
            pages: newPages,
          };
        },
      );
      scrollToBottom();
      void refetchConversations();
    });

    // Subscribe to typing events
    void channel.subscribe("typing", (message) => {
      const { userId, isTyping } = message.data as {
        userId: string;
        isTyping: boolean;
      };
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    return () => {
      channel.unsubscribe();
      setTypingUsers(new Set());
    };
  }, [ablyClient, selectedConversationId, utils, refetchConversations]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const handleTyping = () => {
    if (!ablyClient || !selectedConversationId || !session) return;

    const channel = ablyClient.channels.get(
      `conversation-${selectedConversationId}`,
    );
    void channel.publish("typing", { userId: session.user.id, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      void channel.publish("typing", {
        userId: session.user.id,
        isTyping: false,
      });
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (!newMessage.trim() && !isUploading) ||
      !selectedConversationId ||
      !session
    )
      return;

    const content = newMessage;
    setNewMessage(""); // Optimistic clear

    // Stop typing immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (ablyClient) {
      const channel = ablyClient.channels.get(
        `conversation-${selectedConversationId}`,
      );
      void channel.publish("typing", {
        userId: session.user.id,
        isTyping: false,
      });
    }

    try {
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        content,
        attachmentUrl: null,
      });
    } catch (error) {
      console.error("Failed to send message", error);
      // Ideally restore message to input on error
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !selectedConversationId || !session) return;

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        content: "",
        attachmentUrl: blob.url,
      });
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!session) {
    return <div className="p-4 text-center">Please sign in to chat.</div>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden border-t border-white/20">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-white/20 bg-black">
        <div className="flex items-center justify-between border-b border-white/20 p-4">
          <h2 className="text-xl font-bold">Messages</h2>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="rounded-full p-2 hover:bg-white/10"
          >
            <MailPlus size={20} />
          </button>
        </div>
        <div className="h-full overflow-y-auto pb-20">
          {conversations?.map((conversation) => {
            const otherParticipant = conversation.participants.find(
              (p) => p.userId !== session.user.id,
            )?.user;
            const lastMessage = conversation.messages[0];
            const isUnread =
              conversation.participants.find(
                (p) => p.userId === session.user.id,
              )?.hasSeenLatest === false;
            const isOnline =
              otherParticipant && onlineUsers.has(otherParticipant.id);

            return (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversationId(conversation.id)}
                className={`cursor-pointer border-b border-white/10 p-4 hover:bg-white/5 ${
                  selectedConversationId === conversation.id
                    ? "bg-white/10"
                    : ""
                } ${isUnread ? "bg-blue-500/10" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <UserAvatar
                      src={otherParticipant?.image}
                      alt={otherParticipant?.name}
                      className="h-12 w-12"
                    />
                    {isOnline && (
                      <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-black" />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span
                        className={`truncate ${isUnread ? "font-bold text-white" : "text-gray-300"}`}
                      >
                        {otherParticipant?.name ?? "Unknown User"}
                      </span>
                      {lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p
                      className={`truncate text-sm ${isUnread ? "font-semibold text-white" : "text-gray-500"}`}
                    >
                      {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
                      {lastMessage?.content ||
                        (lastMessage?.attachmentUrl
                          ? "Sent an image"
                          : "No messages yet")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {conversations?.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              No conversations yet.
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex w-2/3 flex-col bg-black">
        {selectedConversationId ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-white/20 p-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const conversation = conversations?.find(
                    (c) => c.id === selectedConversationId,
                  );
                  const otherParticipant = conversation?.participants.find(
                    (p) => p.userId !== session.user.id,
                  )?.user;
                  const isOnline =
                    otherParticipant && onlineUsers.has(otherParticipant.id);
                  const otherParticipantData = conversation?.participants.find(
                    (p) => p.userId !== session.user.id,
                  );

                  return (
                    <>
                      <div className="relative">
                        <UserAvatar
                          src={otherParticipant?.image}
                          alt={otherParticipant?.name}
                          className="h-10 w-10"
                        />
                        {isOnline && (
                          <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-black" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold">
                          {otherParticipant?.name ?? "Unknown User"}
                        </span>
                        {isOnline ? (
                          <span className="text-xs text-green-500">Online</span>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {otherParticipantData?.hasSeenLatest
                              ? "Seen"
                              : "Delivered"}
                          </span>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4"
            >
              {hasNextPage && (
                <div className="flex justify-center py-2">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    {isFetchingNextPage ? "Loading..." : "Load older messages"}
                  </button>
                </div>
              )}

              {isLoadingMessages ? (
                <div className="text-center">Loading messages...</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((message) => {
                    const isMe = message.senderId === session.user.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isMe
                              ? "bg-blue-500 text-white"
                              : "bg-gray-800 text-white"
                          }`}
                        >
                          {message.attachmentUrl && (
                            <Image
                              src={message.attachmentUrl}
                              alt="Attachment"
                              width={300}
                              height={200}
                              className="mb-2 max-h-60 rounded-lg object-cover"
                            />
                          )}
                          {message.content && <p>{message.content}</p>}
                          <div className="mt-1 flex items-center justify-end gap-1">
                            <span className="text-xs opacity-70">
                              {formatDistanceToNow(
                                new Date(message.createdAt),
                                {
                                  addSuffix: true,
                                },
                              )}
                            </span>
                            {isMe &&
                              message.id ===
                                messages[messages.length - 1]?.id && (
                                <span className="text-[10px] opacity-70">
                                  {conversations
                                    ?.find(
                                      (c) => c.id === selectedConversationId,
                                    )
                                    ?.participants.find(
                                      (p) => p.userId !== session.user.id,
                                    )?.hasSeenLatest
                                    ? " • Seen"
                                    : " • Sent"}
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {typingUsers.size > 0 && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl bg-gray-800 px-4 py-2 text-sm text-gray-400 italic">
                        Typing...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleSendMessage}
              className="border-t border-white/20 p-4"
            >
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-blue-500 hover:text-blue-400"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <ImageIcon size={20} />
                  )}
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full border border-white/20 bg-black px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() && !isUploading}
                  className="rounded-full bg-blue-500 p-2 text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            Select a conversation to start chatting
          </div>
        )}
      </div>
      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onSelectUser={handleSelectUser}
        />
      )}
    </div>
  );
}
