import type { RouterOutputs } from "~/trpc/react";

export type FeedPost = RouterOutputs["post"]["getAll"][number];
export type PostDetail = NonNullable<RouterOutputs["post"]["getPost"]>;

type OptimisticAuthor = FeedPost["createdBy"];

type BuildOptimisticPostInput = {
  id: number;
  content: string | null;
  mediaUrls: string[];
  parentId: number | null;
  author: OptimisticAuthor;
  repostOf?: FeedPost | null;
  pollOptions?: string[];
};

export function buildOptimisticPost({
  id,
  content,
  mediaUrls,
  parentId,
  author,
  repostOf = null,
  pollOptions,
}: BuildOptimisticPostInput): FeedPost {
  const poll =
    pollOptions?.length && pollOptions[0] !== ""
      ? {
          totalVotes: 0,
          options: pollOptions.map((option, index) => ({
            id: -(index + 1),
            text: option,
            voteCount: 0,
            hasVoted: false,
          })),
        }
      : null;

  return {
    id,
    content,
    mediaUrls,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: author.id,
    createdBy: author,
    parentId,
    repostOfId: repostOf?.id ?? null,
    isLiked: false,
    isBookmarked: false,
    isReposted: false,
    isPinned: false,
    _count: {
      likes: 0,
      replies: 0,
      reposts: 0,
    },
    parent: null,
    repostOf,
    replies: [],
    likes: [],
    bookmarks: [],
    reposts: [],
    pinnedBy: [],
    poll,
  } as FeedPost;
}

export function prependOptimisticPost(
  posts: FeedPost[] | undefined,
  optimisticPost: FeedPost,
): FeedPost[] | undefined {
  return posts ? [optimisticPost, ...posts] : posts;
}

export function mergeOptimisticReply(
  post: PostDetail | null | undefined,
  optimisticReply: FeedPost,
): PostDetail | null | undefined {
  if (!post) return post;

  return {
    ...post,
    replies: [optimisticReply, ...post.replies],
    _count: {
      ...post._count,
      replies: post._count.replies + 1,
    },
  };
}