import { z } from "zod";
import bcrypt from "bcryptjs";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

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
          pinnedPost: {
            include: {
              createdBy: true,
              likes: {
                where: { userId: ctx.session?.user?.id ?? "" },
              },
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
                  createdBy: true,
                  likes: { where: { userId: ctx.session?.user?.id ?? "" } },
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
          pinnedPost: {
            include: {
              createdBy: true,
              likes: {
                where: { userId: ctx.session?.user?.id ?? "" },
              },
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
                  createdBy: true,
                  likes: { where: { userId: ctx.session?.user?.id ?? "" } },
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

      const pinnedPost = user.pinnedPost
        ? {
            ...user.pinnedPost,
            isLiked: user.pinnedPost.likes.length > 0,
            isReposted: user.pinnedPost.reposts.length > 0,
            isPinned: user.pinnedPost.pinnedBy.length > 0,
            repostOf: user.pinnedPost.repostOf
              ? {
                  ...user.pinnedPost.repostOf,
                  isLiked: user.pinnedPost.repostOf.likes.length > 0,
                  isReposted: user.pinnedPost.repostOf.reposts.length > 0,
                  isPinned: user.pinnedPost.repostOf.pinnedBy.length > 0,
                }
              : null,
          }
        : null;

      return {
        ...user,
        isFollowing: user.followedBy.length > 0,
        pinnedPost,
      };
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

  searchUsers: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!input.query) return [];
      return ctx.db.user.findMany({
        where: {
          OR: [
            { name: { contains: input.query, mode: "insensitive" } },
            { username: { contains: input.query, mode: "insensitive" } },
          ],
        },
        take: 10,
      });
    }),

  getPosts: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const posts = await ctx.db.post.findMany({
        where: { createdById: input.userId, parentId: null },
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: true,
          likes: {
            where: { userId: ctx.session?.user?.id ?? "" },
          },
          reposts: {
            where: { createdById: ctx.session?.user?.id ?? "" },
          },
          pinnedBy: {
            where: { id: ctx.session?.user?.id ?? "" },
            select: { id: true },
          },
          repostOf: {
            include: {
              createdBy: true,
              likes: { where: { userId: ctx.session?.user?.id ?? "" } },
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

      return posts.map((post) => ({
        ...post,
        isLiked: post.likes.length > 0,
        isReposted: post.reposts.length > 0,
        isPinned: post.pinnedBy.length > 0,
        repostOf: post.repostOf
          ? {
              ...post.repostOf,
              isLiked: post.repostOf.likes.length > 0,
              isReposted: post.repostOf.reposts.length > 0,
              isPinned: post.repostOf.pinnedBy.length > 0,
            }
          : null,
      }));
    }),

  getReplies: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const posts = await ctx.db.post.findMany({
        where: { createdById: input.userId, parentId: { not: null } },
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: true,
          likes: {
            where: { userId: ctx.session?.user?.id ?? "" },
          },
          reposts: {
            where: { createdById: ctx.session?.user?.id ?? "" },
          },
          pinnedBy: {
            where: { id: ctx.session?.user?.id ?? "" },
            select: { id: true },
          },
          repostOf: {
            include: {
              createdBy: true,
              likes: { where: { userId: ctx.session?.user?.id ?? "" } },
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

      return posts.map((post) => ({
        ...post,
        isLiked: post.likes.length > 0,
        isReposted: post.reposts.length > 0,
        isPinned: post.pinnedBy.length > 0,
        repostOf: post.repostOf
          ? {
              ...post.repostOf,
              isLiked: post.repostOf.likes.length > 0,
              isReposted: post.repostOf.reposts.length > 0,
              isPinned: post.repostOf.pinnedBy.length > 0,
            }
          : null,
      }));
    }),

  getLikes: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const likes = await ctx.db.like.findMany({
        where: { userId: input.userId },
        orderBy: { post: { createdAt: "desc" } },
        include: {
          post: {
            include: {
              createdBy: true,
              likes: {
                where: { userId: ctx.session?.user?.id ?? "" },
              },
              reposts: { where: { createdById: ctx.session?.user?.id ?? "" } },
              pinnedBy: {
                where: { id: ctx.session?.user?.id ?? "" },
                select: { id: true },
              },
              repostOf: {
                include: {
                  createdBy: true,
                  likes: { where: { userId: ctx.session?.user?.id ?? "" } },
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

      return likes.map((like) => ({
        ...like.post,
        isLiked: like.post.likes.length > 0,
        isReposted: like.post.reposts.length > 0,
        isPinned: like.post.pinnedBy.length > 0,
        repostOf: like.post.repostOf
          ? {
              ...like.post.repostOf,
              isLiked: like.post.repostOf.likes.length > 0,
              isReposted: like.post.repostOf.reposts.length > 0,
              isPinned: like.post.repostOf.pinnedBy.length > 0,
            }
          : null,
      }));
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
      return ctx.db.user.update({
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
});
