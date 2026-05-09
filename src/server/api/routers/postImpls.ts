import type { Prisma } from "../../../../generated/prisma";
import type { createTRPCContext } from "~/server/api/trpc";
import {
  normalizeTag,
  postFeedInclude,
  mapPost,
  withQueryTiming,
  visibilityWhere,
  hashtagPattern,
  type MappedPost,
  type MapPostInput,
} from "./postHelpers";

type RouterContext = Awaited<ReturnType<typeof createTRPCContext>>;
type TimelineTab = "for-you" | "following";
type GetAllInput = { tab?: TimelineTab } | undefined;
type SearchPostsInput = { query: string };
type HashtagFeedInput = { tag: string };
type TrendingInput = { limit?: number } | undefined;
type SearchTagsInput = { query: string; limit?: number };
type TrendingEntry = {
  post: MappedPost;
  score: number;
};

export async function getAllPosts(ctx: RouterContext, input: GetAllInput) {
  const tab = input?.tab ?? "for-you";
  const userId = ctx.session?.user?.id;

  let blockedUserIds: string[] = [];
  if (userId) {
    const blocks = await ctx.db.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    blockedUserIds = blocks.map((b) =>
      b.blockerId === userId ? b.blockedId : b.blockerId,
    );
  }

  const whereClause: Prisma.PostWhereInput = {
    parentId: null,
    createdById: { notIn: blockedUserIds },
    AND: [visibilityWhere(userId)],
  };

  if (tab === "following" && userId) {
    const following = await ctx.db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    whereClause.createdById = { in: followingIds, notIn: blockedUserIds };
  } else if (tab === "for-you") {
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    whereClause.createdAt = { gte: fourDaysAgo };
  }

  const posts = await withQueryTiming("post.getAll.findMany", () =>
    ctx.db.post.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      where: whereClause,
      include: postFeedInclude(userId),
    }),
  );

  return posts.map((post) => mapPost(post as MapPostInput));
}

export async function searchPostsImpl(
  ctx: RouterContext,
  input: SearchPostsInput,
) {
  const userId = ctx.session?.user?.id;
  const blockedUserIds: string[] = [];

  if (userId) {
    const blocks = await ctx.db.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });

    blockedUserIds.push(
      ...blocks.map((block) =>
        block.blockerId === userId ? block.blockedId : block.blockerId,
      ),
    );
  }

  const posts = await ctx.db.post.findMany({
    take: 30,
    orderBy: { createdAt: "desc" },
    where: {
      AND: [
        visibilityWhere(userId),
        {
          parentId: null,
          createdById: { notIn: blockedUserIds },
          OR: [
            {
              content: {
                contains: input.query,
                mode: "insensitive",
              },
            },
            {
              content: {
                contains: `#${normalizeTag(input.query)}`,
                mode: "insensitive",
              },
            },
          ],
        },
      ],
    },
    include: postFeedInclude(userId),
  });

  return posts.map((post) => mapPost(post as MapPostInput));
}

export async function getHashtagFeedImpl(
  ctx: RouterContext,
  input: HashtagFeedInput,
) {
  const userId = ctx.session?.user?.id;
  const tag = normalizeTag(input.tag);
  const blockedUserIds: string[] = [];

  if (userId) {
    const blocks = await ctx.db.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });

    blockedUserIds.push(
      ...blocks.map((block) =>
        block.blockerId === userId ? block.blockedId : block.blockerId,
      ),
    );
  }

  const posts = await ctx.db.post.findMany({
    take: 30,
    orderBy: { createdAt: "desc" },
    where: {
      AND: [
        visibilityWhere(userId),
        {
          parentId: null,
          createdById: { notIn: blockedUserIds },
          content: {
            contains: `#${tag}`,
            mode: "insensitive",
          },
        },
      ],
    },
    include: postFeedInclude(userId),
  });

  return posts.map((post) => mapPost(post as MapPostInput));
}

export async function getTrendingTagsImpl(
  ctx: RouterContext,
  input: TrendingInput,
) {
  const limit = input?.limit ?? 8;
  const userId = ctx.session?.user?.id;
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const blockedUserIds: string[] = [];
  if (userId) {
    const blocks = await ctx.db.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    blockedUserIds.push(
      ...blocks.map((block) =>
        block.blockerId === userId ? block.blockedId : block.blockerId,
      ),
    );
  }

  const posts = await ctx.db.post.findMany({
    where: {
      AND: [
        visibilityWhere(userId),
        {
          parentId: null,
          createdAt: { gte: since },
          content: { not: null },
          createdById: { notIn: blockedUserIds },
        },
      ],
    },
    select: { content: true },
    take: 200,
    orderBy: { createdAt: "desc" },
  });

  const counts = new Map<string, number>();

  for (const post of posts) {
    const matches = post.content?.match(hashtagPattern) ?? [];

    for (const match of matches) {
      const tag = normalizeTag(match);
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

export async function getTrendingPostsImpl(
  ctx: RouterContext,
  input: TrendingInput,
) {
  const userId = ctx.session?.user?.id;
  const limit = input?.limit ?? 6;
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const blockedUserIds: string[] = [];
  if (userId) {
    const blocks = await ctx.db.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    blockedUserIds.push(
      ...blocks.map((block) =>
        block.blockerId === userId ? block.blockedId : block.blockerId,
      ),
    );
  }

  const posts = await withQueryTiming("post.getTrendingPosts.findMany", () =>
    ctx.db.post.findMany({
      where: {
        AND: [
          visibilityWhere(userId),
          {
            parentId: null,
            createdAt: { gte: since },
            createdById: { notIn: blockedUserIds },
          },
        ],
      },
      take: 60,
      orderBy: { createdAt: "desc" },
      include: postFeedInclude(userId),
    }),
  );

  const rankedPosts: TrendingEntry[] = posts.map((post) => ({
    post: mapPost(post as MapPostInput),
    score:
      (post._count?.likes ?? 0) * 3 +
      (post._count?.reposts ?? 0) * 2 +
      (post._count?.replies ?? 0),
  }));

  return rankedPosts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ post }) => post);
}

export async function searchTagsImpl(
  ctx: RouterContext,
  input: SearchTagsInput,
) {
  const limit = input.limit ?? 12;
  const userId = ctx.session?.user?.id;
  const normalizedQuery = normalizeTag(input.query);
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const blockedUserIds: string[] = [];
  if (userId) {
    const blocks = await ctx.db.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    blockedUserIds.push(
      ...blocks.map((block) =>
        block.blockerId === userId ? block.blockedId : block.blockerId,
      ),
    );
  }

  const posts = await ctx.db.post.findMany({
    where: {
      AND: [
        visibilityWhere(userId),
        {
          parentId: null,
          createdAt: { gte: since },
          content: { not: null },
          createdById: { notIn: blockedUserIds },
        },
      ],
    },
    select: { content: true },
    take: 400,
    orderBy: { createdAt: "desc" },
  });

  const counts = new Map<string, number>();

  for (const post of posts) {
    const matches = post.content?.match(hashtagPattern) ?? [];

    for (const match of matches) {
      const tag = normalizeTag(match);
      if (tag.includes(normalizedQuery)) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}
