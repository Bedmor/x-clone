import Link from "next/link";
import { auth } from "~/server/auth";
import { Home, User, Settings, LogOut, Bell, Mail } from "lucide-react";

export async function Sidebar() {
  const session = await auth();

  return (
    <div className="hidden h-full w-64 flex-col border-r border-white/20 p-4 md:flex">
      <div className="mb-8 text-2xl font-bold">X Clone</div>
      <nav className="flex flex-col gap-4">
        <Link
          href="/"
          className="flex items-center gap-4 rounded-full p-3 text-xl hover:bg-white/10"
        >
          <Home className="h-7 w-7" />
          <span>Home</span>
        </Link>
        {session && (
          <>
            <Link
              href="/notifications"
              className="flex items-center gap-4 rounded-full p-3 text-xl hover:bg-white/10"
            >
              <Bell className="h-7 w-7" />
              <span>Notifications</span>
            </Link>
            <Link
              href="/chat"
              className="flex items-center gap-4 rounded-full p-3 text-xl hover:bg-white/10"
            >
              <Mail className="h-7 w-7" />
              <span>Messages</span>
            </Link>
            <Link
              href={`/profile/${session.user.id}`}
              className="flex items-center gap-4 rounded-full p-3 text-xl hover:bg-white/10"
            >
              <User className="h-7 w-7" />
              <span>Profile</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-4 rounded-full p-3 text-xl hover:bg-white/10"
            >
              <Settings className="h-7 w-7" />
              <span>Settings</span>
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
            <span>Sign Out</span>
          </Link>
        ) : (
          <>
            <Link
              href="/signin"
              className="block w-full rounded-full bg-blue-500 py-2 text-center font-bold hover:bg-blue-600"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="block w-full rounded-full border border-white/20 py-2 text-center font-bold hover:bg-white/10"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
