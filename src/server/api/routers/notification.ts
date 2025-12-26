import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const notificationRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.notification.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        actor: true,
        post: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.notification.update({
        where: { id: input.id },
        data: { read: true },
      });
    }),
});
