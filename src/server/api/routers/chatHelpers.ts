import type { PrismaClient } from "../../../../generated/prisma";
import { TRPCError } from "@trpc/server";

const slowQueryThresholdMs = Number(process.env.DB_SLOW_QUERY_MS ?? 200);

export async function withQueryTiming<T>(label: string, fn: () => Promise<T>) {
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

export const conversationParticipantSelect = {
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

export const conversationMessageSelect = {
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

export async function assertCanMessage(
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

export async function getConversationParticipantOrThrow(
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

export function ensureOwnerOrAdmin(role: "OWNER" | "ADMIN" | "MEMBER") {
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only group owners/admins can perform this action",
    });
  }
}

export function ensureOwner(role: "OWNER" | "ADMIN" | "MEMBER") {
  if (role !== "OWNER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only group owner can perform this action",
    });
  }
}

export async function createSystemMessage(
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

const chatHelpers = {};

export default chatHelpers;
