import type { ReactNode } from "react";

const LINKIFY_REGEX = /(https?:\/\/[^\s]+|@\w+|#\w+)/g;

export function linkifyText(
  text: string,
  renderUrl: (url: string, index: number) => ReactNode,
  renderMention: (username: string, index: number) => ReactNode,
  renderHashtag: (tag: string, index: number) => ReactNode,
): ReactNode[] {
  return text.split(LINKIFY_REGEX).map((part, index) => {
    if (!part) return part;

    if (part.startsWith("http://") || part.startsWith("https://")) {
      return renderUrl(part, index);
    }

    if (part.startsWith("@")) {
      return renderMention(part.slice(1), index);
    }

    if (part.startsWith("#")) {
      return renderHashtag(part.slice(1), index);
    }

    return part;
  });
}
