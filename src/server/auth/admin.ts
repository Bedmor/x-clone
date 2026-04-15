import type { Session } from "next-auth";

import { db } from "~/server/db";

const ADMIN_USERNAME = "acabesim";

export async function isAdminSession(session: Session | null | undefined) {
  if (!session?.user?.id) {
    return false;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });

  return user?.username === ADMIN_USERNAME;
}
