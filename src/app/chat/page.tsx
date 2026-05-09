"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import type * as Ably from "ably";
import { UserAvatar } from "../_components/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import {
  Send,
  MailPlus,
  Image as ImageIcon,
  Loader2,
  ArrowLeft,
  SmilePlus,
  Reply,
  Plus,
} from "lucide-react";
import Image from "next/image";
import { Theme } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";

// Lazy-load the emoji picker to avoid pulling the picker bundle into initial JS
const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((mod) => mod.default ?? mod),
  { ssr: false },
);
import { type inferRouterOutputs } from "@trpc/server";
import { type AppRouter } from "~/server/api/root";
import { uploadToR2 } from "~/app/_lib/uploadToR2";
import { parseSharedPostMessage } from "../_components/shareMessage";
import { linkifyText } from "~/app/_lib/linkify";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ChatMessage = RouterOutputs["chat"]["getMessages"]["messages"][number];
type Conversation = RouterOutputs["chat"]["getConversations"][number];

import { Logo } from "../_components/Logo";

const NewChatModal = dynamic(
  () => import("./NewChatModal").then((mod) => mod.NewChatModal),
  { ssr: false },
);

function getConversationDisplayName(
  conversation: Conversation | undefined,
  currentUserId: string,
) {
  if (!conversation) {
    return "Bilinmeyen Sohbet";
  }

  if (conversation.title?.trim()) {
    return conversation.title;
  }

  const others = conversation.participants.filter(
    (participant) => participant.userId !== currentUserId,
  );

  if (others.length === 0) {
    return "Sohbet";
  }

  if (others.length === 1) {
    const only = others[0]?.user;
    return only?.name ?? only?.username ?? "Bilinmeyen Kullanıcı";
  }

  const names = others
    .map((participant) => participant.user.name ?? participant.user.username)
    .filter((name): name is string => Boolean(name));

  if (names.length === 0) {
    return `${others.length} kişilik grup`;
  }

  return names.slice(0, 2).join(", ") + (names.length > 2 ? "..." : "");
}

