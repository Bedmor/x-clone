import type { PrismaClient } from "../../../../generated/prisma";
import { z } from "zod";

export const userPreviewInclude = (currentUserId: string | undefined) => ({
  followedBy: {
    where: { followerId: currentUserId ?? "" },
  },
  _count: {
    select: { followedBy: true, following: true, posts: true },
  },
});

export const messagePermissionSchema = z.enum(["EVERYONE", "FOLLOWING", "NO_ONE"]);

export async function canViewUserContent(
  db: PrismaClient,
  targetUserId: string,
  viewerId: string | undefined,
) {
  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { isPrivate: true },
  });

  if (!target) return false;
  if (!target.isPrivate) return true;
  if (!viewerId) return false;
  if (viewerId === targetUserId) return true;

  const follow = await db.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: viewerId,
        followingId: targetUserId,
      },
    },
  });

  return Boolean(follow);
}

export const pollInclude = (userId: string | undefined) => ({
  include: {
    options: {
      include: {
        votes: {
          where: { userId: userId ?? "" },
          select: { userId: true },
        },
        _count: {
          select: { votes: true },
        },
      },
      orderBy: { id: "asc" as const },
    },
  },
});

export type PollOptionLike = {
  id: number;
  text: string;
  _count: { votes: number };
  votes: unknown[];
};

export type PollLike = {
  options: PollOptionLike[];
};

export type MapUserPostCore = {
  id: number;
  content: string | null;
  mediaUrls: string[];
  createdAt: Date;
  parentId: number | null;
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
  likes: unknown[];
  bookmarks?: unknown[];
  reposts: unknown[];
  pinnedBy: unknown[];
  poll?: PollLike | null;
};

export type MapUserPostInput = MapUserPostCore & {
  repostOf?: MapUserPostCore | null;
};

export const mapPoll = (poll?: PollLike | null) =>
  poll
    ? {
        ...poll,
        totalVotes: poll.options.reduce(
          (count: number, option) => count + option._count.votes,
          0,
        ),
        options: poll.options.map((option) => ({
          ...option,
          voteCount: option._count.votes,
          hasVoted: option.votes.length > 0,
        })),
      }
    : null;

export const mapUserPost = <T extends MapUserPostInput>(post: T) => ({
  ...post,
  isLiked: post.likes.length > 0,
  isBookmarked: (post.bookmarks?.length ?? 0) > 0,
  isReposted: post.reposts.length > 0,
  isPinned: post.pinnedBy.length > 0,
  poll: mapPoll(post.poll),
  repostOf: post.repostOf
    ? {
        ...post.repostOf,
        isLiked: post.repostOf.likes.length > 0,
        isBookmarked: (post.repostOf.bookmarks?.length ?? 0) > 0,
        isReposted: post.repostOf.reposts.length > 0,
        isPinned: post.repostOf.pinnedBy.length > 0,
        poll: mapPoll(post.repostOf.poll),
      }
    : null,
});

  const userHelpers = {};

  export default userHelpers;
