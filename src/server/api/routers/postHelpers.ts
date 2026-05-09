import type { Prisma } from "../../../../generated/prisma";
const slowQueryThresholdMs = Number(process.env.DB_SLOW_QUERY_MS ?? 200);

export async function withQueryTiming<T>(label: string, fn: () => Promise<T>) {
  const startedAt = Date.now();
  const result = await fn();
  const durationMs = Date.now() - startedAt;

  if (
    process.env.LOG_ALL_DB_QUERIES === "1" ||
    durationMs >= slowQueryThresholdMs
  ) {
    console.log(`[DB] ${label} took ${durationMs}ms`);
  }

  return result;
}

export const postInclude = (userId: string | undefined) => ({
  createdBy: {
    select: { id: true, name: true, username: true, image: true },
  },
  likes: {
    where: { userId: userId ?? "" },
  },
  bookmarks: {
    where: { userId: userId ?? "" },
    select: { userId: true },
  },
  poll: {
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
  },
  reposts: {
    where: { createdById: userId ?? "" },
  },
  pinnedBy: {
    where: { id: userId ?? "" },
    select: { id: true },
  },
  repostOf: {
    include: {
      createdBy: {
        select: { id: true, name: true, username: true, image: true },
      },
      likes: {
        where: { userId: userId ?? "" },
      },
      bookmarks: {
        where: { userId: userId ?? "" },
        select: { userId: true },
      },
      poll: {
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
      },
      reposts: {
        where: { createdById: userId ?? "" },
      },
      pinnedBy: {
        where: { id: userId ?? "" },
        select: { id: true },
      },
      _count: {
        select: { likes: true, replies: true, reposts: true },
      },
    },
  },
  parent: {
    include: {
      createdBy: {
        select: { id: true, name: true, username: true, image: true },
      },
      likes: {
        where: { userId: userId ?? "" },
      },
      bookmarks: {
        where: { userId: userId ?? "" },
        select: { userId: true },
      },
      reposts: {
        where: { createdById: userId ?? "" },
      },
      pinnedBy: {
        where: { id: userId ?? "" },
        select: { id: true },
      },
      repostOf: {
        include: {
          createdBy: {
            select: { id: true, name: true, username: true, image: true },
          },
          likes: {
            where: { userId: userId ?? "" },
          },
          bookmarks: {
            where: { userId: userId ?? "" },
            select: { userId: true },
          },
          poll: {
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
          },
          reposts: {
            where: { createdById: userId ?? "" },
          },
          pinnedBy: {
            where: { id: userId ?? "" },
            select: { id: true },
          },
          _count: {
            select: { likes: true, replies: true, reposts: true },
          },
        },
      },
      _count: {
        select: { likes: true, replies: true, reposts: true },
      },
    },
  },
  _count: {
    select: { likes: true, replies: true, reposts: true },
  },
});

export const postFeedInclude = (userId: string | undefined) => ({
  createdBy: {
    select: { id: true, name: true, username: true, image: true },
  },
  likes: {
    where: { userId: userId ?? "" },
  },
  bookmarks: {
    where: { userId: userId ?? "" },
    select: { userId: true },
  },
  poll: {
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
  },
  reposts: {
    where: { createdById: userId ?? "" },
  },
  pinnedBy: {
    where: { id: userId ?? "" },
    select: { id: true },
  },
  repostOf: {
    include: {
      createdBy: {
        select: { id: true, name: true, username: true, image: true },
      },
      likes: {
        where: { userId: userId ?? "" },
      },
      bookmarks: {
        where: { userId: userId ?? "" },
        select: { userId: true },
      },
      poll: {
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
      },
      reposts: {
        where: { createdById: userId ?? "" },
      },
      pinnedBy: {
        where: { id: userId ?? "" },
        select: { id: true },
      },
      _count: {
        select: { likes: true, replies: true, reposts: true },
      },
    },
  },
  _count: {
    select: { likes: true, replies: true, reposts: true },
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

export type MapPostInput = {
  id: number;
  content: string | null;
  mediaUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdBy: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
  likes: unknown[];
  bookmarks?: unknown[];
  reposts: unknown[];
  pinnedBy: unknown[];
  poll?: PollLike | null;
  parentId: number | null;
  repostOfId: number | null;
  parent?: MapPostInput | null;
  repostOf?: MapPostInput | null;
  replies?: MapPostInput[];
  _count: {
    likes: number;
    replies: number;
    reposts: number;
  };
};

export type MappedPoll =
  | {
      options: Array<
        PollOptionLike & {
          voteCount: number;
          hasVoted: boolean;
        }
      >;
      totalVotes: number;
    }
  | null;

export type MappedPost = MapPostInput & {
  isLiked: boolean;
  isBookmarked: boolean;
  isReposted: boolean;
  isPinned: boolean;
  poll: MappedPoll;
  parent: MappedPost | null;
  repostOf: MappedPost | null;
};

export const mapPoll = (poll?: PollLike | null): MappedPoll =>
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

export const mapPost = (post: MapPostInput): MappedPost => ({
  ...post,
  isLiked: post.likes.length > 0,
  isBookmarked: (post.bookmarks?.length ?? 0) > 0,
  isReposted: post.reposts.length > 0,
  isPinned: post.pinnedBy.length > 0,
  poll: mapPoll(post.poll),
  parent: post.parent ? mapPost(post.parent) : null,
  repostOf: post.repostOf
    ? {
        ...post.repostOf,
        parent: post.repostOf.parent ? mapPost(post.repostOf.parent) : null,
        repostOf: post.repostOf.repostOf
          ? mapPost(post.repostOf.repostOf)
          : null,
        replies: post.repostOf.replies?.map((reply) => mapPost(reply)) ?? [],
        isLiked: post.repostOf.likes.length > 0,
        isBookmarked: (post.repostOf.bookmarks?.length ?? 0) > 0,
        isReposted: post.repostOf.reposts.length > 0,
        isPinned: post.repostOf.pinnedBy.length > 0,
        poll: mapPoll(post.repostOf.poll),
      }
    : null,
  replies: post.replies?.map((reply) => mapPost(reply)) ?? [],
});

export const hashtagPattern = /#(\\w+)/g;

export function normalizeTag(tag: string) {
  return tag.replace(/^#/, "").trim().toLowerCase();
}

export function visibilityWhere(userId: string | undefined): Prisma.PostWhereInput {
  if (!userId) {
    return { createdBy: { isPrivate: false } };
  }

  return {
    OR: [
      { createdBy: { isPrivate: false } },
      { createdById: userId },
      {
        createdBy: {
          followedBy: {
            some: { followerId: userId },
          },
        },
      },
    ],
  };
}

const postHelpers = {};

export default postHelpers;
