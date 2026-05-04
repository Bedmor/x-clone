"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { NotificationPreferences } from "./NotificationPreferences";
import { ThemeToggle } from "~/app/_components/ThemeToggle";
import { PrivacySettings } from "./PrivacySettings";

export default function SettingsPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const updateUsername = api.user.updateUsername.useMutation({
    onSuccess: () => {
      alert("Kullanıcı adı güncellendi!");
      setUsername("");
      router.refresh();
    },
    onError: (e) => {
      alert(e.message);
    },
  });

  const updatePassword = api.user.updatePassword.useMutation({
    onSuccess: () => {
      alert("Şifre güncellendi!");
      setPassword("");
    },
    onError: (e) => {
      alert(e.message);
    },
  });

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 hidden border-b border-white/20 bg-black/50 p-4 backdrop-blur md:block">
        <h1 className="text-xl font-bold">Ayarlar</h1>
      </div>

      <div className="space-y-8 p-4">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div>
            <h2 className="text-xl font-bold">Görünüm</h2>
            <p className="text-sm text-gray-400">
              Açık ve koyu mod arasında geçiş yapın.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <NotificationPreferences />
        <PrivacySettings />

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Kullanıcı adını değiştir</h2>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-500">Yeni kullanıcı adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded border border-white/20 bg-black p-2 focus:border-blue-500 focus:outline-none"
              placeholder="Yeni kullanıcı adınızı girin"
            />
            <button
              onClick={() => updateUsername.mutate({ username })}
              disabled={updateUsername.isPending || !username}
              className="self-start rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {updateUsername.isPending
                ? "Güncelleniyor..."
                : "Kullanıcı adını güncelle"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Şifreyi değiştir</h2>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-500">Yeni şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded border border-white/20 bg-black p-2 focus:border-blue-500 focus:outline-none"
              placeholder="Yeni şifrenizi girin"
            />
            <button
              onClick={() => updatePassword.mutate({ password })}
              disabled={updatePassword.isPending || !password}
              className="self-start rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {updatePassword.isPending
                ? "Güncelleniyor..."
                : "Şifreyi güncelle"}
            </button>
          </div>
        </div>

        <div className="space-y-4 border-t border-white/20 pt-4">
          <h2 className="text-xl font-bold text-red-500">Tehlikeli Bölge</h2>
          <Link
            href="/api/auth/signout"
            className="flex w-full items-center justify-center gap-2 rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-600"
          >
            <LogOut className="h-5 w-5" />
            <span>Çıkış Yap</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
