import Link from "next/link";
import type { Session } from "next-auth";
import { Settings, Bookmark, Flag, User } from "lucide-react";
import { UserAvatar } from "./UserAvatar";

export function MobileHeader({
  session,
  isAdmin,
}: {
  session: Session | null;
  isAdmin: boolean;
}) {
  if (!session) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/15 bg-black/95 px-3 py-2 backdrop-blur md:hidden">
      <details className="group relative">
        <summary className="inline-flex cursor-pointer list-none items-center rounded-full p-1 hover:bg-white/10">
          <UserAvatar
            src={session.user.image}
            alt={session.user.name}
            fallback={session.user.username ?? session.user.name}
            className="h-10 w-10"
          />
        </summary>

        <div className="absolute top-14 left-0 w-56 overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl">
          <Link
            href={`/profile/${session.user.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/10"
          >
            <User className="h-5 w-5" />
            <span>Profil</span>
          </Link>
          <Link
            href="/bookmarks"
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/10"
          >
            <Bookmark className="h-5 w-5" />
            <span>Yer Isaretleri</span>
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/10"
          >
            <Settings className="h-5 w-5" />
            <span>Ayarlar</span>
          </Link>
          {isAdmin && (
            <Link
              href="/admin/reports"
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/10"
            >
              <Flag className="h-5 w-5" />
              <span>Raporlar</span>
            </Link>
          )}
        </div>
      </details>
    </header>
  );
}
