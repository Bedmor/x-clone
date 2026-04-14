"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { ReplyModal } from "./ReplyModal";
import { QuoteModal } from "./QuoteModal";
import {
  Heart,
  Bookmark,
  BookmarkCheck,
  MessageCircle,
  Repeat,
  Share2,
  Trash2,
  MoreHorizontal,
  Pin,
  PinOff,
  Flag,
} from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { useSession } from "next-auth/react";
import { SharePostModal } from "./SharePostModal";

type PollOption = {
  id: number;
  text: string;
  voteCount: number;
  hasVoted: boolean;
};

export type PostWithUser = {
  id: number;
  content: string | null;
  mediaUrls?: string[];
  createdAt: Date | string;
  parentId: number | null;
  isLiked: boolean;
  isBookmarked?: boolean;
  isReposted?: boolean;
  isPinned?: boolean;
  createdBy: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
  _count: {
    likes: number;
    replies: number;
    reposts: number;
  };
  poll?: {
    totalVotes: number;
    options: PollOption[];
  } | null;
  repostOf?: PostWithUser | null;
};

export const PostItem = React.memo(function PostItem({
  post,
}: {
  post: PostWithUser;
}) {
  const { data: session } = useSession();
  const isSimpleRepost = !!post.repostOf && !post.content;
  const dp = isSimpleRepost && post.repostOf ? post.repostOf : post;
  const dpCount = dp._count ?? { likes: 0, replies: 0, reposts: 0 };
  const mediaUrls = (dp.mediaUrls ?? []).filter(
    (url): url is string => typeof url === "string" && url.length > 0,
  );

  const [isReplyOpen, setIsReplyOpen] = useState<boolean>(false);
  const [isQuoteOpen, setIsQuoteOpen] = useState<boolean>(false);
  const [showRepostMenu, setShowRepostMenu] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(dp.isLiked);
  const [likesCount, setLikesCount] = useState<number>(dpCount.likes);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(
    dp.isBookmarked ?? false,
  );
  const [isReposted, setIsReposted] = useState<boolean>(dp.isReposted ?? false);
  const [repostsCount, setRepostsCount] = useState<number>(dpCount.reposts);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(
    dp.poll?.options.find((option: PollOption) => option.hasVoted)?.id ?? null,
  );

  const utils = api.useUtils();

  const pinPost = api.user.pinPost.useMutation({
    onSuccess: () => {
      void utils.user.getProfile.invalidate();
      void utils.user.getPosts.invalidate();
      void utils.post.getAll.invalidate();
      setShowMenu(false);
    },
  });

  const unpinPost = api.user.unpinPost.useMutation({
    onSuccess: () => {
      void utils.user.getProfile.invalidate();
      void utils.user.getPosts.invalidate();
      void utils.post.getAll.invalidate();
      setShowMenu(false);
    },
  });

  const toggleLike = api.post.toggleLike.useMutation({
    onMutate: async () => {
      const wasLiked = isLiked;
      setIsLiked(!wasLiked);
      setLikesCount((prev: number) => (wasLiked ? prev - 1 : prev + 1));
    },
    onError: () => {
      setIsLiked(dp.isLiked);
      setLikesCount(dpCount.likes);
    },
    onSettled: () => {
      void utils.post.getAll.invalidate();
      void utils.post.getPost.invalidate({ id: dp.id });
    },
  });

  const toggleBookmark = api.post.toggleBookmark.useMutation({
    onMutate: async () => {
      setIsBookmarked((prev) => !prev);
    },
    onError: () => {
      setIsBookmarked(dp.isBookmarked ?? false);
    },
    onSettled: () => {
      void utils.post.getAll.invalidate();
      void utils.post.getPost.invalidate({ id: dp.id });
      void utils.post.getBookmarks.invalidate();
    },
  });

  const toggleRepost = api.post.toggleRepost.useMutation({
    onMutate: async () => {
      const wasReposted = isReposted;
      setIsReposted(!wasReposted);
      setRepostsCount((prev: number) => (wasReposted ? prev - 1 : prev + 1));
    },
    onError: () => {
      setIsReposted(dp.isReposted ?? false);
      setRepostsCount(dpCount.reposts);
    },
    onSettled: () => {
      void utils.post.getAll.invalidate();
      void utils.post.getPost.invalidate({ id: dp.id });
    },
  });

  const votePoll = api.post.votePoll.useMutation({
    onMutate: async ({ optionId }) => {
      setSelectedOptionId(optionId);
    },
    onSettled: () => {
      void utils.post.getAll.invalidate();
      void utils.post.getPost.invalidate({ id: dp.id });
      void utils.user.getProfile.invalidate();
      void utils.post.getBookmarks.invalidate();
    },
  });

  const deletePost = api.post.delete.useMutation({
    onSuccess: () => {
      void utils.post.getAll.invalidate();
      if (dp.parentId) {
        void utils.post.getPost.invalidate({ id: dp.parentId });
      }
      // If we are on the post page itself, we might want to redirect, but that requires more context.
      // For now, invalidating queries is sufficient for the feed.
    },
  });

  const handleReportPost = async () => {
    const reasonInput = window.prompt(
      "Rapor sebebi (SPAM, TACİZ, NEFRET, ŞİDDET, NSFW, YANLIŞ BİLGİ, DİĞER)",
      "SPAM",
    );
    if (!reasonInput) return;

    const reason = reasonInput.trim().toUpperCase();
    const validReasons = new Set([
      "SPAM",
      "HARASSMENT",
      "HATE",
      "VIOLENCE",
      "NSFW",
      "MISINFORMATION",
      "OTHER",
    ]);

    if (!validReasons.has(reason)) {
      alert("Lütfen listelenen sebeplerden birini kullanın.");
      return;
    }

    const details = window.prompt("İsteğe bağlı detaylar", "") ?? undefined;

    setIsReporting(true);
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: dp.id,
          reason,
          details: details?.trim() ? details : undefined,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        alert(result.error ?? "Rapor gönderilemedi.");
        return;
      }

      alert("Teşekkürler, raporunuz gönderildi.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Rapor gönderilemedi.");
    } finally {
      setIsReporting(false);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/post/${dp.id}`;
    await navigator.clipboard.writeText(url);
    setShowShareMenu(false);
    alert("Gönderi bağlantısı kopyalandı.");
  };

  const handleNativeShare = async () => {
    const url = `${window.location.origin}/post/${dp.id}`;
    const text = dp.content?.trim() ?? "Bu gönderiye bak";

    try {
      if (navigator.share) {
        await navigator.share({ title: "Gönderi", text, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Paylaşım API'si kullanılamıyor, bağlantı kopyalandı.");
      }
    } finally {
      setShowShareMenu(false);
    }
  };

  const handleOpenShareTarget = (target: "whatsapp" | "telegram" | "x") => {
    const url = `${window.location.origin}/post/${dp.id}`;
    const text = dp.content?.trim() ?? "Bu gönderiye bak";
    const encodedText = encodeURIComponent(`${text}\n${url}`);
    const encodedUrl = encodeURIComponent(url);

    const targetUrl =
      target === "whatsapp"
        ? `https://wa.me/?text=${encodedText}`
        : target === "telegram"
          ? `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
          : `https://twitter.com/intent/tweet?text=${encodedText}`;

    window.open(targetUrl, "_blank", "noopener,noreferrer");
    setShowShareMenu(false);
  };

  return (
    <>
      <div className="border-b border-white/20 p-4 hover:bg-white/5">
        {isSimpleRepost && (
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Repeat className="h-4 w-4" />
            <Link
              href={`/profile/${post.createdBy.id}`}
              className="hover:underline"
            >
              {post.createdBy.name} yeniden paylaştı
            </Link>
          </div>
        )}
        <div className="flex gap-3">
          <UserAvatar
            src={dp.createdBy.image}
            alt={dp.createdBy.name}
            className="h-10 w-10"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${dp.createdBy.id}`}
                className="font-bold hover:underline"
              >
                {dp.createdBy.name ?? "Bilinmeyen"}
              </Link>
              <Link
                href={`/profile/${dp.createdBy.id}`}
                className="text-gray-500 hover:underline"
              >
                @{dp.createdBy.username ?? dp.createdBy.id}
              </Link>
              <span className="text-gray-500">·</span>
              <span className="text-gray-500">
                {new Date(dp.createdAt).toLocaleDateString()}
              </span>
            </div>
            <Link
              href={`/post/${dp.id}`}
              className="mt-1 block whitespace-pre-wrap"
            >
              {dp.content
                ?.split(/(@\w+|#\w+)/g)
                .map((part: string, i: number) => {
                  if (part.startsWith("@")) {
                    const username = part.slice(1);
                    return (
                      <Link
                        key={i}
                        href={`/profile/${username}`}
                        className="text-blue-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {part}
                      </Link>
                    );
                  }
                  if (part.startsWith("#")) {
                    const tag = part.slice(1);
                    return (
                      <Link
                        key={i}
                        href={`/hashtag/${tag}`}
                        className="text-cyan-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {part}
                      </Link>
                    );
                  }
                  return part;
                })}
            </Link>

            {mediaUrls.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {mediaUrls.map((url: string) => {
                  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);
                  return (
                    <div
                      key={url}
                      className="overflow-hidden rounded-xl border border-white/20"
                    >
                      {isVideo ? (
                        <video
                          src={url}
                          className="h-56 w-full object-cover"
                          controls
                        />
                      ) : (
                        <Image
                          src={url}
                          alt="Gönderi medyası"
                          width={1024}
                          height={1024}
                          unoptimized
                          className="h-56 w-full object-cover"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {dp.poll && (
              <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-semibold text-gray-400">Anket</div>
                <div className="space-y-2">
                  {dp.poll.options.map((option: PollOption) => {
                    const isSelected = selectedOptionId === option.id;
                    const totalVotes = dp.poll?.totalVotes ?? 0;
                    const percentage =
                      totalVotes > 0
                        ? Math.round((option.voteCount / totalVotes) * 100)
                        : 0;

                    return (
                      <button
                        key={option.id}
                        onClick={() => votePoll.mutate({ optionId: option.id })}
                        className={`w-full overflow-hidden rounded-xl border px-3 py-2 text-left transition ${
                          isSelected
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-white/10 bg-black/20 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{option.text}</span>
                          <span className="text-sm text-gray-400">
                            {percentage}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs text-gray-500">
                  {dp.poll.totalVotes} oy
                </div>
              </div>
            )}

            {dp.repostOf && (
              <Link
                href={`/post/${dp.repostOf.id}`}
                className="mt-3 block rounded-xl border border-white/20 p-3 hover:bg-white/5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  <UserAvatar
                    src={dp.repostOf.createdBy.image}
                    alt={dp.repostOf.createdBy.name}
                    className="h-5 w-5"
                  />
                  <span className="font-bold">
                    {dp.repostOf.createdBy.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    @
                    {dp.repostOf.createdBy.username ?? dp.repostOf.createdBy.id}
                  </span>
                  <span className="text-sm text-gray-500">
                    · {new Date(dp.repostOf.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1 text-sm">{dp.repostOf.content}</div>
              </Link>
            )}

            <div className="mt-3 flex gap-4 text-gray-500">
              <button
                onClick={() => toggleLike.mutate({ postId: dp.id })}
                className={`flex items-center gap-1 hover:text-red-500 ${
                  isLiked ? "text-red-500" : ""
                }`}
              >
                <Heart className={isLiked ? "fill-current" : ""} />
                <span>{likesCount}</span>
              </button>
              <button
                onClick={() => setIsReplyOpen(true)}
                className="flex items-center gap-1 hover:text-blue-500"
              >
                <MessageCircle />
                <span>{dpCount.replies}</span>
              </button>
              {session && (
                <button
                  onClick={() => toggleBookmark.mutate({ postId: dp.id })}
                  className={`flex items-center gap-1 hover:text-yellow-400 ${
                    isBookmarked ? "text-yellow-400" : ""
                  }`}
                >
                  {isBookmarked ? <BookmarkCheck /> : <Bookmark />}
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowRepostMenu(!showRepostMenu)}
                  className={`flex items-center gap-1 hover:text-green-500 ${
                    isReposted ? "text-green-500" : ""
                  }`}
                >
                  <Repeat className={isReposted ? "text-green-500" : ""} />
                  <span>{repostsCount}</span>
                </button>
                {showRepostMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowRepostMenu(false)}
                    />
                    <div className="absolute top-full right-0 z-20 mt-1 flex w-32 flex-col overflow-hidden rounded-lg border border-white/20 bg-black shadow-xl">
                      <button
                        onClick={() => {
                          toggleRepost.mutate({ postId: dp.id });
                          setShowRepostMenu(false);
                        }}
                        className="px-4 py-2 text-left hover:bg-white/10"
                      >
                        Yeniden paylaş
                      </button>
                      <button
                        onClick={() => {
                          setIsQuoteOpen(true);
                          setShowRepostMenu(false);
                        }}
                        className="px-4 py-2 text-left hover:bg-white/10"
                      >
                        Alıntı yap
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu((current) => !current)}
                  className="flex items-center gap-1 hover:text-cyan-400"
                >
                  <Share2 />
                </button>
                {showShareMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowShareMenu(false)}
                    />
                    <div className="absolute top-full right-0 z-20 mt-1 flex w-44 flex-col overflow-hidden rounded-lg border border-white/20 bg-black shadow-xl">
                      {session && (
                        <button
                          onClick={() => {
                            setIsShareModalOpen(true);
                            setShowShareMenu(false);
                          }}
                          className="px-4 py-2 text-left hover:bg-white/10"
                        >
                          DM ile gönder
                        </button>
                      )}
                      <button
                        onClick={() => void handleCopyLink()}
                        className="px-4 py-2 text-left hover:bg-white/10"
                      >
                        Bağlantıyı kopyala
                      </button>
                      <button
                        onClick={() => handleOpenShareTarget("whatsapp")}
                        className="px-4 py-2 text-left hover:bg-white/10"
                      >
                        WhatsApp&apos;ta paylaş
                      </button>
                      <button
                        onClick={() => handleOpenShareTarget("telegram")}
                        className="px-4 py-2 text-left hover:bg-white/10"
                      >
                        Telegram&apos;da paylaş
                      </button>
                      <button
                        onClick={() => handleOpenShareTarget("x")}
                        className="px-4 py-2 text-left hover:bg-white/10"
                      >
                        X&apos;te paylaş
                      </button>
                      <button
                        onClick={() => void handleNativeShare()}
                        className="px-4 py-2 text-left hover:bg-white/10"
                      >
                        Diğer paylaşım seçenekleri
                      </button>
                    </div>
                  </>
                )}
              </div>
              {session && session.user.id !== dp.createdBy.id && (
                <button
                  onClick={() => void handleReportPost()}
                  disabled={isReporting}
                  className="flex items-center gap-1 hover:text-orange-400 disabled:opacity-50"
                  title="Gönderiyi bildir"
                >
                  <Flag />
                </button>
              )}
              {session?.user?.id === dp.createdBy.id && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-1 hover:text-blue-500"
                  >
                    <MoreHorizontal />
                  </button>
                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute top-full right-0 z-20 mt-1 flex w-40 flex-col overflow-hidden rounded-lg border border-white/20 bg-black shadow-xl">
                        <button
                          onClick={() => {
                            if (dp.isPinned) {
                              unpinPost.mutate();
                            } else {
                              pinPost.mutate({ postId: dp.id });
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-left hover:bg-white/10"
                        >
                          {dp.isPinned ? (
                            <>
                              <PinOff size={16} /> Sabitlemeyi kaldır
                            </>
                          ) : (
                            <>
                              <Pin size={16} /> Profilde sabitle
                            </>
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                "Bu gönderiyi silmek istediğine emin misin?",
                              )
                            ) {
                              deletePost.mutate({ id: dp.id });
                            }
                            setShowMenu(false);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-left text-red-500 hover:bg-white/10"
                          disabled={deletePost.isPending}
                        >
                          <Trash2 size={16} /> Sil
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ReplyModal
        postId={dp.id}
        isOpen={isReplyOpen}
        onClose={() => setIsReplyOpen(false)}
      />
      <QuoteModal
        postId={dp.id}
        isOpen={isQuoteOpen}
        onClose={() => setIsQuoteOpen(false)}
      />
      <SharePostModal
        postId={dp.id}
        content={dp.content}
        mediaUrls={dp.mediaUrls}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </>
  );
});
