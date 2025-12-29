import "~/styles/globals.css";

import { type Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "~/server/auth";

import { TRPCReactProvider } from "~/trpc/react";
import { Sidebar } from "./_components/Sidebar";
import { BottomNav } from "./_components/BottomNav";

export const metadata: Metadata = {
  title: "X Clone",
  description: "A social media clone",
  icons: [{ rel: "icon", url: "/favicon.png" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "X Clone",
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

  return (
    <html lang="en" className={`${schibstedGrotesk.variable}`}>
      <body className="bg-black text-white">
        <SessionProvider session={session}>
          <TRPCReactProvider>
            <div className="flex h-screen justify-center">
              <div className="flex w-full max-w-7xl">
                <Sidebar />
                <main className="flex-1 border-r border-white/20 pb-16 md:pb-0">
                  {children}
                </main>
              </div>
              <BottomNav />
            </div>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
