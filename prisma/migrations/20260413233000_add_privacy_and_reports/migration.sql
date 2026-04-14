-- Create enums
CREATE TYPE "MessagePermission" AS ENUM ('EVERYONE', 'FOLLOWING', 'NO_ONE');
CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'POST');

-- User privacy and messaging preferences
ALTER TABLE "User"
ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "messagePermission" "MessagePermission" NOT NULL DEFAULT 'EVERYONE';

-- Reports table
CREATE TABLE "Report" (
  "id" SERIAL NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "targetType" "ReportTargetType" NOT NULL,
  "reporterId" TEXT NOT NULL,
  "targetUserId" TEXT,
  "targetPostId" INTEGER,

  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");
CREATE INDEX "Report_targetUserId_idx" ON "Report"("targetUserId");
CREATE INDEX "Report_targetPostId_idx" ON "Report"("targetPostId");

ALTER TABLE "Report"
ADD CONSTRAINT "Report_reporterId_fkey"
FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Report"
ADD CONSTRAINT "Report_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Report"
ADD CONSTRAINT "Report_targetPostId_fkey"
FOREIGN KEY ("targetPostId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
