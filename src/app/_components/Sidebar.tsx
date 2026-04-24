import Link from "next/link";
import type { Session } from "next-auth";
import {
  Home,
  User,
  Settings,
  LogOut,
  Bell,
  Mail,
  Search,
  Bookmark,
  Flag,
} from "lucide-react";
import { Logo } from "./Logo";
import { UserAvatar } from "./UserAvatar";

export function Sidebar({
  session,
  isAdmin,
}: {
  session: Session | null;
  isAdmin: boolean;
}) {
  const userImage =
    typeof session?.user.image === "string" ? session.user.image : null;
  const userName =
    typeof session?.user.name === "string" ? session.user.name : null;
  const userId = typeof session?.user.id === "string" ? session.user.id : "";

  return (
    <div className="hidden h-full w-64 flex-col border-r border-white/20 p-4 md:flex">
      <div className="mb-8 flex items-center gap-2 text-2xl font-bold">
        <Logo className="h-8 w-8 text-white" />
        <span>Flowzest</span>
      </div>
      <nav className="flex flex-col gap-4">
        <Link
          href="/"
          className="flex items-center gap-4 rounded-full p-3 text-xl hover:bg-white/10"
        >
          <Home className="h-7 w-7" />
          <span>Ana Sayfa</span>
        </Link>
        <Link
          href="/explore"
          className="flex items-center gap-4 rounded-full p-3 text-xl hover:bg-white/10"
        >
          <Search className="h-7 w-7" />
          <span>Keşfet</span>
        </Link>
        {session && (
          <Link
            href="/bookmarks"
            className="flex items-center gap-4 rounded-full p-3 text-xl hover:bg-white/10"
          >
            <Bookmark className="h-7 w-7" />
            <span>Yer İşaretleri</span>
          </Link>
        )}
        {session && (
          <>
            <Link
              href="/notifications"
              className="flex items-center gap-4 rounded-full p-3 text-xl hover:bg-white/10"
            >
              <Bell className="h-7 w-7" />
              <span>Bildirimler</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin/reports"
                className="flex items-center gap-4 rounded-full p-3 text-xl hover:bg-white/10"
              >
                <Flag className="h-7 w-7" />
                <span>Raporlar</span>
              </Link>
            )}
            <Link
              href="/chat"
              className="flex items-center gap-4 rounded-full p-3 text-xl hover:bg-white/10"
            >
              <Mail className="h-7 w-7" />
              <span>Mesajlar</span>
            </Link>
            <Link
              href={`/profile/${userId}`}
              className="flex items-center gap-4 rounded-full p-3 text-xl hover:bg-white/10"
            >
              <User className="h-7 w-7" />
              <span>Profil</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-4 rounded-full p-3 text-xl hover:bg-white/10"
            >
              <Settings className="h-7 w-7" />
              <span>Ayarlar</span>
            </Link>
          </>
        )}
      </nav>
      <div className="mt-auto flex flex-col gap-2">
        {session ? (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl border border-white/20 p-3 hover:bg-white/10">
              <UserAvatar
                src={userImage}
                alt={userName}
                fallback={userName ?? userId}
                className="h-11 w-11"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  {userName ?? "Kullanıcı"}
                </div>
                <div className="truncate text-xs text-gray-400">@{userId}</div>
              </div>
            </summary>
            <div className="mt-2">
              <Link
                href="/api/auth/signout"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-red-500 py-2.5 font-bold hover:bg-red-600"
              >
                <LogOut className="h-5 w-5" />
                <span>Çıkış Yap</span>
              </Link>
            </div>
          </details>
        ) : (
          <>
            <Link
              href="/signin"
              className="block w-full rounded-full bg-blue-500 py-2 text-center font-bold hover:bg-blue-600"
            >
              Giriş Yap
            </Link>
            <Link
              href="/signup"
              className="block w-full rounded-full border border-white/20 py-2 text-center font-bold hover:bg-white/10"
            >
              Kayıt Ol
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
