"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  const isOwnProfileActive = pathname === `/profile/${userId}`;

  const navClass = (active: boolean) =>
    `flex items-center gap-4 rounded-full p-3 text-xl transition ${
      active ? "text-white" : "text-gray-400 hover:bg-white/10 hover:text-white"
    }`;

  const iconClass = (active: boolean) =>
    `h-7 w-7 transition ${active ? "text-white" : "text-white"}`;

  const activeIconProps = (active: boolean, filled: boolean) =>
    filled
      ? {
          fill: active ? "currentColor" : "none",
          strokeWidth: 1.75,
        }
      : {
          fill: "none",
          strokeWidth: active ? 2.5 : 2,
        };

  return (
    <div className="hidden h-full w-64 flex-col border-r border-white/20 p-4 md:flex">
      <div className="mb-8 flex items-center gap-2 text-2xl font-bold">
        <Logo className="h-8 w-8 text-white" />
        <span>Flowzest</span>
      </div>
      <nav className="flex flex-col gap-4">
        <Link href="/" className={navClass(isActive("/"))}>
          <Home
            className={iconClass(isActive("/"))}
            {...activeIconProps(isActive("/"), true)}
          />
          <span>Ana Sayfa</span>
        </Link>
        <Link href="/explore" className={navClass(isActive("/explore"))}>
          <Search
            className={iconClass(isActive("/explore"))}
            {...activeIconProps(isActive("/explore"), false)}
          />
          <span>Keşfet</span>
        </Link>
        {session && (
          <Link href="/bookmarks" className={navClass(isActive("/bookmarks"))}>
            <Bookmark
              className={iconClass(isActive("/bookmarks"))}
              {...activeIconProps(isActive("/bookmarks"), true)}
            />
            <span>Yer İşaretleri</span>
          </Link>
        )}
        {session && (
          <>
            <Link
              href="/notifications"
              className={navClass(isActive("/notifications"))}
            >
              <Bell
                className={iconClass(isActive("/notifications"))}
                {...activeIconProps(isActive("/notifications"), true)}
              />
              <span>Bildirimler</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin/reports"
                className={navClass(isActive("/admin/reports"))}
              >
                <Flag
                  className={iconClass(isActive("/admin/reports"))}
                  {...activeIconProps(isActive("/admin/reports"), true)}
                />
                <span>Raporlar</span>
              </Link>
            )}
            <Link href="/chat" className={navClass(isActive("/chat"))}>
              <Mail
                className={iconClass(isActive("/chat"))}
                {...activeIconProps(isActive("/chat"), true)}
              />
              <span>Mesajlar</span>
            </Link>
            <Link
              href={`/profile/${userId}`}
              className={navClass(isOwnProfileActive)}
            >
              <User
                className={iconClass(isOwnProfileActive)}
                {...activeIconProps(isOwnProfileActive, false)}
              />
              <span>Profil</span>
            </Link>
            <Link href="/settings" className={navClass(isActive("/settings"))}>
              <Settings
                className={iconClass(isActive("/settings"))}
                {...activeIconProps(isActive("/settings"), false)}
              />
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
