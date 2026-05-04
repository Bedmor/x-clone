"use client";

import Link from "next/link";
import Image from "next/image";
import { useDeferredValue, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { api } from "~/trpc/react";
import { UserAvatar } from "./UserAvatar";

const SHARE_MESSAGE_PREFIX = "[POST_SHARE]";

type SharedPostMessage = {
  kind: "post";
  postId: number;
  content: string | null;
  mediaUrls: string[];
};

function buildSharedPostMessage(input: {
  postId: number;
  content?: string | null;
  mediaUrls?: string[];
}) {
  const payload: SharedPostMessage = {
    kind: "post",
    postId: input.postId,
    content: input.content?.trim() ? input.content.trim() : null,
    mediaUrls: input.mediaUrls ?? [],
  };

  return `${SHARE_MESSAGE_PREFIX}\n${JSON.stringify(payload)}`;
}

function parseSharedPostMessage(content: string) {
  if (!content.startsWith(SHARE_MESSAGE_PREFIX)) {
    return null;
  }

  const payloadText = content.slice(SHARE_MESSAGE_PREFIX.length).trim();

  if (!payloadText) {
    return null;
  }

  try {
    const parsed = JSON.parse(payloadText) as Partial<SharedPostMessage>;

    if (
      parsed.kind !== "post" ||
      typeof parsed.postId !== "number" ||
      !Array.isArray(parsed.mediaUrls)
    ) {
      return null;
    }

    return {
      kind: "post" as const,
      postId: parsed.postId,
      content: typeof parsed.content === "string" ? parsed.content : null,
      mediaUrls: parsed.mediaUrls.filter(
        (url): url is string => typeof url === "string" && url.length > 0,
      ),
    };
  } catch {
    return null;
  }
}

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
  const [selectedRecipients, setSelectedRecipients] = useState<
    Array<{
      id: string;
      name: string | null;
      username: string | null;
      image: string | null;
    }>
  >([]);
  const [isSendingAll, setIsSendingAll] = useState(false);
  const deferredQuery = useDeferredValue(query.trim());
  const { data: session } = useSession();

  const { data: users = [], isLoading } = api.user.searchUsers.useQuery(
    { query: deferredQuery },
    { enabled: isOpen && deferredQuery.length >= 2 },
  );

  const { data: conversations = [], isLoading: isLoadingRecent } =
    api.chat.getConversations.useQuery(undefined, {
      enabled: isOpen && deferredQuery.length < 2 && !!session?.user?.id,
      staleTime: 30_000,
    });

  const recentUserId = session?.user?.id;

  const isSelectedRecipient = (userId: string) =>
    selectedRecipients.some((recipient) => recipient.id === userId);

  const toggleRecipient = (user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  }) => {
    if (user.id === session?.user?.id) {
      return;
    }

    setSelectedRecipients((current) =>
      current.some((recipient) => recipient.id === user.id)
        ? current.filter((recipient) => recipient.id !== user.id)
        : [...current, user],
    );
  };

  const recentConversationCards = conversations
    .slice(0, 5)
    .map((conversation) => {
      const otherParticipant = conversation.participants.find(
        (participant) => participant.userId !== recentUserId,
      )?.user;

      if (!otherParticipant) {
        return null;
      }

      const lastMessage = conversation.messages[0];
      const trimmedContent = lastMessage?.content?.trim();
      const lastMessagePreview = lastMessage
        ? parseSharedPostMessage(lastMessage.content)
          ? "Gönderi paylaşıldı"
          : trimmedContent && trimmedContent.length > 0
            ? trimmedContent
            : lastMessage.attachmentUrl
              ? "Bir resim gönderdi"
              : "Henüz mesaj yok"
        : "Henüz mesaj yok";

      return {
        conversationId: conversation.id,
        user: otherParticipant,
        lastMessage,
        lastMessagePreview,
      };
    })
    .filter(
      (
        card,
      ): card is {
        conversationId: string;
        user: (typeof conversations)[number]["participants"][number]["user"];
        lastMessage:
          | (typeof conversations)[number]["messages"][number]
          | undefined;
        lastMessagePreview: string;
      } => card !== null,
    );

  const createConversation = api.chat.createConversation.useMutation();
  const sendMessage = api.chat.sendMessage.useMutation({
    onError: (error) => {
      alert(error.message);
    },
  });

  const shareText = useMemo(() => {
    return buildSharedPostMessage({ postId, content, mediaUrls });
  }, [content, mediaUrls, postId]);

  const sharePreview = useMemo(
    () => parseSharedPostMessage(shareText),
    [shareText],
  );

  const handleSendSelected = async () => {
    if (selectedRecipients.length === 0) {
      return;
    }

    setIsSendingAll(true);

    try {
      for (const recipient of selectedRecipients) {
        const conversation = await createConversation.mutateAsync({
          participantIds: [recipient.id],
        });

        await sendMessage.mutateAsync({
          conversationId: conversation.id,
          content: shareText,
        });
      }

      setSelectedRecipients([]);
      setQuery("");
      alert("Gönderi DM ile gönderildi.");
      onClose();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsSendingAll(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end bg-black/70 p-4 backdrop-blur-sm sm:justify-center">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0b0f14] shadow-2xl shadow-black/50 sm:rounded-[28px]">
        <div className="shrink-0 border-b border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-xs tracking-[0.28em] text-gray-400 uppercase">
                Direct message
              </div>
              <h3 className="mt-2 text-2xl font-semibold">
                Gönderiyi DM ile gönder
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                Son konuşmalardan seç veya kullanıcı ara.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 px-3 py-1 text-sm text-gray-300 hover:bg-white/10"
            >
              Kapat
            </button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {selectedRecipients.length > 0 ? (
              selectedRecipients.map((recipient) => (
                <button
                  key={recipient.id}
                  type="button"
                  onClick={() => toggleRecipient(recipient)}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-500/20"
                >
                  <span>@{recipient.username ?? recipient.id}</span>
                  <span className="text-xs text-cyan-100/80">kaldir</span>
                </button>
              ))
            ) : (
              <div className="text-sm text-gray-500">
                Göndermek için bir veya daha fazla kişi seç.
              </div>
            )}
          </div>

          {sharePreview && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 text-xs tracking-[0.2em] text-gray-400 uppercase">
                Gönderi önizleme
              </div>
              <Link
                href={`/post/${postId}`}
                className="block rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-white/5"
              >
                {sharePreview.content ? (
                  <p className="line-clamp-4 text-sm whitespace-pre-wrap text-gray-200">
                    {sharePreview.content}
                  </p>
                ) : (
                  <p className="text-sm text-gray-200">Medya gönderisi</p>
                )}
                {sharePreview.mediaUrls.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {sharePreview.mediaUrls.slice(0, 3).map((url) => (
                      <Image
                        key={url}
                        src={url}
                        alt="Gönderi medyası"
                        width={160}
                        height={112}
                        className="h-20 w-full rounded-xl object-cover"
                      />
                    ))}
                  </div>
                )}
              </Link>
            </div>
          )}
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-white/10 p-5 lg:border-r lg:border-b-0">
            <div className="relative mb-4">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Kullanıcı ara"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-cyan-500"
              />
            </div>

            {deferredQuery.length === 0 ? (
              <div>
                <div className="mb-3 text-xs tracking-[0.2em] text-gray-400 uppercase">
                  Son konuşmalar
                </div>
                <div className="space-y-2">
                  {isLoadingRecent ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
                      Yükleniyor...
                    </div>
                  ) : recentConversationCards.length > 0 ? (
                    recentConversationCards.map((card) => (
                      <button
                        key={card.conversationId}
                        onClick={() => toggleRecipient(card.user)}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                          isSelectedRecipient(card.user.id)
                            ? "border-cyan-400/50 bg-cyan-500/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                        disabled={isSendingAll}
                      >
                        <UserAvatar
                          src={card.user.image}
                          alt={card.user.name}
                          className="h-11 w-11"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate font-medium text-white">
                              {card.user.name ?? "Bilinmeyen"}
                            </div>
                            {card.lastMessage && (
                              <div className="shrink-0 text-xs text-gray-500">
                                {new Date(
                                  card.lastMessage.createdAt,
                                ).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <div className="truncate text-sm text-gray-400">
                            {card.lastMessagePreview}
                          </div>
                        </div>
                        {isSelectedRecipient(card.user.id) && (
                          <div className="rounded-full bg-cyan-500 px-2 py-1 text-xs font-semibold text-white">
                            Seçildi
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-gray-400">
                      Henüz son konuşma yok.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-3 text-xs tracking-[0.2em] text-gray-400 uppercase">
                  Arama sonuçları
                </div>
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {isLoading ? (
                    <div className="text-sm text-gray-400">Aranıyor...</div>
                  ) : users.length > 0 ? (
                    users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => toggleRecipient(user)}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                          isSelectedRecipient(user.id)
                            ? "border-cyan-400/50 bg-cyan-500/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                        disabled={isSendingAll}
                      >
                        <UserAvatar
                          src={user.image}
                          alt={user.name}
                          className="h-11 w-11"
                        />
                        <div>
                          <div className="font-medium text-white">
                            {user.name ?? "Bilinmeyen"}
                          </div>
                          <div className="text-sm text-gray-400">
                            @{user.username ?? user.id}
                          </div>
                        </div>
                        {isSelectedRecipient(user.id) && (
                          <div className="rounded-full bg-cyan-500 px-2 py-1 text-xs font-semibold text-white">
                            Seçildi
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="text-sm text-gray-400">
                      Kullanıcı bulunamadı.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-5">
            <div className="mb-3 text-xs tracking-[0.2em] text-gray-400 uppercase">
              Hızlı gönderim
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
              Son konuşmalardan birini tek tıkla seç. Arama iki karakterden
              sonra çalışır ve sonuçları hafifletilmiş veriyle getirir.
            </div>
            <button
              type="button"
              onClick={() => void handleSendSelected()}
              disabled={selectedRecipients.length === 0 || isSendingAll}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSendingAll ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Gönderiliyor...
                </>
              ) : (
                <span>Seçilenlere gönder ({selectedRecipients.length})</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
