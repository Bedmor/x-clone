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

export function Sidebar({
  session,
  isAdmin,
}: {
  session: Session | null;
  isAdmin: boolean;
}) {
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
              href={`/profile/${session.user.id}`}
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
          <Link
            href="/api/auth/signout"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-red-500 py-3 font-bold hover:bg-red-600"
          >
            <LogOut className="h-5 w-5" />
            <span>Çıkış Yap</span>
          </Link>
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
