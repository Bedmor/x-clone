import Link from "next/link";
import type { Session } from "next-auth";
import { Bell, Mail, Search } from "lucide-react";

export function BottomNav({ session }: { session: Session | null }) {
  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 flex h-16 w-full items-center justify-around border-t border-white/20 bg-black md:hidden">
      <Link
        href="/explore"
        className="flex flex-col items-center justify-center rounded-full p-2 hover:bg-white/10"
      >
        <Search className="h-6 w-6" />
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
            href="/chat"
            className="flex flex-col items-center justify-center rounded-full p-2 hover:bg-white/10"
          >
            <Mail className="h-6 w-6" />
          </Link>
        </>
      )}
    </div>
  );
}
