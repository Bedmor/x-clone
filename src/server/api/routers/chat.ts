import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import Ably from "ably";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "../../../../generated/prisma";

async function assertCanMessage(
  db: PrismaClient,
  senderId: string,
  recipientId: string,
) {
  if (senderId === recipientId) return;

  const [recipient, block] = await Promise.all([
    db.user.findUnique({
      where: { id: recipientId },
      select: { messagePermission: true },
    }),
    db.block.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: recipientId },
          { blockerId: recipientId, blockedId: senderId },
        ],
      },
    }),
  ]);

  if (!recipient) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  if (block) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Messaging is unavailable for this user",
    });
  }

  if (recipient.messagePermission === "NO_ONE") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This user is not accepting new messages",
    });
  }

  if (recipient.messagePermission === "FOLLOWING") {
    const followedByRecipient = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: recipientId,
          followingId: senderId,
        },
      },
    });

    if (!followedByRecipient) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only people this user follows can message them",
      });
    }
  }
}

export const chatRouter = createTRPCRouter({
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string(),
        attachmentUrl: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const participant = await ctx.db.conversationParticipant.findUnique({
        where: {
          userId_conversationId: {
            userId: ctx.session.user.id,
            conversationId: input.conversationId,
          },
        },
        select: { id: true },
      });

      if (!participant) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not allowed" });
      }

      const recipient = await ctx.db.conversationParticipant.findFirst({
        where: {
          conversationId: input.conversationId,
          userId: { not: ctx.session.user.id },
        },
        select: { userId: true },
      });

      if (recipient) {
        await assertCanMessage(ctx.db, ctx.session.user.id, recipient.userId);
      }

      const message = await ctx.db.message.create({
        data: {
          content: input.content,
          attachmentUrl: input.attachmentUrl,
          conversationId: input.conversationId,
          senderId: ctx.session.user.id,
        },
        include: {
          sender: true,
        },
      });

      // Update conversation participants: set hasSeenLatest = false for others
      await ctx.db.conversationParticipant.updateMany({
        where: {
          conversationId: input.conversationId,
          userId: {
            not: ctx.session.user.id,
          },
        },
        data: {
          hasSeenLatest: false,
        },
      });

      // Update sender's hasSeenLatest to true and update lastSeen
      await ctx.db.conversationParticipant.updateMany({
        where: {
          conversationId: input.conversationId,
          userId: ctx.session.user.id,
        },
        data: {
          hasSeenLatest: true,
        },
      });

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { lastSeen: new Date() },
      });

      // Publish to Ably
      if (process.env.ABLY_API_KEY) {
        const ably = new Ably.Rest(process.env.ABLY_API_KEY);
        const channel = ably.channels.get(
          `conversation-${input.conversationId}`,
        );
        await channel.publish("new_message", message);
      }

      return message;
    }),

  getConversations: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: ctx.session.user.id,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }),

  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 20;
      const { cursor } = input;

      const messages = await ctx.db.message.findMany({
        where: {
          conversationId: input.conversationId,
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          sender: true,
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem!.id;
      }

      return {
        messages,
        nextCursor,
      };
    }),

  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.conversationParticipant.update({
        where: {
          userId_conversationId: {
            userId: ctx.session.user.id,
            conversationId: input.conversationId,
          },
        },
        data: {
          hasSeenLatest: true,
        },
      });

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { lastSeen: new Date() },
      });
    }),

  createConversation: protectedProcedure
    .input(z.object({ participantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.participantId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot create a conversation with yourself",
        });
      }

      await assertCanMessage(ctx.db, ctx.session.user.id, input.participantId);

      // Check if conversation already exists
      const existing = await ctx.db.conversation.findFirst({
        where: {
          AND: [
            {
              participants: {
                some: {
                  userId: ctx.session.user.id,
                },
              },
            },
            {
              participants: {
                some: {
                  userId: input.participantId,
                },
              },
            },
          ],
        },
      });

      if (existing) {
        return existing;
      }

      return ctx.db.conversation.create({
        data: {
          participants: {
            create: [
              { userId: ctx.session.user.id },
              { userId: input.participantId },
            ],
          },
        },
      });
    }),
});
