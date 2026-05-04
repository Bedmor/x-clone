"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Session } from "next-auth";
import { Settings, Bookmark, Flag, User, X, Search, Menu } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { useState, useRef, useEffect } from "react";
import { Logo } from "./Logo";

export function MobileNav({
  session,
  isAdmin,
}: {
  session: Session | null;
  isAdmin: boolean;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [query, setQuery] = useState("");
  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const userImage =
    typeof session?.user.image === "string" ? session.user.image : null;
  const userName =
    typeof session?.user.name === "string" ? session.user.name : null;
  const userId = typeof session?.user.id === "string" ? session.user.id : "";
  const isHome = pathname === "/";
  const isExplore = pathname === "/explore";
  const isChat = pathname === "/chat";
  const isNotifications = pathname === "/notifications";

  useEffect(() => {
    if (isExplore) {
      setQuery(searchParams.get("q") ?? "");
    }
  }, [isExplore, searchParams]);

  const handleExploreSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams(searchParams.toString());
    const trimmedQuery = query.trim();

    if (trimmedQuery.length > 0) {
      params.set("q", trimmedQuery);
    } else {
      params.delete("q");
    }

    router.replace(
      `/explore${params.toString() ? `?${params.toString()}` : ""}`,
    );
  };

  const title = isChat
    ? "Sohbet"
    : isNotifications
      ? "Bildirimler"
      : pathname.startsWith("/post/")
        ? "Gönderi"
        : pathname.startsWith("/profile/")
          ? "Profil"
          : pathname.startsWith("/hashtag/")
            ? `#${decodeURIComponent(pathname.split("/")[2] ?? "")}`
            : pathname === "/bookmarks"
              ? "Yer İşaretleri"
              : pathname === "/settings"
                ? "Ayarlar"
                : pathname === "/explore"
                  ? "Explore"
                  : "";

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchStart(e.touches[0]?.clientX ?? 0);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const touchEnd = e.changedTouches[0]?.clientX ?? 0;
    const diff = touchEnd - touchStart;

    // Swipe from left edge to right > 100px opens drawer
    if (touchStart < 50 && diff > 100) {
      setIsDrawerOpen(true);
    }
    // Swipe from right to left > 100px closes drawer
    if (diff < -100) {
      setIsDrawerOpen(false);
    }
  };

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-white/15 bg-black/95 px-3 py-2 backdrop-blur md:hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
            aria-label="Open menu"
          >
            {session ? (
              <UserAvatar
                src={userImage}
                alt={userName}
                fallback={userName ?? userId}
                className="h-8 w-8"
              />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {isHome ? (
            <div className="flex flex-1 items-center justify-center">
              <Logo className="h-7 w-7 text-white" />
            </div>
          ) : isExplore ? (
            <form
              onSubmit={handleExploreSubmit}
              className="flex flex-1 items-center gap-2"
            >
              <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ara"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500"
                />
              </div>
            </form>
          ) : (
            <div className="flex flex-1 items-center justify-center text-base font-semibold">
              {title}
            </div>
          )}
        </div>
      </header>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 left-0 z-50 h-screen w-64 transform bg-black transition-transform duration-300 ease-in-out md:hidden ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex h-full flex-col border-r border-white/20">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-white/20 p-4">
            <h2 className="text-lg font-bold">Menu</h2>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="rounded-full p-1 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer Content */}
          {session ? (
            <nav className="flex flex-col gap-2 p-4">
              <Link
                href={`/profile/${userId}`}
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 rounded-lg p-3 hover:bg-white/10"
              >
                <User className="h-5 w-5" />
                <span>Profil</span>
              </Link>
              <Link
                href="/bookmarks"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 rounded-lg p-3 hover:bg-white/10"
              >
                <Bookmark className="h-5 w-5" />
                <span>Yer İşaretleri</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 rounded-lg p-3 hover:bg-white/10"
              >
                <Settings className="h-5 w-5" />
                <span>Ayarlar</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin/reports"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-white/10"
                >
                  <Flag className="h-5 w-5" />
                  <span>Raporlar</span>
                </Link>
              )}
            </nav>
          ) : (
            <div className="flex flex-col gap-2 p-4">
              <Link
                href="/signin"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center justify-center rounded-lg bg-blue-500 p-3 font-bold hover:bg-blue-600"
              >
                Giriş Yap
              </Link>
              <Link
                href="/signup"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center justify-center rounded-lg border border-white/20 p-3 font-bold hover:bg-white/10"
              >
                Kayıt Ol
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
