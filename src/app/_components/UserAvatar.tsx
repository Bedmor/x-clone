import Image from "next/image";

export function UserAvatar({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt?: string | null;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-full bg-gray-500 ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt ?? "User avatar"}
          fill
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/50">
          ?
        </div>
      )}
    </div>
  );
}
