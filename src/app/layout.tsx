import "~/styles/globals.css";

import { type Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "~/server/auth";
import { isAdminSession } from "~/server/auth/admin";

import { TRPCReactProvider } from "~/trpc/react";
import { Sidebar } from "./_components/Sidebar";
import { BottomNav } from "./_components/BottomNav";
import { MobileNav } from "./_components/MobileNav";
import { ThemeInitializer } from "./_components/ThemeToggle";

export const metadata: Metadata = {
  title: "Flowzest",
  description: "A social media clone",
  icons: [{ rel: "icon", url: "/favicon.png" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Flowzest",
  },
};

const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted-grotesk",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const isAdmin = await isAdminSession(session);

  return (
    <html lang="en" className={`${schibstedGrotesk.variable}`}>
      <body className="min-h-[100dvh] overflow-x-hidden bg-black text-white antialiased">
        <ThemeInitializer />
        <SessionProvider session={session}>
          <TRPCReactProvider>
            <div className="flex min-h-[100dvh] justify-center">
              <div className="flex min-h-[100dvh] w-full max-w-7xl">
                <Sidebar session={session} isAdmin={isAdmin} />
                <main className="min-h-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:border-r md:border-white/20 md:pb-0">
                  <MobileNav session={session} isAdmin={isAdmin} />
                  {children}
                </main>
              </div>
              <BottomNav session={session} />
            </div>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
