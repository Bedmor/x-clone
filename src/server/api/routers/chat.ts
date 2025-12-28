import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const chatRouter = createTRPCRouter({
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
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.message.findMany({
        where: {
          conversationId: input.conversationId,
        },
        include: {
          sender: true,
        },
        orderBy: {
          createdAt: "asc",
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
