import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import Ably from "ably";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "../../../../generated/prisma";

const slowQueryThresholdMs = Number(process.env.DB_SLOW_QUERY_MS ?? 200);

async function withQueryTiming<T>(label: string, fn: () => Promise<T>) {
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

const conversationParticipantSelect = {
  userId: true,
  role: true,
  hasSeenLatest: true,
  user: {
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      lastSeen: true,
    },
  },
} as const;

const conversationMessageSelect = {
  id: true,
  content: true,
  attachmentUrl: true,
  isSystem: true,
  createdAt: true,
  senderId: true,
  replyTo: {
    select: {
      id: true,
      content: true,
      senderId: true,
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  },
  sender: {
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      lastSeen: true,
    },
  },
} as const;

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

async function getConversationParticipantOrThrow(
  db: PrismaClient,
  userId: string,
  conversationId: string,
) {
  const participant = await db.conversationParticipant.findUnique({
    where: {
      userId_conversationId: {
        userId,
        conversationId,
      },
    },
    select: { id: true, role: true },
  });

  if (!participant) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not allowed" });
  }

  return participant;
}

function ensureOwnerOrAdmin(role: "OWNER" | "ADMIN" | "MEMBER") {
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only group owners/admins can perform this action",
    });
  }
}

function ensureOwner(role: "OWNER" | "ADMIN" | "MEMBER") {
  if (role !== "OWNER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only group owner can perform this action",
    });
  }
}

async function createSystemMessage(
  db: PrismaClient,
  conversationId: string,
  senderId: string,
  content: string,
) {
  await db.message.create({
    data: {
      conversationId,
      senderId,
      content,
      isSystem: true,
    },
  });
}

