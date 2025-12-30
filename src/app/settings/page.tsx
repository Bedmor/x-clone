"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";

export default function SettingsPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const updateUsername = api.user.updateUsername.useMutation({
    onSuccess: () => {
      alert("Username updated!");
      setUsername("");
      router.refresh();
    },
    onError: (e) => {
      alert(e.message);
    },
  });

  const updatePassword = api.user.updatePassword.useMutation({
    onSuccess: () => {
      alert("Password updated!");
      setPassword("");
    },
    onError: (e) => {
      alert(e.message);
    },
  });

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 border-b border-white/20 bg-black/50 p-4 backdrop-blur">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="space-y-8 p-4">
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Change Username</h2>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-500">New Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded border border-white/20 bg-black p-2 focus:border-blue-500 focus:outline-none"
              placeholder="Enter new username"
            />
            <button
              onClick={() => updateUsername.mutate({ username })}
              disabled={updateUsername.isPending || !username}
              className="self-start rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {updateUsername.isPending ? "Updating..." : "Update Username"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Change Password</h2>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-500">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded border border-white/20 bg-black p-2 focus:border-blue-500 focus:outline-none"
              placeholder="Enter new password"
            />
            <button
              onClick={() => updatePassword.mutate({ password })}
              disabled={updatePassword.isPending || !password}
              className="self-start rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {updatePassword.isPending ? "Updating..." : "Update Password"}
            </button>
          </div>
        </div>

        <div className="space-y-4 border-t border-white/20 pt-4">
          <h2 className="text-xl font-bold text-red-500">Danger Zone</h2>
          <Link
            href="/api/auth/signout"
            className="flex w-full items-center justify-center gap-2 rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-600"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
