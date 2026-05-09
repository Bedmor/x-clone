import { RemoteImage } from "./RemoteImage";

export function UserAvatar({
  src,
  alt,
  fallback,
  className,
}: {
  src?: string | null;
  alt?: string | null;
  fallback?: string | null;
  className?: string;
}) {
  const fallbackLabel = (fallback ?? alt ?? "U").trim();
  const initial = fallbackLabel.charAt(0).toUpperCase() || "U";

  return (
    <div
      className={`relative overflow-hidden rounded-full bg-gray-500 ${className}`}
    >
      {src ? (
        <RemoteImage
          src={src}
          alt={alt ?? "User avatar"}
          fill
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-700 via-slate-600 to-slate-800 text-sm font-bold text-white">
          {initial}
        </div>
      )}
    </div>
  );
}
