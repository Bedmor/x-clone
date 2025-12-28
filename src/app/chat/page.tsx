"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";
import { UserAvatar } from "../_components/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import { Send, MailPlus } from "lucide-react";
import { NewChatModal } from "./NewChatModal";

type Message = {
  id: string;
  content: string;
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
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, refetch: refetchConversations } =
    api.chat.getConversations.useQuery();

  const createConversation = api.chat.createConversation.useMutation({
    onSuccess: (conversation) => {
      setSelectedConversationId(conversation.id);
      setShowNewChatModal(false);
      refetchConversations();
    },
  });

  const handleSelectUser = (userId: string) => {
    createConversation.mutate({ participantId: userId });
  };

  const { data: initialMessages, isLoading: isLoadingMessages } =
    api.chat.getMessages.useQuery(
      { conversationId: selectedConversationId! },
      { enabled: !!selectedConversationId },
    );

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
      scrollToBottom();
    }
  }, [initialMessages]);

  useEffect(() => {
    const newSocket = io(
      process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001",
    );
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("new_message", (message: Message) => {
      if (message.conversationId === selectedConversationId) {
        // Wait, message type doesn't have conversationId in my definition above but it comes from server
        // Actually the server sends the full message object which includes conversationId
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      }
      // Also update conversation list last message preview if needed
      refetchConversations();
    });

    return () => {
      socket.off("new_message");
    };
  }, [socket, selectedConversationId, refetchConversations]);

  useEffect(() => {
    if (socket && selectedConversationId) {
      socket.emit("join_conversation", selectedConversationId);
    }
  }, [socket, selectedConversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !selectedConversationId || !session)
      return;

    const messageData = {
      conversationId: selectedConversationId,
      content: newMessage,
      senderId: session.user.id,
    };

    socket.emit("send_message", messageData);
    setNewMessage("");
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

            return (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversationId(conversation.id)}
                className={`cursor-pointer border-b border-white/10 p-4 hover:bg-white/5 ${
                  selectedConversationId === conversation.id
                    ? "bg-white/10"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    src={otherParticipant?.image}
                    alt={otherParticipant?.name}
                    className="h-12 w-12"
                  />
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="truncate font-bold">
                        {otherParticipant?.name || "Unknown User"}
                      </span>
                      {lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-gray-500">
                      {lastMessage?.content || "No messages yet"}
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
                  return (
                    <>
                      <UserAvatar
                        src={otherParticipant?.image}
                        alt={otherParticipant?.name}
                        className="h-10 w-10"
                      />
                      <span className="font-bold">
                        {otherParticipant?.name || "Unknown User"}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
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
                          <p>{message.content}</p>
                          <span className="text-xs opacity-70">
                            {formatDistanceToNow(new Date(message.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleSendMessage}
              className="border-t border-white/20 p-4"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full border border-white/20 bg-black px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
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
