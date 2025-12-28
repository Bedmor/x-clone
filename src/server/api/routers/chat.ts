import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import Ably from "ably";

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
    }),

  createConversation: protectedProcedure
    .input(z.object({ participantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
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
