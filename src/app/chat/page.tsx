"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";
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

type Message = {
  id: string;
  content: string;
  attachmentUrl: string | null;
  createdAt: Date;
  senderId: string;
  conversationId: string;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
    username: string | null;
  };
};

export default function ChatPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const initialConversationId = searchParams.get("conversationId");

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(initialConversationId);
  const [socket, setSocket] = useState<Socket | null>(null);
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

  // Socket connection
  useEffect(() => {
    const newSocket = io(
      process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001",
    );
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Register user and handle online status
  useEffect(() => {
    if (!socket || !session?.user?.id) return;

    socket.emit("register_user", session.user.id);

    socket.on("user_online", (userId: string) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    });

    socket.on("user_offline", (userId: string) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    socket.on("online_users", (userIds: string[]) => {
      setOnlineUsers(new Set(userIds));
    });

    return () => {
      socket.off("user_online");
      socket.off("user_offline");
      socket.off("online_users");
    };
  }, [socket, session?.user?.id]);

  // Handle messages and typing
  useEffect(() => {
    if (!socket) return;

    socket.on("new_message", (message: Message) => {
      if (message.conversationId === selectedConversationId) {
        // Manually update the cache to avoid full refetch
        utils.chat.getMessages.setInfiniteData(
          { conversationId: selectedConversationId, limit: 20 },
          (oldData) => {
            // We need to cast the message to ChatMessage because the TRPC type includes all User fields
            // but our socket message only includes the basic sender info.
            const typedMessage = message as unknown as ChatMessage;

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
      }
      void refetchConversations();
    });

    socket.on(
      "typing_status",
      ({
        userId,
        isTyping,
        conversationId,
      }: {
        userId: string;
        isTyping: boolean;
        conversationId: string;
      }) => {
        if (conversationId === selectedConversationId) {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            if (isTyping) next.add(userId);
            else next.delete(userId);
            return next;
          });
        }
      },
    );

    return () => {
      socket.off("new_message");
      socket.off("typing_status");
    };
  }, [socket, selectedConversationId, refetchConversations, utils]);

  useEffect(() => {
    if (socket && selectedConversationId) {
      socket.emit("join_conversation", selectedConversationId);
      setTypingUsers(new Set()); // Reset typing status on switch
    }
  }, [socket, selectedConversationId]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const handleTyping = () => {
    if (!socket || !selectedConversationId || !session) return;

    socket.emit("typing", {
      conversationId: selectedConversationId,
      userId: session.user.id,
      isTyping: true,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", {
        conversationId: selectedConversationId,
        userId: session.user.id,
        isTyping: false,
      });
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (!newMessage.trim() && !isUploading) ||
      !socket ||
      !selectedConversationId ||
      !session
    )
      return;

    const messageData = {
      conversationId: selectedConversationId,
      content: newMessage,
      senderId: session.user.id,
      attachmentUrl: null as string | null,
    };

    socket.emit("send_message", messageData);
    setNewMessage("");

    // Stop typing immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("typing", {
      conversationId: selectedConversationId,
      userId: session.user.id,
      isTyping: false,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !socket || !selectedConversationId || !session)
      return;

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      const messageData = {
        conversationId: selectedConversationId,
        content: "", // Empty content for image-only message
        senderId: session.user.id,
        attachmentUrl: blob.url,
      };

      socket.emit("send_message", messageData);
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
