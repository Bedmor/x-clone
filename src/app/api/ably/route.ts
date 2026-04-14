import Ably from "ably";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";

export async function GET(_request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ABLY_API_KEY) {
    return NextResponse.json(
      { error: "Missing ABLY_API_KEY" },
      { status: 500 },
    );
  }

  const client = new Ably.Rest(process.env.ABLY_API_KEY);
  const tokenRequestData = await client.auth.createTokenRequest({
    clientId: session.user.id,
  });

  return NextResponse.json(tokenRequestData);
}
