import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const reportReasonSchema = z.enum([
  "SPAM",
  "HARASSMENT",
  "HATE",
  "VIOLENCE",
  "NSFW",
  "MISINFORMATION",
  "OTHER",
]);

export const reportRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        postId: z.number().optional(),
        userId: z.string().optional(),
        reason: reportReasonSchema,
        details: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if ((input.postId && input.userId) || (!input.postId && !input.userId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provide either postId or userId",
        });
      }

      if (input.userId) {
        if (input.userId === ctx.session.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot report yourself",
          });
        }

        const targetUser = await ctx.db.user.findUnique({
          where: { id: input.userId },
          select: { id: true },
        });

        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        await ctx.db.$executeRaw`
          INSERT INTO "Report" ("reporterId", "targetType", "targetUserId", "reason", "details")
          VALUES (
            ${ctx.session.user.id},
            ${"USER"}::"ReportTargetType",
            ${input.userId},
            ${input.reason},
            ${input.details ?? null}
          )
        `;

        return { success: true };
      }

      if (!input.postId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Post id is required",
        });
      }

      const targetPost = await ctx.db.post.findUnique({
        where: { id: input.postId },
        select: { id: true, createdById: true },
      });

      if (!targetPost) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }

      if (targetPost.createdById === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot report your own post",
        });
      }

      await ctx.db.$executeRaw`
        INSERT INTO "Report" ("reporterId", "targetType", "targetPostId", "reason", "details")
        VALUES (
          ${ctx.session.user.id},
          ${"POST"}::"ReportTargetType",
          ${targetPost.id},
          ${input.reason},
          ${input.details ?? null}
        )
      `;

      return { success: true };
    }),
});
