import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { Sidebar } from "./_components/Sidebar";
import { BottomNav } from "./_components/BottomNav";

export const metadata: Metadata = {
  title: "X Clone",
  description: "A social media clone",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="bg-black text-white">
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
      </body>
    </html>
  );
}
