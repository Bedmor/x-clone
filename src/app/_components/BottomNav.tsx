import Link from "next/link";
import { auth } from "~/server/auth";
import {
  Home,
  User,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  Bell,
} from "lucide-react";

export async function BottomNav() {
  const session = await auth();

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 flex h-16 w-full items-center justify-around border-t border-white/20 bg-black md:hidden">
      <Link
        href="/"
        className="flex flex-col items-center justify-center rounded-full p-2 hover:bg-white/10"
      >
        <Home className="h-6 w-6" />
      </Link>
      {session && (
        <>
          <Link
            href="/notifications"
            className="flex flex-col items-center justify-center rounded-full p-2 hover:bg-white/10"
          >
            <Bell className="h-6 w-6" />
          </Link>
          <Link
            href={`/profile/${session.user.id}`}
            className="flex flex-col items-center justify-center rounded-full p-2 hover:bg-white/10"
          >
            <User className="h-6 w-6" />
          </Link>
          <Link
            href="/settings"
            className="flex flex-col items-center justify-center rounded-full p-2 hover:bg-white/10"
          >
            <Settings className="h-6 w-6" />
          </Link>
          <Link
            href="/api/auth/signout"
            className="flex flex-col items-center justify-center rounded-full p-2 text-red-500 hover:bg-white/10"
          >
            <LogOut className="h-6 w-6" />
          </Link>
        </>
      )}
      {!session && (
        <>
          <Link
            href="/signin"
            className="flex flex-col items-center justify-center rounded-full p-2 text-blue-500 hover:bg-white/10"
          >
            <LogIn className="h-6 w-6" />
          </Link>
          <Link
            href="/signup"
            className="flex flex-col items-center justify-center rounded-full p-2 hover:bg-white/10"
          >
            <UserPlus className="h-6 w-6" />
          </Link>
        </>
      )}
    </div>
  );
}
