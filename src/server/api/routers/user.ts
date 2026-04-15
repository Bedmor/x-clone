import { z } from "zod";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "../../../../generated/prisma";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { deleteR2ObjectByUrl } from "~/server/lib/r2";

const userPreviewInclude = (currentUserId: string | undefined) => ({
  followedBy: {
    where: { followerId: currentUserId ?? "" },
  },
  _count: {
    select: { followedBy: true, following: true, posts: true },
  },
});

const messagePermissionSchema = z.enum(["EVERYONE", "FOLLOWING", "NO_ONE"]);

async function canViewUserContent(
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

const pollInclude = (userId: string | undefined) => ({
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

type PollOptionLike = {
  id: number;
  text: string;
  _count: { votes: number };
  votes: unknown[];
};

type PollLike = {
  options: PollOptionLike[];
};

type MapUserPostCore = {
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

type MapUserPostInput = MapUserPostCore & {
  repostOf?: MapUserPostCore | null;
};

const mapPoll = (poll?: PollLike | null) =>
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

const mapUserPost = <T extends MapUserPostInput>(post: T) => ({
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

export const userRouter = createTRPCRouter({
  getProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      let user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        include: {
          _count: {
            select: { followedBy: true, following: true, posts: true },
          },
          followedBy: {
            where: { followerId: ctx.session?.user?.id ?? "" },
          },
          following: {
            where: { followingId: ctx.session?.user?.id ?? "" },
          },
          blockedBy: {
            where: { blockerId: ctx.session?.user?.id ?? "" },
          },
          blocking: {
            where: { blockedId: ctx.session?.user?.id ?? "" },
          },
          pinnedPost: {
            include: {
              createdBy: { select: { id: true, name: true, username: true, image: true } },
              likes: {
                where: { userId: ctx.session?.user?.id ?? "" },
              },
              bookmarks: {
                where: { userId: ctx.session?.user?.id ?? "" },
                select: { userId: true },
              },
              poll: pollInclude(ctx.session?.user?.id),
              reposts: {
                where: { createdById: ctx.session?.user?.id ?? "" },
              },
              pinnedBy: {
                where: { id: ctx.session?.user?.id ?? "" },
                select: { id: true },
              },
              _count: { select: { likes: true, replies: true, reposts: true } },
              repostOf: {
                include: {
                  createdBy: { select: { id: true, name: true, username: true, image: true } },
                  likes: { where: { userId: ctx.session?.user?.id ?? "" } },
                  bookmarks: {
                    where: { userId: ctx.session?.user?.id ?? "" },
                    select: { userId: true },
                  },
                  poll: pollInclude(ctx.session?.user?.id),
                  reposts: {
                    where: { createdById: ctx.session?.user?.id ?? "" },
                  },
                  pinnedBy: {
                    where: { id: ctx.session?.user?.id ?? "" },
                    select: { id: true },
                  },
                  _count: {
                    select: { likes: true, replies: true, reposts: true },
                  },
                },
              },
            },
          },
        },
      });

      user ??= await ctx.db.user.findUnique({
        where: { username: input.userId },
        include: {
          _count: {
            select: { followedBy: true, following: true, posts: true },
          },
          followedBy: {
            where: { followerId: ctx.session?.user?.id ?? "" },
          },
          following: {
            where: { followingId: ctx.session?.user?.id ?? "" },
          },
          blockedBy: {
            where: { blockerId: ctx.session?.user?.id ?? "" },
          },
          blocking: {
            where: { blockedId: ctx.session?.user?.id ?? "" },
          },
          pinnedPost: {
            include: {
              createdBy: { select: { id: true, name: true, username: true, image: true } },
              likes: {
                where: { userId: ctx.session?.user?.id ?? "" },
              },
              bookmarks: {
                where: { userId: ctx.session?.user?.id ?? "" },
                select: { userId: true },
              },
              poll: pollInclude(ctx.session?.user?.id),
              reposts: {
                where: { createdById: ctx.session?.user?.id ?? "" },
              },
              pinnedBy: {
                where: { id: ctx.session?.user?.id ?? "" },
                select: { id: true },
              },
              _count: { select: { likes: true, replies: true, reposts: true } },
              repostOf: {
                include: {
                  createdBy: { select: { id: true, name: true, username: true, image: true } },
                  likes: { where: { userId: ctx.session?.user?.id ?? "" } },
                  bookmarks: {
                    where: { userId: ctx.session?.user?.id ?? "" },
                    select: { userId: true },
                  },
                  poll: pollInclude(ctx.session?.user?.id),
                  reposts: {
                    where: { createdById: ctx.session?.user?.id ?? "" },
                  },
                  pinnedBy: {
                    where: { id: ctx.session?.user?.id ?? "" },
                    select: { id: true },
                  },
                  _count: {
                    select: { likes: true, replies: true, reposts: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) return null;

      const isOwnProfile = ctx.session?.user?.id === user.id;
      const isFollowing = user.followedBy.length > 0;
      const canViewPosts = !user.isPrivate || isOwnProfile || isFollowing;
      const targetFollowsViewer = user.following.length > 0;

      const canMessage = Boolean(
        ctx.session?.user?.id &&
          !isOwnProfile &&
          user.blockedBy.length === 0 &&
          user.blocking.length === 0 &&
          (user.messagePermission === "EVERYONE" ||
            (user.messagePermission === "FOLLOWING" && targetFollowsViewer)),
      );

      const pinnedPost = user.pinnedPost
        ? canViewPosts
          ? mapUserPost(user.pinnedPost)
          : null
        : null;

      return {
        ...user,
        isFollowing,
        isBlocked: user.blockedBy.length > 0,
        hasBlocked: user.blocking.length > 0,
        canViewPosts,
        canMessage,
        pinnedPost,
      };
    }),

  getPrivacySettings: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { isPrivate: true, messagePermission: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }),

  updatePrivacySettings: protectedProcedure
    .input(
      z.object({
        isPrivate: z.boolean().optional(),
        messagePermission: messagePermissionSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          isPrivate: input.isPrivate,
          messagePermission: input.messagePermission,
        },
        select: { isPrivate: true, messagePermission: true },
      });
    }),

  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        username: z.string().min(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingUserEmail = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      if (existingUserEmail) {
        throw new Error("Email already exists");
      }

      const existingUserUsername = await ctx.db.user.findUnique({
        where: { username: input.username },
      });
      if (existingUserUsername) {
        throw new Error("Username already exists");
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      return ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashedPassword,
          username: input.username,
        },
      });
    }),

  pinPost: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.postId },
      });

      if (!post || post.createdById !== ctx.session.user.id) {
        throw new Error("Unauthorized");
      }

      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { pinnedPostId: input.postId },
      });
    }),

  unpinPost: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.db.user.update({
      where: { id: ctx.session.user.id },
      data: { pinnedPostId: null },
    });
  }),

  searchUsers: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      const query = input.query.trim();

      if (query.length < 2) return [];

      return ctx.db.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { username: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
        take: 8,
      });
    }),

  getSuggestedUsers: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;
      const limit = input?.limit ?? 6;

      const blockedUsers = await ctx.db.block.findMany({
        where: {
          OR: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
        },
      });

      const blockedUserIds = blockedUsers.map((block) =>
        block.blockerId === currentUserId ? block.blockedId : block.blockerId,
      );

      const following = await ctx.db.follow.findMany({
        where: { followerId: currentUserId },
        select: { followingId: true },
      });
      const followingIds = following.map((item) => item.followingId);

      const candidateRelations = await ctx.db.follow.findMany({
        where: {
          followerId: { in: followingIds },
          followingId: {
            notIn: [currentUserId, ...followingIds, ...blockedUserIds],
          },
        },
        select: { followingId: true },
      });

      const candidateIds = Array.from(
        new Set(candidateRelations.map((relation) => relation.followingId)),
      );

      const suggestedUsers = candidateIds.length
        ? await ctx.db.user.findMany({
            where: {
              id: { in: candidateIds, notIn: blockedUserIds },
            },
            include: userPreviewInclude(currentUserId),
          })
        : [];

      const fallbackUsers = await ctx.db.user.findMany({
        where: {
          id: { notIn: [currentUserId, ...followingIds, ...blockedUserIds] },
        },
        include: userPreviewInclude(currentUserId),
        take: limit * 2,
      });

      const merged = [...suggestedUsers, ...fallbackUsers].filter(
        (user, index, array) => array.findIndex((item) => item.id === user.id) === index,
      );

      return merged
        .map((user) => ({
          ...user,
          score: (candidateIds.includes(user.id) ? 10 : 0) + user._count.followedBy + user._count.posts,
          isFollowing: user.followedBy.length > 0,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ score: _score, ...user }) => user);
    }),

  getPosts: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const canView = await canViewUserContent(
        ctx.db,
        input.userId,
        ctx.session?.user?.id,
      );
      if (!canView) return [];

      const posts = await ctx.db.post.findMany({
        take: 50,
        where: { createdById: input.userId, parentId: null },
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true, username: true, image: true } },
          likes: {
            where: { userId: ctx.session?.user?.id ?? "" },
          },
          bookmarks: {
            where: { userId: ctx.session?.user?.id ?? "" },
            select: { userId: true },
          },
          poll: pollInclude(ctx.session?.user?.id),
          reposts: {
            where: { createdById: ctx.session?.user?.id ?? "" },
          },
          pinnedBy: {
            where: { id: ctx.session?.user?.id ?? "" },
            select: { id: true },
          },
          repostOf: {
            include: {
              createdBy: { select: { id: true, name: true, username: true, image: true } },
              likes: { where: { userId: ctx.session?.user?.id ?? "" } },
              bookmarks: {
                where: { userId: ctx.session?.user?.id ?? "" },
                select: { userId: true },
              },
              poll: pollInclude(ctx.session?.user?.id),
              reposts: { where: { createdById: ctx.session?.user?.id ?? "" } },
              pinnedBy: {
                where: { id: ctx.session?.user?.id ?? "" },
                select: { id: true },
              },
              _count: { select: { likes: true, replies: true, reposts: true } },
            },
          },
          _count: {
            select: { likes: true, replies: true, reposts: true },
          },
        },
      });

      return posts.map((post) => mapUserPost(post));
    }),

  getReplies: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const canView = await canViewUserContent(
        ctx.db,
        input.userId,
        ctx.session?.user?.id,
      );
      if (!canView) return [];

      const posts = await ctx.db.post.findMany({
        take: 50,
        where: { createdById: input.userId, parentId: { not: null } },
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true, username: true, image: true } },
          likes: {
            where: { userId: ctx.session?.user?.id ?? "" },
          },
          bookmarks: {
            where: { userId: ctx.session?.user?.id ?? "" },
            select: { userId: true },
          },
          poll: pollInclude(ctx.session?.user?.id),
          reposts: {
            where: { createdById: ctx.session?.user?.id ?? "" },
          },
          pinnedBy: {
            where: { id: ctx.session?.user?.id ?? "" },
            select: { id: true },
          },
          repostOf: {
            include: {
              createdBy: { select: { id: true, name: true, username: true, image: true } },
              likes: { where: { userId: ctx.session?.user?.id ?? "" } },
              bookmarks: {
                where: { userId: ctx.session?.user?.id ?? "" },
                select: { userId: true },
              },
              poll: pollInclude(ctx.session?.user?.id),
              reposts: { where: { createdById: ctx.session?.user?.id ?? "" } },
              pinnedBy: {
                where: { id: ctx.session?.user?.id ?? "" },
                select: { id: true },
              },
              _count: { select: { likes: true, replies: true, reposts: true } },
            },
          },
          _count: {
            select: { likes: true, replies: true, reposts: true },
          },
        },
      });

      return posts.map((post) => mapUserPost(post));
    }),

  getLikes: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const canView = await canViewUserContent(
        ctx.db,
        input.userId,
        ctx.session?.user?.id,
      );
      if (!canView) return [];

      const likes = await ctx.db.like.findMany({
        take: 50,
        where: { userId: input.userId },
        orderBy: { post: { createdAt: "desc" } },
        include: {
          post: {
            include: {
              createdBy: { select: { id: true, name: true, username: true, image: true } },
              likes: {
                where: { userId: ctx.session?.user?.id ?? "" },
              },
              bookmarks: {
                where: { userId: ctx.session?.user?.id ?? "" },
                select: { userId: true },
              },
              poll: pollInclude(ctx.session?.user?.id),
              reposts: { where: { createdById: ctx.session?.user?.id ?? "" } },
              pinnedBy: {
                where: { id: ctx.session?.user?.id ?? "" },
                select: { id: true },
              },
              repostOf: {
                include: {
                  createdBy: { select: { id: true, name: true, username: true, image: true } },
                  likes: { where: { userId: ctx.session?.user?.id ?? "" } },
                  bookmarks: {
                    where: { userId: ctx.session?.user?.id ?? "" },
                    select: { userId: true },
                  },
                  poll: pollInclude(ctx.session?.user?.id),
                  reposts: {
                    where: { createdById: ctx.session?.user?.id ?? "" },
                  },
                  pinnedBy: {
                    where: { id: ctx.session?.user?.id ?? "" },
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
        },
      });

      return likes.map((like) => mapUserPost(like.post));
    }),

  getFollowers: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const followers = await ctx.db.follow.findMany({
        where: { followingId: input.userId },
        include: {
          follower: {
            include: {
              followedBy: {
                where: { followerId: ctx.session?.user?.id ?? "" },
              },
            },
          },
        },
      });

      return followers.map((f) => ({
        ...f.follower,
        isFollowing: f.follower.followedBy.length > 0,
      }));
    }),

  getFollowing: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const following = await ctx.db.follow.findMany({
        where: { followerId: input.userId },
        include: {
          following: {
            include: {
              followedBy: {
                where: { followerId: ctx.session?.user?.id ?? "" },
              },
            },
          },
        },
      });

      return following.map((f) => ({
        ...f.following,
        isFollowing: f.following.followedBy.length > 0,
      }));
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        bio: z.string().optional(),
        location: z.string().optional(),
        website: z.string().optional(),
        image: z.string().optional(),
        headerImage: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { image: true, headerImage: true },
      });

      if (!currentUser) {
        throw new Error("User not found");
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          name: input.name,
          bio: input.bio,
          location: input.location,
          website: input.website,
          image: input.image,
          headerImage: input.headerImage,
        },
      });

      const profileImageChanged =
        input.image !== undefined &&
        input.image !== currentUser.image &&
        currentUser.image;
      const headerImageChanged =
        input.headerImage !== undefined &&
        input.headerImage !== currentUser.headerImage &&
        currentUser.headerImage;

      await Promise.allSettled([
        profileImageChanged
          ? deleteR2ObjectByUrl(currentUser.image)
          : Promise.resolve(false),
        headerImageChanged
          ? deleteR2ObjectByUrl(currentUser.headerImage)
          : Promise.resolve(false),
      ]);

      return updatedUser;
    }),

  toggleFollow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;
      const existingFollow = await ctx.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: input.userId,
          },
        },
      });

      if (existingFollow == null) {
        await ctx.db.follow.create({
          data: {
            followerId: currentUserId,
            followingId: input.userId,
          },
        });

        await ctx.db.notification.create({
          data: {
            type: "FOLLOW",
            userId: input.userId,
            actorId: currentUserId,
          },
        });

        return { addedFollow: true };
      } else {
        await ctx.db.follow.delete({
          where: {
            followerId_followingId: {
              followerId: currentUserId,
              followingId: input.userId,
            },
          },
        });
        return { addedFollow: false };
      }
    }),

  updateUsername: protectedProcedure
    .input(z.object({ username: z.string().min(3) }))
    .mutation(async ({ ctx, input }) => {
      const existingUser = await ctx.db.user.findUnique({
        where: { username: input.username },
      });

      if (existingUser && existingUser.id !== ctx.session.user.id) {
        throw new Error("Username already taken");
      }

      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { username: input.username },
      });
    }),

  updatePassword: protectedProcedure
    .input(z.object({ password: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      const hashedPassword = await bcrypt.hash(input.password, 10);

      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { password: hashedPassword },
      });
    }),

  blockUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id === input.userId) {
        throw new Error("You cannot block yourself");
      }

      // Remove follow relationship if exists
      await ctx.db.follow.deleteMany({
        where: {
          OR: [
            { followerId: ctx.session.user.id, followingId: input.userId },
            { followerId: input.userId, followingId: ctx.session.user.id },
          ],
        },
      });

      return ctx.db.block.create({
        data: {
          blockerId: ctx.session.user.id,
          blockedId: input.userId,
        },
      });
    }),

  unblockUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.block.delete({
        where: {
          blockerId_blockedId: {
            blockerId: ctx.session.user.id,
            blockedId: input.userId,
          },
        },
      });
    }),
});
