import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

const reportInputSchema = z.object({
  postId: z.number().int().positive(),
  reason: z.enum([
    "SPAM",
    "HARASSMENT",
    "HATE",
    "VIOLENCE",
    "NSFW",
    "MISINFORMATION",
    "OTHER",
  ]),
  details: z.string().trim().max(500).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = (await request.json()) as unknown;
    const input = reportInputSchema.parse(json);

    const targetPost = await db.post.findUnique({
      where: { id: input.postId },
      select: { id: true, createdById: true },
    });

    if (!targetPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (targetPost.createdById === session.user.id) {
      return NextResponse.json(
        { error: "You cannot report your own post" },
        { status: 400 },
      );
    }

    await db.$executeRaw`
      INSERT INTO "Report" ("reporterId", "targetType", "targetPostId", "reason", "details")
      VALUES (
        ${session.user.id},
        ${"POST"}::"ReportTargetType",
        ${targetPost.id},
        ${input.reason},
        ${input.details ?? null}
      )
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit report" },
      { status: 500 },
    );
  }
}
