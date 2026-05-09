"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { BarChart3, ImagePlus, X } from "lucide-react";
import { api } from "~/trpc/react";
import { uploadToR2 } from "~/app/_lib/uploadToR2";
import { useSession } from "next-auth/react";
import {
  buildOptimisticPost,
  mergeOptimisticReply,
  prependOptimisticPost,
  type FeedPost,
} from "./optimisticPost";
import { RemoteImage } from "./RemoteImage";

const ImageCropperModal = dynamic(
  () => import("./ImageCropperModal").then((mod) => mod.ImageCropperModal),
  { ssr: false },
);

export function CreatePost({
  parentId,
  placeholder = "Neler oluyor?!",
}: {
  parentId?: number;
  placeholder?: string;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState(1);
  const cropResolveRef = useRef<((file: File | null) => void) | null>(null);
  const cropObjectUrlRef = useRef<string | null>(null);
  const utils = api.useUtils();
  const draftKey = useMemo(
    () => `flowzest.draft.${pathname}.${parentId ?? "root"}`,
    [parentId, pathname],
  );

  useEffect(() => {
    const storedDraft = window.localStorage.getItem(draftKey);
    if (storedDraft) {
      try {
        const parsedUnknown = JSON.parse(storedDraft) as unknown;
        if (
          parsedUnknown &&
          typeof parsedUnknown === "object" &&
          !Array.isArray(parsedUnknown)
        ) {
          const parsed = parsedUnknown as {
            content?: unknown;
            mediaUrls?: unknown;
          };
          if (typeof parsed.content === "string") {
            setContent(parsed.content);
          }
          if (Array.isArray(parsed.mediaUrls)) {
            const urls = parsed.mediaUrls.filter(
              (u): u is string => typeof u === "string" && !!u,
            );
            setMediaUrls(urls.slice(0, 4));
          }
        } else {
          setContent(storedDraft);
        }
      } catch {
        setContent(storedDraft);
      }
    }
    setIsHydrated(true);
  }, [draftKey]);

  useEffect(() => {
    if (!isHydrated) return;

    if (content.trim().length === 0 && mediaUrls.length === 0) {
      window.localStorage.removeItem(draftKey);
      return;
    }

    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({ content, mediaUrls }),
      );
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [content, draftKey, isHydrated, mediaUrls]);

  const createPost = api.post.create.useMutation({
    onMutate: async (newPost) => {
      await utils.post.getAll.cancel();
      if (parentId) {
        await utils.post.getPost.cancel({ id: parentId });
      }

      const optimisticAuthor: FeedPost["createdBy"] = {
        id: session?.user?.id ?? "temp",
        name: session?.user?.name ?? "User",
        username: session?.user?.email ?? "user",
        image: session?.user?.image ?? null,
      };

      const optimisticPost = buildOptimisticPost({
        id: -Date.now(),
        content: newPost.content ?? null,
        mediaUrls: newPost.mediaUrls ?? [],
        parentId: parentId ?? null,
        author: optimisticAuthor,
        pollOptions: newPost.pollOptions,
      });

      const prevForYou = parentId
        ? undefined
        : utils.post.getAll.getData({ tab: "for-you" });
      const prevFollowing = parentId
        ? undefined
        : utils.post.getAll.getData({ tab: "following" });
      const prevPost = parentId
        ? utils.post.getPost.getData({ id: parentId })
        : undefined;

      if (!parentId) {
        utils.post.getAll.setData({ tab: "for-you" }, (posts) =>
          prependOptimisticPost(posts, optimisticPost),
        );
        utils.post.getAll.setData({ tab: "following" }, (posts) =>
          prependOptimisticPost(posts, optimisticPost),
        );
      } else {
        utils.post.getPost.setData({ id: parentId }, (post) =>
          mergeOptimisticReply(post, optimisticPost),
        );
      }

      setContent("");
      setPollEnabled(false);
      setPollOptions(["", ""]);
      setMediaUrls([]);
      window.localStorage.removeItem(draftKey);

      return { prevForYou, prevFollowing, prevPost };
    },
    onError: (_error, newPost, context) => {
      if (!parentId && context?.prevForYou) {
        utils.post.getAll.setData({ tab: "for-you" }, context.prevForYou);
      }
      if (!parentId && context?.prevFollowing) {
        utils.post.getAll.setData({ tab: "following" }, context.prevFollowing);
      }
      if (parentId && context?.prevPost) {
        utils.post.getPost.setData({ id: parentId }, context.prevPost);
      }
      setContent(newPost.content ?? "");
      setMediaUrls(newPost.mediaUrls ?? []);
    },
    onSettled: async () => {
      await utils.post.getAll.invalidate();
      if (parentId) {
        await utils.post.getPost.invalidate({ id: parentId });
      }
    },
  });

  const handleMediaUpload = async (files: FileList | null) => {
    if (!files?.length) return;

    const remaining = Math.max(0, 4 - mediaUrls.length);
    const selectedFiles = Array.from(files).slice(0, remaining);
    if (selectedFiles.length === 0) return;

    setIsUploadingMedia(true);
    setProgressLabel("Hazırlanıyor");
    setProgressPercent(0);
    try {
      const uploaded: string[] = [];

      for (const file of selectedFiles) {
        if (file.type.startsWith("video/")) {
          const url = await uploadToR2(file, {
            onStatus: (s: string) => {
              if (s === "uploading") setProgressLabel("Video yükleniyor");
              if (s === "done") setProgressLabel("Yüklendi");
            },
            onProgress: (p: number) => setProgressPercent(p),
          });
          uploaded.push(url);
          continue;
        }

        const croppedFile = await cropImageFile(file);
        if (!croppedFile) continue;

        const url = await uploadToR2(croppedFile, {
          onStatus: (s: string) => {
            if (s === "converting") setProgressLabel("Dönüştürülüyor");
            if (s === "uploading") setProgressLabel("Yükleniyor");
            if (s === "done") setProgressLabel("Yüklendi");
          },
          onProgress: (p: number) => setProgressPercent(p),
        });
        uploaded.push(url);
      }

      if (uploaded.length > 0) {
        setMediaUrls((current) => [...current, ...uploaded].slice(0, 4));
      }
    } catch (error) {
      alert((error as Error).message || "Medya yüklemesi başarısız oldu");
    } finally {
      setIsUploadingMedia(false);
      setTimeout(() => {
        setProgressLabel(null);
        setProgressPercent(null);
      }, 800);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && mediaUrls.length === 0) return;

    const sanitizedOptions = pollOptions
      .map((option) => option.trim())
      .filter(Boolean);
    const hasValidPoll = !pollEnabled || sanitizedOptions.length >= 2;

    if (!hasValidPoll) return;

    createPost.mutate({
      content,
      mediaUrls,
      parentId,
      pollOptions: pollEnabled ? sanitizedOptions : undefined,
    });
  };

  const cropImageFile = async (file: File): Promise<File | null> => {
    const objectUrl = URL.createObjectURL(file);

    try {
      const aspect = await getImageAspect(objectUrl);

      return await new Promise<File | null>((resolve) => {
        cropResolveRef.current = resolve;
        cropObjectUrlRef.current = objectUrl;
        setCropAspect(aspect);
        setCropImageSrc(objectUrl);
      });
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-b border-white/20 p-4">
      <textarea
        className="w-full resize-none bg-transparent text-lg outline-none md:text-xl"
        placeholder={placeholder}
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      {mediaUrls.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {mediaUrls.map((url) => {
            const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);
            return (
              <div
                key={url}
                className="relative overflow-hidden rounded-xl border border-white/10"
              >
                {isVideo ? (
                  <video
                    src={url}
                    className="h-32 w-full object-cover"
                    controls
                  />
                ) : (
                  <RemoteImage
                    src={url}
                    alt="Uploaded media"
                    width={720}
                    height={720}
                    sizes="(max-width: 768px) 50vw, 360px"
                    className="h-32 w-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() =>
                    setMediaUrls((current) =>
                      current.filter((item) => item !== url),
                    )
                  }
                  className="absolute top-1 right-1 rounded-full bg-black/70 p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {pollEnabled && (
        <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm font-semibold text-gray-400">
            Anket seçenekleri
          </div>
          <div className="space-y-2">
            {pollOptions.map((option, index) => (
              <input
                key={index}
                value={option}
                onChange={(event) =>
                  setPollOptions((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? event.target.value : item,
                    ),
                  )
                }
                placeholder={`Seçenek ${index + 1}`}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-gray-500 focus:border-blue-500"
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setPollOptions((current) =>
                  current.length >= 4 ? current : [...current, ""],
                )
              }
              disabled={pollOptions.length >= 4}
              className="rounded-full border border-white/10 px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-40"
            >
              Seçenek ekle
            </button>
            <button
              type="button"
              onClick={() => {
                setPollEnabled(false);
                setPollOptions(["", ""]);
              }}
              className="rounded-full border border-white/10 px-3 py-1 text-sm hover:bg-white/10"
            >
              Anketi kaldır
            </button>
          </div>
          <p className="text-xs text-gray-500">En az iki seçenek ekleyin.</p>
        </div>
      )}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          aria-label={pollEnabled ? "Anketi kaldır" : "Anket ekle"}
          onClick={() => setPollEnabled((current) => !current)}
          className={`group flex items-center justify-center rounded-full p-2.5 transition ${
            pollEnabled
              ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
              : "text-blue-500 hover:bg-blue-500/10"
          }`}
        >
          <BarChart3 className="h-5 w-5" />
        </button>
        <label
          aria-label="Medya ekle"
          className="group ml-1 flex cursor-pointer items-center justify-center rounded-full p-2.5 text-blue-500 transition hover:bg-blue-500/10"
        >
          {isUploadingMedia ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
          <input
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            multiple
            className="hidden"
            onChange={(event) => {
              void handleMediaUpload(event.target.files);
              event.currentTarget.value = "";
            }}
            disabled={isUploadingMedia || mediaUrls.length >= 4}
          />
        </label>
        {/* Progress UI */}
        {isUploadingMedia && progressLabel && (
          <div className="mr-2 ml-3 flex items-center space-x-3">
            <div className="w-48">
              <div className="h-2 w-full rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${progressPercent ?? 0}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-400">{progressLabel}</div>
            </div>
            <div className="text-sm text-gray-400">
              {progressPercent != null ? `${progressPercent}%` : "..."}
            </div>
          </div>
        )}
        {content.trim().length > 0 && (
          <span className="mr-3 self-center text-sm text-gray-500">
            Taslak kaydedildi
          </span>
        )}
        <button
          type="submit"
          disabled={
            createPost.isPending ||
            isUploadingMedia ||
            (!content.trim() && mediaUrls.length === 0) ||
            (pollEnabled &&
              pollOptions.map((option) => option.trim()).filter(Boolean)
                .length < 2)
          }
          className="ml-auto rounded-full bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {createPost.isPending ? (
            <div className="flex h-5 items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          ) : (
            "Paylaş"
          )}
        </button>
      </div>

      {cropImageSrc && (
        <ImageCropperModal
          imageUrl={cropImageSrc}
          aspect={cropAspect}
          onCancel={() => {
            cropResolveRef.current?.(null);
            cropResolveRef.current = null;
            if (cropObjectUrlRef.current) {
              URL.revokeObjectURL(cropObjectUrlRef.current);
              cropObjectUrlRef.current = null;
            }
            setCropImageSrc(null);
          }}
          onCropComplete={(file) => {
            cropResolveRef.current?.(file);
            cropResolveRef.current = null;
            if (cropObjectUrlRef.current) {
              URL.revokeObjectURL(cropObjectUrlRef.current);
              cropObjectUrlRef.current = null;
            }
            setCropImageSrc(null);
          }}
        />
      )}
    </form>
  );
}

const getImageAspect = (objectUrl: string): Promise<number> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        reject(new Error("Resim boyutu okunamadı"));
        return;
      }

      resolve(image.naturalWidth / image.naturalHeight);
    };

    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = objectUrl;
  });
