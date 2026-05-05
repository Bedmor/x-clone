"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { NotificationPreferences } from "./NotificationPreferences";
import { ThemeToggle } from "~/app/_components/ThemeToggle";
import { PrivacySettings } from "./PrivacySettings";

export default function SettingsPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
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

  const deleteAccount = api.user.deleteAccount.useMutation({
    onSuccess: async () => {
      alert("Hesabınız kalıcı olarak silindi.");
      await signOut({ callbackUrl: "/signin" });
    },
    onError: (e) => {
      alert(e.message);
    },
  });

  const handleDeleteAccount = () => {
    const firstConfirm = window.confirm(
      "Hesabınızı silmek geri alınamaz. Devam etmek istiyor musunuz?",
    );
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "SON UYARI: Tüm gönderileriniz ve profil verileriniz kalıcı olarak silinecek. Emin misiniz?",
    );
    if (!secondConfirm) return;

    deleteAccount.mutate({
      password: deletePassword || undefined,
      confirmation: deleteConfirmation,
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <div className="sticky top-0 z-10 hidden border-b border-white/20 bg-black/50 p-4 backdrop-blur md:block">
        <h1 className="text-xl font-bold">Ayarlar</h1>
      </div>

      <div className="space-y-6 px-3 pt-3 pb-24 sm:space-y-8 sm:p-4">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:rounded-3xl">
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

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:rounded-3xl">
          <h2 className="text-xl font-bold">Kullanıcı adını değiştir</h2>
          <div className="flex flex-col gap-3">
            <label className="text-sm text-gray-500">Yeni kullanıcı adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 rounded border border-white/20 bg-black px-3 focus:border-blue-500 focus:outline-none"
              placeholder="Yeni kullanıcı adınızı girin"
            />
            <button
              onClick={() => updateUsername.mutate({ username })}
              disabled={updateUsername.isPending || !username}
              className="w-full rounded bg-blue-500 px-4 py-2.5 font-bold text-white hover:bg-blue-600 disabled:opacity-50 sm:w-auto"
            >
              {updateUsername.isPending
                ? "Güncelleniyor..."
                : "Kullanıcı adını güncelle"}
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:rounded-3xl">
          <h2 className="text-xl font-bold">Şifreyi değiştir</h2>
          <div className="flex flex-col gap-3">
            <label className="text-sm text-gray-500">Yeni şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded border border-white/20 bg-black px-3 focus:border-blue-500 focus:outline-none"
              placeholder="Yeni şifrenizi girin"
            />
            <button
              onClick={() => updatePassword.mutate({ password })}
              disabled={updatePassword.isPending || !password}
              className="w-full rounded bg-blue-500 px-4 py-2.5 font-bold text-white hover:bg-blue-600 disabled:opacity-50 sm:w-auto"
            >
              {updatePassword.isPending
                ? "Güncelleniyor..."
                : "Şifreyi güncelle"}
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:rounded-3xl">
          <h2 className="text-xl font-bold text-red-500">Tehlikeli Bölge</h2>

          <div className="space-y-3 rounded-2xl border border-red-400/30 bg-red-950/20 p-4">
            <p className="text-sm text-red-200">
              Hesabı silme işlemi geri alınamaz. Tüm gönderileriniz ve profil
              verileriniz kalıcı olarak kaldırılır.
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-red-100">
                Şifre (Google/Discord ile girişte boş bırakabilirsiniz)
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="h-11 rounded border border-red-300/30 bg-black px-3 focus:border-red-400 focus:outline-none"
                placeholder="Şifrenizi girin"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-red-100">
                Onay için HESABIMI SIL yazın
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="h-11 rounded border border-red-300/30 bg-black px-3 focus:border-red-400 focus:outline-none"
                placeholder="HESABIMI SIL"
              />
            </div>

            <button
              onClick={handleDeleteAccount}
              disabled={
                deleteAccount.isPending ||
                deleteConfirmation.trim() !== "HESABIMI SIL"
              }
              className="w-full rounded bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto"
            >
              {deleteAccount.isPending
                ? "Hesap siliniyor..."
                : "Hesabı kalıcı olarak sil"}
            </button>
          </div>

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
