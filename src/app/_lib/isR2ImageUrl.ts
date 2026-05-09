export function isR2ImageUrl(src?: string | null): boolean {
  if (!src) {
    return false;
  }

  try {
    const hostname = new URL(src).hostname.toLowerCase();

    return (
      hostname.endsWith(".r2.dev") ||
      hostname.endsWith(".r2.cloudflarestorage.com")
    );
  } catch {
    return false;
  }
}