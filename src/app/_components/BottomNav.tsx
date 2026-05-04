"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Session } from "next-auth";
import { Bell, Mail, Search, Home } from "lucide-react";
import { usePathname } from "next/navigation";
import { api } from "~/trpc/react";

export function BottomNav({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);
  const { data: notifications = [] } = api.notification.getAll.useQuery(
    undefined,
    { enabled: Boolean(session) },
  );

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (tickingRef.current) {
        return;
      }

      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        const previousScrollY = lastScrollYRef.current;
        const delta = currentScrollY - previousScrollY;

        if (currentScrollY <= 12) {
          setIsVisible(true);
        } else if (delta > 8) {
          setIsVisible(false);
        } else if (delta < -8) {
          setIsVisible(true);
        }

        lastScrollYRef.current = currentScrollY;
        tickingRef.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    setIsVisible(true);
    lastScrollYRef.current = window.scrollY;
  }, [pathname]);

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
    <div
      className={`fixed right-0 bottom-0 left-0 z-50 flex h-[calc(4rem+env(safe-area-inset-bottom))] w-full items-start justify-around border-t border-white/20 bg-black pt-2 transition-transform duration-300 ease-out md:hidden ${
        isVisible ? "translate-y-0" : "translate-y-full"
      }`}
    >
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
