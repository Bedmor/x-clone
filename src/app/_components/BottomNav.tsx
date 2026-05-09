"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { Bell, Mail, Search, Home } from "lucide-react";
import { usePathname } from "next/navigation";
import { api } from "~/trpc/react";

export function BottomNav({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const { data: notifications = [] } = api.notification.getAll.useQuery(
    undefined,
    { enabled: Boolean(session) },
  );

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const linkClass = (active: boolean) =>
    `relative flex flex-col items-center justify-center rounded-full p-2 transition ${
      active
        ? "text-white scale-110"
        : "text-gray-400 hover:bg-white/10 hover:text-white"
    }`;

  const iconClass = (active: boolean) =>
    `h-6 w-6 transition ${active ? "text-white" : "text-white"}`;

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

  const badgeText = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 flex h-16 w-full items-center justify-around border-t border-white/20 bg-black md:hidden">
      <Link href="/" className={linkClass(pathname === "/")}>
        <Home
          className={iconClass(pathname === "/")}
          {...activeIconProps(pathname === "/", true)}
        />
      </Link>
      <Link href="/explore" className={linkClass(pathname === "/explore")}>
        <Search
          className={iconClass(pathname === "/explore")}
          {...activeIconProps(pathname === "/explore", false)}
        />
      </Link>
      {session && (
        <>
          <Link
            href="/notifications"
            className={linkClass(pathname === "/notifications")}
          >
            <Bell
              className={iconClass(pathname === "/notifications")}
              {...activeIconProps(pathname === "/notifications", true)}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-blue-500 px-1.5 py-0.5 text-center text-[10px] leading-none font-bold text-white">
                {badgeText}
              </span>
            )}
          </Link>
          <Link href="/chat" className={linkClass(pathname === "/chat")}>
            <Mail
              className={iconClass(pathname === "/chat")}
              {...activeIconProps(pathname === "/chat", true)}
            />
          </Link>
        </>
      )}
    </div>
  );
}
