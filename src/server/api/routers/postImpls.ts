import { normalizeTag, postFeedInclude, mapPost, withQueryTiming, visibilityWhere, hashtagPattern } from "./postHelpers";

export async function getAllPosts(ctx: any, input: any) {
  const tab = input?.tab ?? "for-you";
  const userId = ctx.session?.user?.id;

  let blockedUserIds: string[] = [];
  if (userId) {
    const blocks = await ctx.db.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    blockedUserIds = blocks.map((b: any) =>
      b.blockerId === userId ? b.blockedId : b.blockerId,
    );
  }

  const whereClause: any = {
    parentId: null,
    createdById: { notIn: blockedUserIds },
    AND: [visibilityWhere(userId)],
  };

  if (tab === "following" && userId) {
    const following = await ctx.db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f: any) => f.followingId);
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

  return posts.map((post: any) => mapPost(post));
}

export async function searchPostsImpl(ctx: any, input: any) {
  const userId = ctx.session?.user?.id;
  const blockedUserIds: string[] = [];

  if (userId) {
    const blocks = await ctx.db.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });

    blockedUserIds.push(
      ...blocks.map((block: any) =>
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

  return posts.map((post: any) => mapPost(post));
}

export async function getHashtagFeedImpl(ctx: any, input: any) {
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
      ...blocks.map((block: any) =>
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

  return posts.map((post: any) => mapPost(post));
}

export async function getTrendingTagsImpl(ctx: any, input: any) {
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
      ...blocks.map((block: any) =>
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

export async function getTrendingPostsImpl(ctx: any, input: any) {
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
      ...blocks.map((block: any) =>
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

  return posts
    .map((post: any) => ({
      post: mapPost(post),
      score:
        (post._count?.likes ?? 0) * 3 +
        (post._count?.reposts ?? 0) * 2 +
        (post._count?.replies ?? 0),
    }))
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, limit)
    .map(({ post }: any) => post);
}

export async function searchTagsImpl(ctx: any, input: any) {
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
      ...blocks.map((block: any) =>
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
