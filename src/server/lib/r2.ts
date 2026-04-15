import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "~/env";

const R2_PUBLIC_BASE = env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";

function getR2Client() {
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_BUCKET_NAME ||
    !env.R2_PUBLIC_URL
  ) {
    throw new Error("Missing Cloudflare R2 configuration");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export function getR2KeyFromUrl(url: string) {
  if (!url) return null;
  const urlPieces = url.split("?");
  const beforeQuery = urlPieces[0] ?? "";
  const hashPieces = beforeQuery.split("#");
  const normalizedUrl = hashPieces[0] ?? "";

  if (!R2_PUBLIC_BASE || !normalizedUrl.startsWith(R2_PUBLIC_BASE)) {
    return null;
  }

  const key = normalizedUrl.slice(R2_PUBLIC_BASE.length).replace(/^\//, "");
  return key || null;
}

export async function deleteR2ObjectByUrl(url: string | null | undefined) {
  if (!url) return false;

  const key = getR2KeyFromUrl(url);
  if (!key) return false;

  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }),
  );

  return true;
}