export const chatRouter = createTRPCRouter({
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string(),
        attachmentUrl: z.string().nullable().optional(),
        replyToId: z.string().nullable().optional(),
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

      const recipients = await ctx.db.conversationParticipant.findMany({
        where: {
          conversationId: input.conversationId,
          userId: { not: ctx.session.user.id },
        },
        select: { userId: true },
      });

      for (const recipient of recipients) {
        await assertCanMessage(ctx.db, ctx.session.user.id, recipient.userId);
      }

      if (input.replyToId) {
        const replyTarget = await ctx.db.message.findUnique({
          where: { id: input.replyToId },
          select: { conversationId: true },
        });

        if (!replyTarget || replyTarget.conversationId !== input.conversationId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Reply target is invalid",
          });
        }
      }

      const message = await ctx.db.message.create({
        data: {
          content: input.content,
          attachmentUrl: input.attachmentUrl,
          conversationId: input.conversationId,
          senderId: ctx.session.user.id,
          replyToId: input.replyToId,
          isSystem: false,
        },
        select: {
          id: true,
          content: true,
          attachmentUrl: true,
          isSystem: true,
          createdAt: true,
          senderId: true,
          conversationId: true,
          sender: true,
          replyTo: {
            select: {
              id: true,
              content: true,
              senderId: true,
              sender: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
          reactions: {
            select: {
              id: true,
              emoji: true,
              userId: true,
            },
          },
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
    return withQueryTiming("chat.getConversations.findMany", () =>
      ctx.db.conversation.findMany({
        where: {
          participants: {
            some: {
              userId: ctx.session.user.id,
            },
          },
        },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          participants: {
            select: conversationParticipantSelect,
          },
          messages: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: conversationMessageSelect,
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
    );
  }),

  getRecentConversations: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(10).default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 5;

      return withQueryTiming("chat.getRecentConversations.findMany", () =>
        ctx.db.conversation.findMany({
          where: {
            participants: {
              some: {
                userId: ctx.session.user.id,
              },
            },
          },
          take: limit,
          select: {
            id: true,
            title: true,
            updatedAt: true,
            participants: {
              select: conversationParticipantSelect,
            },
            messages: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
              select: conversationMessageSelect,
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
      );
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

      const messages = await withQueryTiming("chat.getMessages.findMany", () =>
        ctx.db.message.findMany({
          where: {
            conversationId: input.conversationId,
          },
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            content: true,
            attachmentUrl: true,
            isSystem: true,
            createdAt: true,
            senderId: true,
            conversationId: true,
            replyTo: {
              select: {
                id: true,
                content: true,
                senderId: true,
                sender: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                  },
                },
              },
            },
            reactions: {
              select: {
                id: true,
                emoji: true,
                userId: true,
              },
            },
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
                lastSeen: true,
              },
            },
          },
        }),
      );

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
    .input(
      z.object({
        participantIds: z.array(z.string()).min(1),
        title: z.string().trim().max(60).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const uniqueParticipantIds = Array.from(
        new Set(input.participantIds.filter((id) => id !== ctx.session.user.id)),
      );

      if (uniqueParticipantIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least one participant is required",
        });
      }

      for (const participantId of uniqueParticipantIds) {
        await assertCanMessage(ctx.db, ctx.session.user.id, participantId);
      }

      if (uniqueParticipantIds.length === 1) {
        const targetUserId = uniqueParticipantIds[0]!;

        // Check if direct conversation already exists.
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
                    userId: targetUserId,
                  },
                },
              },
              {
                participants: {
                  every: {
                    userId: { in: [ctx.session.user.id, targetUserId] },
                  },
                },
              },
            ],
          },
          select: { id: true },
        });

        if (existing) {
          return existing;
        }
      }

      return ctx.db.conversation.create({
        data: {
          title: uniqueParticipantIds.length > 1 ? input.title ?? null : null,
          participants: {
            create: [
              { userId: ctx.session.user.id, role: "OWNER" },
              ...uniqueParticipantIds.map((userId) => ({
                userId,
                role: "MEMBER" as const,
              })),
            ],
          },
        },
        select: { id: true, title: true },
      });
    }),

  updateConversationTitle: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        title: z.string().trim().max(60),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const participant = await getConversationParticipantOrThrow(
        ctx.db,
        ctx.session.user.id,
        input.conversationId,
      );
      ensureOwnerOrAdmin(participant.role);

      const cleanedTitle = input.title.trim();

      const conversation = await ctx.db.conversation.findUnique({
        where: { id: input.conversationId },
        select: { title: true },
      });

      await ctx.db.conversation.update({
        where: { id: input.conversationId },
        data: {
          title: cleanedTitle.length > 0 ? cleanedTitle : null,
        },
      });

      if (conversation?.title !== (cleanedTitle.length > 0 ? cleanedTitle : null)) {
        const actor = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { name: true, username: true },
        });

        await createSystemMessage(
          ctx.db,
          input.conversationId,
          ctx.session.user.id,
          `${actor?.name ?? actor?.username ?? "Kullanıcı"} grup adını güncelledi.`,
        );
      }

      return { success: true };
    }),

  addParticipants: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        participantIds: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const participant = await getConversationParticipantOrThrow(
        ctx.db,
        ctx.session.user.id,
        input.conversationId,
      );
      ensureOwnerOrAdmin(participant.role);

      const existingParticipants = await ctx.db.conversationParticipant.findMany({
        where: { conversationId: input.conversationId },
        select: { userId: true },
      });

      const existingIds = new Set(existingParticipants.map((item) => item.userId));

      const uniqueNewIds = Array.from(
        new Set(
          input.participantIds.filter(
            (id) => id !== ctx.session.user.id && !existingIds.has(id),
          ),
        ),
      );

      if (uniqueNewIds.length === 0) {
        return { success: true, added: 0 };
      }

      for (const participantId of uniqueNewIds) {
        await assertCanMessage(ctx.db, ctx.session.user.id, participantId);
      }

      await ctx.db.conversationParticipant.createMany({
        data: uniqueNewIds.map((userId) => ({
          userId,
          conversationId: input.conversationId,
          role: "MEMBER",
        })),
        skipDuplicates: true,
      });

      const actor = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { name: true, username: true },
      });
      const addedUsers = await ctx.db.user.findMany({
        where: { id: { in: uniqueNewIds } },
        select: { name: true, username: true },
      });

      await createSystemMessage(
        ctx.db,
        input.conversationId,
        ctx.session.user.id,
        `${actor?.name ?? actor?.username ?? "Kullanıcı"} katılımcı ekledi: ${addedUsers
          .map((user) => user.name ?? user.username ?? "kullanıcı")
          .join(", ")}.`,
      );

      return { success: true, added: uniqueNewIds.length };
    }),

  removeParticipant: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const participant = await getConversationParticipantOrThrow(
        ctx.db,
        ctx.session.user.id,
        input.conversationId,
      );
      ensureOwner(participant.role);

      const participants = await ctx.db.conversationParticipant.findMany({
        where: { conversationId: input.conversationId },
        select: { userId: true, role: true },
      });

      const participantCount = participants.length;
      const isRemovingSelf = input.userId === ctx.session.user.id;
      const targetParticipant = participants.find(
        (item) => item.userId === input.userId,
      );

      if (!targetParticipant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Participant not found" });
      }

      if (targetParticipant.role === "OWNER") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Owner cannot be removed",
        });
      }

      if (!isRemovingSelf && participantCount <= 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove users from a direct conversation",
        });
      }

      await ctx.db.conversationParticipant.delete({
        where: {
          userId_conversationId: {
            userId: input.userId,
            conversationId: input.conversationId,
          },
        },
      });

      const actor = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { name: true, username: true },
      });
      const removed = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { name: true, username: true },
      });

      await createSystemMessage(
        ctx.db,
        input.conversationId,
        ctx.session.user.id,
        `${actor?.name ?? actor?.username ?? "Kullanıcı"} ${removed?.name ?? removed?.username ?? "bir kullanıcıyı"} gruptan çıkardı.`,
      );

      return { success: true };
    }),

  leaveConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const participant = await getConversationParticipantOrThrow(
        ctx.db,
        ctx.session.user.id,
        input.conversationId,
      );

      const allParticipants = await ctx.db.conversationParticipant.findMany({
        where: { conversationId: input.conversationId },
        select: { userId: true, role: true },
      });

      const remaining = allParticipants.filter(
        (item) => item.userId !== ctx.session.user.id,
      );

      await ctx.db.conversationParticipant.delete({
        where: {
          userId_conversationId: {
            userId: ctx.session.user.id,
            conversationId: input.conversationId,
          },
        },
      });

      if (participant.role === "OWNER" && remaining.length > 0) {
        const promoteTarget =
          remaining.find((item) => item.role === "ADMIN") ?? remaining[0];

        if (promoteTarget) {
          await ctx.db.conversationParticipant.update({
            where: {
              userId_conversationId: {
                userId: promoteTarget.userId,
                conversationId: input.conversationId,
              },
            },
            data: { role: "OWNER" },
          });
        }
      }

      const actor = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { name: true, username: true },
      });

      await createSystemMessage(
        ctx.db,
        input.conversationId,
        ctx.session.user.id,
        `${actor?.name ?? actor?.username ?? "Kullanıcı"} gruptan ayrıldı.`,
      );

      return { success: true };
    }),

  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const participant = await getConversationParticipantOrThrow(
        ctx.db,
        ctx.session.user.id,
        input.conversationId,
      );
      ensureOwner(participant.role);

      const participantCount = await ctx.db.conversationParticipant.count({
        where: { conversationId: input.conversationId },
      });

      if (participantCount <= 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Direct conversations cannot be deleted as a group",
        });
      }

      await ctx.db.conversation.delete({
        where: { id: input.conversationId },
      });

      return { success: true };
    }),

  setParticipantRole: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        userId: z.string(),
        role: z.enum(["ADMIN", "MEMBER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const participant = await getConversationParticipantOrThrow(
        ctx.db,
        ctx.session.user.id,
        input.conversationId,
      );
      ensureOwner(participant.role);

      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Owner role cannot be changed",
        });
      }

      const target = await ctx.db.conversationParticipant.findUnique({
        where: {
          userId_conversationId: {
            userId: input.userId,
            conversationId: input.conversationId,
          },
        },
        select: { role: true },
      });

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Participant not found" });
      }

      if (target.role === input.role) {
        return { success: true };
      }

      await ctx.db.conversationParticipant.update({
        where: {
          userId_conversationId: {
            userId: input.userId,
            conversationId: input.conversationId,
          },
        },
        data: { role: input.role },
      });

      const actor = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { name: true, username: true },
      });
      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { name: true, username: true },
      });

      await createSystemMessage(
        ctx.db,
        input.conversationId,
        ctx.session.user.id,
        `${actor?.name ?? actor?.username ?? "Kullanıcı"} ${targetUser?.name ?? targetUser?.username ?? "kullanıcı"} rolünü ${input.role === "ADMIN" ? "admin" : "üye"} olarak güncelledi.`,
      );

      return { success: true };
    }),

  toggleReaction: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        emoji: z.string().trim().min(1).max(16),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.message.findUnique({
        where: { id: input.messageId },
        select: { id: true, conversationId: true },
      });

      if (!message) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
      }

      const participant = await ctx.db.conversationParticipant.findUnique({
        where: {
          userId_conversationId: {
            userId: ctx.session.user.id,
            conversationId: message.conversationId,
          },
        },
        select: { id: true },
      });

      if (!participant) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not allowed" });
      }

      const existing = await ctx.db.messageReaction.findUnique({
        where: {
          messageId_userId_emoji: {
            messageId: input.messageId,
            userId: ctx.session.user.id,
            emoji: input.emoji,
          },
        },
        select: { id: true },
      });

      if (existing) {
        await ctx.db.messageReaction.delete({ where: { id: existing.id } });
      } else {
        await ctx.db.messageReaction.create({
          data: {
            messageId: input.messageId,
            userId: ctx.session.user.id,
            emoji: input.emoji,
          },
        });
      }

      if (process.env.ABLY_API_KEY) {
        const ably = new Ably.Rest(process.env.ABLY_API_KEY);
        const channel = ably.channels.get(`conversation-${message.conversationId}`);
        await channel.publish("reaction_update", {
          messageId: input.messageId,
          emoji: input.emoji,
          userId: ctx.session.user.id,
        });
      }

      return { success: true };
    }),
});