export default function ChatPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialConversationId = searchParams.get("conversationId");

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(initialConversationId);
  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<
    string | null
  >(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [groupTitleDraft, setGroupTitleDraft] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<{
    messageId: string | null;
    startX: number;
    startY: number;
    longPressTimer: ReturnType<typeof setTimeout> | null;
    longPressTriggered: boolean;
  }>({
    messageId: null,
    startX: 0,
    startY: 0,
    longPressTimer: null,
    longPressTriggered: false,
  });

  // New states
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showInputMenu, setShowInputMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleChatLinkClick = (href: string) => {
    router.push(href);
  };

  const handleChatLinkKeyDown = (
    event: React.KeyboardEvent<HTMLSpanElement>,
    href: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      router.push(href);
    }
  };

  const utils = api.useUtils();

  useEffect(() => {
    if (initialConversationId) {
      setSelectedConversationId(initialConversationId);
    }
  }, [initialConversationId]);

  const { data: conversations, refetch: refetchConversations } =
    api.chat.getConversations.useQuery(undefined, {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    });

  const selectedConversation = conversations?.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const selectedOtherParticipants = selectedConversation
    ? selectedConversation.participants.filter(
        (participant) => participant.userId !== session?.user.id,
      )
    : [];
  const isGroupConversation = selectedOtherParticipants.length > 1;

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

  const updateConversationTitleMutation =
    api.chat.updateConversationTitle.useMutation({
      onSuccess: () => {
        void refetchConversations();
      },
    });

  const addParticipantsMutation = api.chat.addParticipants.useMutation({
    onSuccess: () => {
      setMemberQuery("");
      void refetchConversations();
    },
  });

  const removeParticipantMutation = api.chat.removeParticipant.useMutation({
    onSuccess: () => {
      void refetchConversations();
    },
  });

  const leaveConversationMutation = api.chat.leaveConversation.useMutation({
    onSuccess: () => {
      setShowGroupManager(false);
      setSelectedConversationId(null);
      void refetchConversations();
    },
  });

  const deleteConversationMutation = api.chat.deleteConversation.useMutation({
    onSuccess: () => {
      setShowGroupManager(false);
      setSelectedConversationId(null);
      void refetchConversations();
    },
  });

  const setParticipantRoleMutation = api.chat.setParticipantRole.useMutation({
    onSuccess: () => {
      void refetchConversations();
    },
  });

  const toggleReactionMutation = api.chat.toggleReaction.useMutation({
    onMutate: async (input) => {
      if (!selectedConversationId) {
        return { previousData: undefined };
      }

      await utils.chat.getMessages.cancel({
        conversationId: selectedConversationId,
        limit: 20,
      });

      const previousData = utils.chat.getMessages.getInfiniteData({
        conversationId: selectedConversationId,
        limit: 20,
      });

      utils.chat.getMessages.setInfiniteData(
        { conversationId: selectedConversationId, limit: 20 },
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              messages: page.messages.map((message) => {
                if (message.id !== input.messageId) {
                  return message;
                }

                const hasReacted = message.reactions.some(
                  (reaction) =>
                    reaction.userId === session?.user.id &&
                    reaction.emoji === input.emoji,
                );

                const updatedReactions = hasReacted
                  ? message.reactions.filter(
                      (reaction) =>
                        !(
                          reaction.userId === session?.user.id &&
                          reaction.emoji === input.emoji
                        ),
                    )
                  : [
                      ...message.reactions,
                      {
                        id: `optimistic-${input.messageId}-${input.emoji}`,
                        emoji: input.emoji,
                        userId: session?.user.id ?? "",
                      },
                    ];

                return {
                  ...message,
                  reactions: updatedReactions,
                };
              }),
            })),
          };
        },
      );

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      if (!selectedConversationId || !context?.previousData) {
        return;
      }

      utils.chat.getMessages.setInfiniteData(
        { conversationId: selectedConversationId, limit: 20 },
        context.previousData,
      );
    },
    onSettled: () => {
      if (!selectedConversationId) {
        return;
      }

      void utils.chat.getMessages.invalidate({
        conversationId: selectedConversationId,
        limit: 20,
      });
    },
  });

  const myConversationRole = selectedConversation?.participants.find(
    (participant) => participant.userId === session?.user.id,
  )?.role;
  const canManageGroup =
    myConversationRole === "OWNER" || myConversationRole === "ADMIN";
  const canManageRoles = myConversationRole === "OWNER";
  const canDeleteGroup = myConversationRole === "OWNER";

  const handleCreateConversation = (
    participantIds: string[],
    title?: string,
  ) => {
    createConversation.mutate({ participantIds, title });
  };

  const { data: memberSearchUsers = [], isLoading: isMemberSearchLoading } =
    api.user.searchUsers.useQuery(
      { query: memberQuery.trim() },
      {
        enabled:
          showGroupManager &&
          !!selectedConversationId &&
          memberQuery.trim().length >= 2,
      },
    );

  const addableUsers = memberSearchUsers.filter(
    (user) =>
      user.id !== session?.user.id &&
      !selectedConversation?.participants.some(
        (participant) => participant.userId === user.id,
      ),
  );

  const handleSetParticipantRole = (
    userId: string,
    role: "ADMIN" | "MEMBER",
  ) => {
    if (!selectedConversationId) {
      return;
    }

    setParticipantRoleMutation.mutate({
      conversationId: selectedConversationId,
      userId,
      role,
    });
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

  useEffect(() => {
    setReactionPickerMessageId(null);
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId || !selectedConversation) {
      setGroupTitleDraft("");
      return;
    }

    setGroupTitleDraft(selectedConversation.title ?? "");
  }, [selectedConversationId, selectedConversation]);

  // Ably connection
  useEffect(() => {
    if (!session?.user?.id) return;

    let client: Ably.Realtime | null = null;
    let isCancelled = false;

    void (async () => {
      const { default: AblyLib } = await import("ably");
      if (isCancelled) {
        return;
      }

      client = new AblyLib.Realtime({ authUrl: "/api/ably" });
      setAblyClient(client);
    })();

    return () => {
      isCancelled = true;
      if (client) {
        client.close();
      }
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

    const onNewMessage = (message: Ably.Message) => {
      const typedMessage = message.data as unknown as ChatMessage;

      // If the message is for the current conversation, mark it as read
      if (typedMessage.conversationId === selectedConversationId) {
        markConversationAsRead({ conversationId: selectedConversationId });
      }

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
            let newMessages = [...firstPage.messages];

            // Check if we have an optimistic message to replace
            if (typedMessage.senderId === session?.user.id) {
              // Find the oldest optimistic message
              let foundIndex = -1;
              for (let i = newMessages.length - 1; i >= 0; i--) {
                if (newMessages[i]?.id.startsWith("optimistic-")) {
                  foundIndex = i;
                  break;
                }
              }

              if (foundIndex !== -1) {
                newMessages[foundIndex] = typedMessage;
              } else {
                newMessages = [typedMessage, ...newMessages];
              }
            } else {
              newMessages = [typedMessage, ...newMessages];
            }

            newPages[0] = {
              ...firstPage,
              messages: newMessages,
            };
          }

          return {
            ...oldData,
            pages: newPages,
          };
        },
      );
      scrollToBottom();
    };

    const onTyping = (message: Ably.Message) => {
      const { userId, isTyping } = message.data as {
        userId: string;
        isTyping: boolean;
      };

      if (userId === session?.user.id) return;

      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) next.add(userId);
        else next.delete(userId);
        return next;
      });
    };

    const onReactionUpdate = () => {
      void utils.chat.getMessages.invalidate({
        conversationId: selectedConversationId,
        limit: 20,
      });
    };

    // Subscribe to new messages
    void channel.subscribe("new_message", onNewMessage);

    // Subscribe to typing events
    void channel.subscribe("typing", onTyping);

    // Subscribe to reaction updates and refresh messages.
    void channel.subscribe("reaction_update", onReactionUpdate);

    return () => {
      void channel.unsubscribe("new_message", onNewMessage);
      void channel.unsubscribe("typing", onTyping);
      void channel.unsubscribe("reaction_update", onReactionUpdate);
      setTypingUsers(new Set());
    };
  }, [
    ablyClient,
    selectedConversationId,
    utils,
    markConversationAsRead,
    session?.user.id,
  ]);

  // Keep conversations list live without polling by listening all conversation channels.
  useEffect(() => {
    if (!ablyClient || !conversations?.length) {
      return;
    }

    const subscriptions: Array<{
      channel: ReturnType<Ably.Realtime["channels"]["get"]>;
      handler: (message: Ably.Message) => void;
    }> = [];

    for (const conversation of conversations) {
      const channel = ablyClient.channels.get(
        `conversation-${conversation.id}`,
      );
      const handler = () => {
        void utils.chat.getConversations.invalidate();
      };

      void channel.subscribe("new_message", handler);
      subscriptions.push({ channel, handler });
    }

    return () => {
      for (const item of subscriptions) {
        void item.channel.unsubscribe("new_message", item.handler);
      }
    };
  }, [ablyClient, conversations, utils]);

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

    // Optimistic Update
    const tempId = `optimistic-${Date.now()}`;

    // Build a properly typed sender object from the session values,
    // coercing/guarding fields so we don't assign `any` into a typed object.
    const optimisticSender: ChatMessage["sender"] = {
      id: String(session.user.id),
      name: typeof session.user.name === "string" ? session.user.name : null,
      email: typeof session.user.email === "string" ? session.user.email : null,
      image: typeof session.user.image === "string" ? session.user.image : null,
      emailVerified: null,
      headerImage: null,
      bio: null,
      location: null,
      website: null,
      username: null,
      password: null,
      lastSeen: new Date(),
      pinnedPostId: null,
    } as unknown as ChatMessage["sender"];

    const optimisticMessage: ChatMessage = {
      id: tempId,
      content,
      attachmentUrl: null,
      isSystem: false,
      conversationId: selectedConversationId,
      senderId: String(session.user.id),
      createdAt: new Date(),
      sender: optimisticSender,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            content: replyingTo.content,
            senderId: replyingTo.senderId,
            sender: replyingTo.sender,
          }
        : null,
      reactions: [],
    };

    utils.chat.getMessages.setInfiniteData(
      { conversationId: selectedConversationId, limit: 20 },
      (oldData) => {
        if (!oldData) {
          return {
            pages: [
              {
                messages: [optimisticMessage],
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
            messages: [optimisticMessage, ...firstPage.messages],
          };
        }

        return {
          ...oldData,
          pages: newPages,
        };
      },
    );
    requestAnimationFrame(() => scrollToBottom());

    try {
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        content,
        attachmentUrl: null,
        replyToId: replyingTo?.id ?? null,
      });
      setReplyingTo(null);
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
      const url = await uploadToR2(file);

      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        content: "",
        attachmentUrl: url,
        replyToId: null,
      });
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveGroupTitle = () => {
    if (!selectedConversationId) {
      return;
    }

    updateConversationTitleMutation.mutate({
      conversationId: selectedConversationId,
      title: groupTitleDraft,
    });
  };

  const handleAddParticipant = (userId: string) => {
    if (!selectedConversationId) {
      return;
    }

    addParticipantsMutation.mutate({
      conversationId: selectedConversationId,
      participantIds: [userId],
    });
  };

  const handleRemoveParticipant = (userId: string) => {
    if (!selectedConversationId) {
      return;
    }

    removeParticipantMutation.mutate({
      conversationId: selectedConversationId,
      userId,
    });
  };

  const handleLeaveConversation = () => {
    if (!selectedConversationId) {
      return;
    }

    leaveConversationMutation.mutate({
      conversationId: selectedConversationId,
    });
  };

  const handleOpenReactionPicker = (messageId: string) => {
    setReactionPickerMessageId((prev) =>
      prev === messageId ? null : messageId,
    );
  };

  const clearGestureTimer = () => {
    if (gestureRef.current.longPressTimer) {
      clearTimeout(gestureRef.current.longPressTimer);
      gestureRef.current.longPressTimer = null;
    }
  };

  const handleMessageTouchStart = (
    messageId: string,
    event: React.TouchEvent<HTMLDivElement>,
  ) => {
    if (window.innerWidth >= 768) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;

    gestureRef.current.messageId = messageId;
    gestureRef.current.startX = touch.clientX;
    gestureRef.current.startY = touch.clientY;
    gestureRef.current.longPressTriggered = false;
    clearGestureTimer();

    gestureRef.current.longPressTimer = setTimeout(() => {
      if (gestureRef.current.messageId === messageId) {
        gestureRef.current.longPressTriggered = true;
        handleOpenReactionPicker(messageId);
      }
    }, 450);
  };

  const handleMessageTouchMove = (
    messageId: string,
    event: React.TouchEvent<HTMLDivElement>,
  ) => {
    if (gestureRef.current.messageId !== messageId) return;

    const touch = event.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - gestureRef.current.startX;
    const deltaY = touch.clientY - gestureRef.current.startY;

    if (Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12) {
      clearGestureTimer();
    }
  };

  const handleMessageTouchEnd = (
    messageId: string,
    isMe: boolean,
    event: React.TouchEvent<HTMLDivElement>,
  ) => {
    if (gestureRef.current.messageId !== messageId) return;

    const touch = event.changedTouches[0];
    clearGestureTimer();

    if (!touch || gestureRef.current.longPressTriggered) {
      gestureRef.current.messageId = null;
      gestureRef.current.longPressTriggered = false;
      return;
    }

    const deltaX = touch.clientX - gestureRef.current.startX;
    const deltaY = touch.clientY - gestureRef.current.startY;
    const isHorizontalSwipe =
      Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY);
    const shouldReply = isMe ? deltaX < -50 : deltaX > 50;

    if (isHorizontalSwipe && shouldReply) {
      const message = messages.find((item) => item.id === messageId);
      if (message) {
        setReplyingTo(message);
      }
    }

    gestureRef.current.messageId = null;
    gestureRef.current.longPressTriggered = false;
  };

  const handleMessageTouchCancel = (messageId: string) => {
    if (gestureRef.current.messageId !== messageId) return;

    clearGestureTimer();
    gestureRef.current.messageId = null;
    gestureRef.current.longPressTriggered = false;
  };

  useEffect(() => () => clearGestureTimer(), []);

  const handleSelectReaction = (messageId: string, emoji: string) => {
    toggleReactionMutation.mutate({ messageId, emoji });
    setReactionPickerMessageId(null);
  };

  const handleDeleteConversation = () => {
    if (!selectedConversationId || !canDeleteGroup) {
      return;
    }

    const confirmed = window.confirm(
      "Bu grubu kalici olarak kapatmak istiyor musun?",
    );

    if (!confirmed) {
      return;
    }

    deleteConversationMutation.mutate({
      conversationId: selectedConversationId,
    });
  };

  if (!session) {
    return <div className="p-4 text-center">Sohbet için giriş yapın.</div>;
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] w-full overflow-hidden border-t border-white/20 md:h-dvh">
      {/* Conversations List */}
      <div
        className={`w-full border-r border-white/20 bg-black md:w-1/3 ${
          selectedConversationId ? "hidden md:block" : "block"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/20 p-4">
          <h2 className="text-xl font-bold">Mesajlar</h2>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="rounded-full p-2 hover:bg-white/10"
          >
            <MailPlus size={20} />
          </button>
        </div>
        <div className="h-full overflow-y-auto pb-20">
          {conversations?.map((conversation) => {
            const otherParticipants = conversation.participants.filter(
              (p) => p.userId !== session.user.id,
            );
            const otherParticipant = otherParticipants[0]?.user;
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
                        {getConversationDisplayName(
                          conversation,
                          session.user.id,
                        )}
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
                      {lastMessage
                        ? parseSharedPostMessage(lastMessage.content)
                          ? "Gönderi paylaşıldı"
                          : lastMessage.content ||
                            (lastMessage.attachmentUrl
                              ? "Bir resim gönderdi"
                              : "Henüz mesaj yok")
                        : "Henüz mesaj yok"}
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
      <div
        className={`flex min-h-0 w-full min-w-0 flex-1 flex-col bg-black md:w-2/3 ${
          selectedConversationId ? "block" : "hidden md:flex"
        }`}
      >
        {selectedConversationId ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-white/20 p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversationId(null)}
                  className="mr-2 md:hidden"
                >
                  <ArrowLeft />
                </button>
                {(() => {
                  const conversation = conversations?.find(
                    (c) => c.id === selectedConversationId,
                  );
                  const otherParticipants =
                    conversation?.participants.filter(
                      (p) => p.userId !== session.user.id,
                    ) ?? [];
                  const otherParticipant = otherParticipants[0]?.user;
                  const isOnline =
                    otherParticipants.length === 1 &&
                    otherParticipant &&
                    onlineUsers.has(otherParticipant.id);
                  const otherParticipantData = otherParticipants[0];

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
                          {getConversationDisplayName(
                            conversation,
                            session.user.id,
                          )}
                        </span>
                        {isGroupConversation && (
                          <button
                            type="button"
                            onClick={() => setShowGroupManager(true)}
                            className="mt-1 w-fit rounded-full border border-white/20 px-2 py-0.5 text-xs text-gray-300 hover:bg-white/10"
                          >
                            Grup ayarları
                          </button>
                        )}
                        {otherParticipants.length > 1 ? (
                          <span className="text-xs text-gray-500">
                            {otherParticipants.length} katılımcı
                          </span>
                        ) : isOnline ? (
                          <span className="text-xs text-green-500">
                            Çevrimiçi
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {otherParticipantData?.hasSeenLatest
                              ? otherParticipant?.lastSeen
                                ? `Son görülme ${formatDistanceToNow(
                                    new Date(otherParticipant.lastSeen),
                                    { addSuffix: true },
                                  )}`
                                : "Görüldü"
                              : "Teslim edildi"}
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
              className="min-h-0 flex-1 overflow-y-auto p-4"
            >
              {hasNextPage && (
                <div className="flex justify-center py-2">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    {isFetchingNextPage ? (
                      <Logo className="h-4 w-4 animate-spin" />
                    ) : (
                      "Eski mesajları yükle"
                    )}
                  </button>
                </div>
              )}

              {isLoadingMessages ? (
                <div className="flex justify-center py-4">
                  <Logo className="h-6 w-6 animate-spin text-white" />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((message) => {
                    const isMe = message.senderId === session.user.id;
                    const sharedPost = parseSharedPostMessage(message.content);

                    if (message.isSystem) {
                      return (
                        <div key={message.id} className="flex justify-center">
                          <div className="max-w-[80%] rounded-full border border-white/20 bg-white/5 px-3 py-1 text-center text-xs text-gray-300">
                            {message.content}
                          </div>
                        </div>
                      );
                    }

                    const groupedReactions = message.reactions.reduce<
                      Record<string, { count: number; reactedByMe: boolean }>
                    >((acc, reaction) => {
                      const key = String(reaction.emoji);
                      let entry = acc[key];

                      if (!entry) {
                        entry = { count: 0, reactedByMe: false };
                        acc[key] = entry;
                      }

                      entry.count += 1;

                      if (reaction.userId === session.user.id) {
                        entry.reactedByMe = true;
                      }

                      return acc;
                    }, {});

                    const messageActions = (
                      <div
                        className={`absolute top-0 z-10 flex flex-col gap-2 transition-opacity duration-150 ${
                          isMe
                            ? "left-0 -translate-x-[calc(100%+0.5rem)]"
                            : "right-0 translate-x-[calc(100%+0.5rem)]"
                        } ${
                          reactionPickerMessageId === message.id
                            ? "pointer-events-auto opacity-100"
                            : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                        }`}
                      >
                        {reactionPickerMessageId === message.id && (
                          <div
                            className={`absolute bottom-full z-50 mb-2 ${
                              isMe ? "right-0" : "left-0"
                            }`}
                          >
                            <EmojiPicker
                              theme={Theme.DARK}
                              onEmojiClick={(emojiData: EmojiClickData) => {
                                handleSelectReaction(
                                  message.id,
                                  emojiData.emoji,
                                );
                              }}
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenReactionPicker(message.id)}
                          title="Tepki ver"
                          aria-label="Tepki ver"
                          className="rounded-full border border-white/20 bg-white/5 p-1.5 hover:bg-white/10"
                        >
                          <SmilePlus size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setReplyingTo(message)}
                          title="Yanıtla"
                          aria-label="Yanıtla"
                          className="rounded-full border border-white/20 bg-white/5 p-1.5 hover:bg-white/10"
                        >
                          <Reply size={14} />
                        </button>
                      </div>
                    );

                    return (
                      <div
                        key={message.id}
                        className={`group relative flex w-full ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className="relative max-w-[70%] touch-pan-y"
                          onTouchStart={(event) =>
                            handleMessageTouchStart(message.id, event)
                          }
                          onTouchMove={(event) =>
                            handleMessageTouchMove(message.id, event)
                          }
                          onTouchEnd={(event) =>
                            handleMessageTouchEnd(message.id, isMe, event)
                          }
                          onTouchCancel={() =>
                            handleMessageTouchCancel(message.id)
                          }
                          onDoubleClick={(e) => {
                            e.preventDefault();
                            handleOpenReactionPicker(message.id);
                          }}
                        >
                          {messageActions}
                          <div
                            className={`rounded-2xl px-4 py-2 select-none ${
                              isMe
                                ? "bg-blue-500 text-white"
                                : "bg-gray-800 text-white"
                            }`}
                          >
                            {message.replyTo && (
                              <div className="mb-2 rounded-xl border border-white/20 bg-black/20 p-2 text-xs text-gray-200">
                                <div className="font-semibold text-gray-300">
                                  {message.replyTo.sender.name ??
                                    message.replyTo.sender.username ??
                                    "Kullanıcı"}
                                </div>
                                <div className="line-clamp-2 text-gray-400">
                                  {message.replyTo.content || "Mesaj"}
                                </div>
                              </div>
                            )}

                            {sharedPost ? (
                              <Link
                                href={`/post/${sharedPost.postId}`}
                                className="block rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
                              >
                                <div className="mb-2 text-xs tracking-[0.2em] text-gray-400 uppercase">
                                  Paylaşılan gönderi
                                </div>
                                {sharedPost.content ? (
                                  <p className="line-clamp-4 text-sm whitespace-pre-wrap text-gray-100">
                                    {sharedPost.content}
                                  </p>
                                ) : (
                                  <p className="text-sm text-gray-100">
                                    Medya gönderisi
                                  </p>
                                )}
                                {sharedPost.mediaUrls.length > 0 && (
                                  <div className="mt-3 grid grid-cols-3 gap-2">
                                    {sharedPost.mediaUrls
                                      .slice(0, 3)
                                      .map((url) => (
                                        <Image
                                          key={url}
                                          src={url}
                                          alt="Paylaşılan gönderi medyası"
                                          width={160}
                                          height={160}
                                          className="h-20 w-full rounded-xl object-cover"
                                        />
                                      ))}
                                  </div>
                                )}
                              </Link>
                            ) : message.attachmentUrl ? (
                              <Image
                                src={message.attachmentUrl}
                                alt="Ek"
                                width={300}
                                height={200}
                                className="mb-2 max-h-60 max-w-xs rounded-lg object-cover sm:max-w-sm"
                              />
                            ) : null}
                            {!sharedPost && message.content && (
                              <p className="whitespace-pre-wrap">
                                {linkifyText(
                                  message.content,
                                  (url, i) => (
                                    <a
                                      key={i}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-200 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {url}
                                    </a>
                                  ),
                                  (username, i) => (
                                    <span
                                      key={i}
                                      role="link"
                                      tabIndex={0}
                                      className="cursor-pointer text-blue-200 hover:underline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleChatLinkClick(
                                          `/profile/${username}`,
                                        );
                                      }}
                                      onKeyDown={(e) =>
                                        handleChatLinkKeyDown(
                                          e,
                                          `/profile/${username}`,
                                        )
                                      }
                                    >
                                      @{username}
                                    </span>
                                  ),
                                  (tag, i) => (
                                    <span
                                      key={i}
                                      role="link"
                                      tabIndex={0}
                                      className="cursor-pointer text-cyan-300 hover:underline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleChatLinkClick(`/hashtag/${tag}`);
                                      }}
                                      onKeyDown={(e) =>
                                        handleChatLinkKeyDown(
                                          e,
                                          `/hashtag/${tag}`,
                                        )
                                      }
                                    >
                                      #{tag}
                                    </span>
                                  ),
                                )}
                              </p>
                            )}

                            <div className="mt-2 flex flex-wrap gap-1">
                              {Object.entries(groupedReactions).map(
                                ([emoji, info]) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() =>
                                      handleSelectReaction(message.id, emoji)
                                    }
                                    className={`rounded-full border px-2 py-0.5 text-xs ${
                                      info.reactedByMe
                                        ? "border-blue-400/60 bg-blue-500/20"
                                        : "border-white/20 bg-white/5"
                                    }`}
                                  >
                                    {emoji} {info.count}
                                  </button>
                                ),
                              )}
                            </div>

                            {message.id ===
                              messages[messages.length - 1]?.id && (
                              <div className="mt-1 flex items-center justify-end gap-1">
                                <span className="text-xs opacity-70">
                                  {formatDistanceToNow(
                                    new Date(message.createdAt),
                                    {
                                      addSuffix: true,
                                    },
                                  )}
                                </span>
                                {isMe && (
                                  <span className="text-[10px] opacity-70">
                                    {conversations
                                      ?.find(
                                        (c) => c.id === selectedConversationId,
                                      )
                                      ?.participants.find(
                                        (p) => p.userId !== session.user.id,
                                      )?.hasSeenLatest
                                      ? " • Görüldü"
                                      : " • Gönderildi"}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {!isMe ? messageActions : null}
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {typingUsers.size > 0 && (
                    <div className="flex justify-start">
                      <div className="rounded-2x animate-pulse px-4 py-2 text-sm text-gray-400 italic">
                        Yazıyor...
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
              {replyingTo && (
                <div className="mb-3 rounded-2xl border border-blue-400/30 bg-blue-500/10 p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold text-blue-200">
                      Yanıtlanıyor
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-xs text-blue-200/80 hover:text-blue-100"
                    >
                      Vazgeç
                    </button>
                  </div>
                  <div className="line-clamp-2 text-gray-300">
                    {replyingTo.content || "Mesaj"}
                  </div>
                </div>
              )}

              <div className="relative flex items-center gap-2">
                {showInputMenu && (
                  <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-2 rounded-xl border border-white/20 bg-gray-900 p-2 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setShowInputMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="flex items-center gap-2 rounded-lg p-2 text-sm whitespace-nowrap text-gray-200 hover:bg-white/10"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <ImageIcon size={18} />
                      )}
                      Medya Yükle
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInputMenu(false);
                        setShowEmojiPicker((prev) => !prev);
                      }}
                      className="flex items-center gap-2 rounded-lg p-2 text-sm whitespace-nowrap text-gray-200 hover:bg-white/10"
                    >
                      <SmilePlus size={18} />
                      Emoji Ekle
                    </button>
                  </div>
                )}

                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 z-50 mb-2 md:left-10">
                    <EmojiPicker
                      theme={Theme.DARK}
                      onEmojiClick={(emojiData: EmojiClickData) => {
                        setNewMessage((prev) => prev + emojiData.emoji);
                      }}
                    />
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker(false);
                    setShowInputMenu((prev) => !prev);
                  }}
                  className="p-2 text-blue-500 hover:text-blue-400"
                >
                  <Plus size={24} />
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Mesaj yaz..."
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
            Sohbet başlatmak için konuşma seçin
          </div>
        )}
      </div>
      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onCreateConversation={handleCreateConversation}
        />
      )}

      {showGroupManager && selectedConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-black p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Grup ayarları</h3>
              <button
                type="button"
                onClick={() => setShowGroupManager(false)}
                className="rounded border border-white/20 px-2 py-1 text-sm hover:bg-white/10"
              >
                Kapat
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm text-gray-300">
                Grup adı
              </label>
              <div className="flex gap-2">
                <input
                  value={groupTitleDraft}
                  onChange={(event) => setGroupTitleDraft(event.target.value)}
                  placeholder="Grup adı"
                  className="flex-1 rounded-xl border border-white/20 bg-black px-3 py-2 text-white"
                />
                <button
                  type="button"
                  onClick={handleSaveGroupTitle}
                  className="rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                  disabled={
                    updateConversationTitleMutation.isPending || !canManageGroup
                  }
                >
                  Kaydet
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm text-gray-300">
                Katılımcı ekle
              </label>
              <input
                value={memberQuery}
                onChange={(event) => setMemberQuery(event.target.value)}
                placeholder="Kullanıcı ara"
                className="mb-2 w-full rounded-xl border border-white/20 bg-black px-3 py-2 text-white"
              />
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {isMemberSearchLoading ? (
                  <div className="text-sm text-gray-500">Aranıyor...</div>
                ) : addableUsers.length > 0 ? (
                  addableUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleAddParticipant(user.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-left hover:bg-white/10"
                      disabled={
                        addParticipantsMutation.isPending || !canManageGroup
                      }
                    >
                      <span>
                        {user.name ?? user.username} @{user.username ?? user.id}
                      </span>
                      <span className="text-xs text-gray-400">Ekle</span>
                    </button>
                  ))
                ) : memberQuery.trim().length >= 2 ? (
                  <div className="text-sm text-gray-500">
                    Eklenebilecek kullanıcı yok.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm text-gray-300">
                Katılımcılar
              </label>
              <div className="max-h-44 space-y-2 overflow-y-auto">
                {selectedConversation.participants.map((participant) => {
                  const isMe = participant.userId === session.user.id;
                  const isOwner = participant.role === "OWNER";
                  const isAdmin = participant.role === "ADMIN";

                  return (
                    <div
                      key={participant.userId}
                      className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span>
                          {participant.user.name ??
                            participant.user.username ??
                            "Kullanıcı"}
                          {isMe ? " (sen)" : ""}
                        </span>
                        <span className="text-xs text-gray-500">
                          {isOwner ? "owner" : isAdmin ? "admin" : "member"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {!isMe && canManageRoles && !isOwner && (
                          <button
                            type="button"
                            onClick={() =>
                              handleSetParticipantRole(
                                participant.userId,
                                isAdmin ? "MEMBER" : "ADMIN",
                              )
                            }
                            className="rounded border border-blue-400/40 px-2 py-1 text-xs text-blue-300 hover:bg-blue-500/10"
                            disabled={setParticipantRoleMutation.isPending}
                          >
                            {isAdmin ? "Admin al" : "Admin yap"}
                          </button>
                        )}

                        {!isMe && canManageRoles && !isOwner && (
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveParticipant(participant.userId)
                            }
                            className="rounded border border-red-400/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                            disabled={removeParticipantMutation.isPending}
                          >
                            Çıkar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLeaveConversation}
              disabled={leaveConversationMutation.isPending}
              className="w-full rounded-xl border border-red-400/40 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
            >
              Gruptan ayrıl
            </button>

            {canDeleteGroup && (
              <button
                type="button"
                onClick={handleDeleteConversation}
                disabled={deleteConversationMutation.isPending}
                className="mt-2 w-full rounded-xl border border-red-500/60 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-600/15"
              >
                Grubu kapat
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
