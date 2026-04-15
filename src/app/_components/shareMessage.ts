const SHARE_MESSAGE_PREFIX = "[POST_SHARE]";

export type SharedPostMessage = {
  kind: "post";
  postId: number;
  content: string | null;
  mediaUrls: string[];
};

export function buildSharedPostMessage(input: {
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

export function parseSharedPostMessage(content: string) {
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
