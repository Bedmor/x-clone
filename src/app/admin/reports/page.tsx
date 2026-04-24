import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Flag, MessageSquare, User } from "lucide-react";

import { auth } from "~/server/auth";
import { isAdminSession } from "~/server/auth/admin";
import { db } from "~/server/db";

export const dynamic = "force-dynamic";

const reportReasonLabels: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Harassment",
  HATE: "Hate",
  VIOLENCE: "Violence",
  NSFW: "NSFW",
  MISINFORMATION: "Misinformation",
  OTHER: "Other",
};

export default async function AdminReportsPage() {
  const session = await auth();

  if (!(await isAdminSession(session))) {
    notFound();
  }

  const reports = await db.report.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      reporter: {
        select: { id: true, name: true, username: true, image: true },
      },
      targetUser: {
        select: { id: true, name: true, username: true, image: true },
      },
      targetPost: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          createdBy: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <div className="flex items-center gap-2 text-sm tracking-[0.2em] text-gray-400 uppercase">
          <Flag className="h-4 w-4" />
          Admin panel
        </div>
        <h1 className="mt-2 text-3xl font-bold">Reports</h1>
        <p className="mt-1 text-sm text-gray-400">Visible only to @acabesim.</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        {reports.length > 0 ? (
          reports.map((report) => (
            <div
              key={report.id}
              className="border-b border-white/10 p-4 last:border-b-0"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                  <span className="rounded-full border border-white/10 px-2 py-1">
                    {report.targetType}
                  </span>
                  <span className="rounded-full border border-white/10 px-2 py-1">
                    {reportReasonLabels[report.reason] ?? report.reason}
                  </span>
                  <span>{new Date(report.createdAt).toLocaleString()}</span>
                </div>

                {report.details && (
                  <p className="max-w-3xl text-sm whitespace-pre-wrap text-gray-300">
                    {report.details}
                  </p>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs tracking-[0.2em] text-gray-400 uppercase">
                      <User className="h-4 w-4" />
                      Reporter
                    </div>
                    <Link
                      href={`/profile/${report.reporter.id}`}
                      className="font-semibold hover:underline"
                    >
                      {report.reporter.name ??
                        report.reporter.username ??
                        report.reporter.id}
                    </Link>
                    <div className="text-sm text-gray-400">
                      @{report.reporter.username ?? report.reporter.id}
                    </div>
                  </div>

                  {report.targetType === "USER" && report.targetUser && (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs tracking-[0.2em] text-gray-400 uppercase">
                        <User className="h-4 w-4" />
                        Target user
                      </div>
                      <Link
                        href={`/profile/${report.targetUser.id}`}
                        className="font-semibold hover:underline"
                      >
                        {report.targetUser.name ??
                          report.targetUser.username ??
                          report.targetUser.id}
                      </Link>
                      <div className="text-sm text-gray-400">
                        @{report.targetUser.username ?? report.targetUser.id}
                      </div>
                    </div>
                  )}

                  {report.targetType === "POST" && report.targetPost && (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 md:col-span-2">
                      <div className="mb-2 flex items-center gap-2 text-xs tracking-[0.2em] text-gray-400 uppercase">
                        <MessageSquare className="h-4 w-4" />
                        Target post
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                        <Link
                          href={`/profile/${report.targetPost.createdBy.id}`}
                          className="font-semibold text-white hover:underline"
                        >
                          {report.targetPost.createdBy.name ??
                            report.targetPost.createdBy.username ??
                            report.targetPost.createdBy.id}
                        </Link>
                        <span>·</span>
                        <span>
                          {new Date(
                            report.targetPost.createdAt,
                          ).toLocaleDateString()}
                        </span>
                        <Link
                          href={`/post/${report.targetPost.id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 hover:bg-white/10"
                        >
                          Open post
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                      <p className="mt-3 max-h-24 overflow-hidden text-sm whitespace-pre-wrap text-gray-300">
                        {report.targetPost.content ?? "[media-only post]"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-sm text-gray-400">No reports yet.</div>
        )}
      </div>
    </div>
  );
}
