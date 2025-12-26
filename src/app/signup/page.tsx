"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const register = api.user.register.useMutation({
    onSuccess: () => {
      alert("Account created! Please sign in.");
      router.push("/signin");
    },
    onError: (e) => {
      alert(e.message);
    },
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Create an account</h1>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-500">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-white/20 bg-black p-2 focus:border-blue-500 focus:outline-none"
              placeholder="Enter your name"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-500">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded border border-white/20 bg-black p-2 focus:border-blue-500 focus:outline-none"
              placeholder="Enter your username"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-500">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border border-white/20 bg-black p-2 focus:border-blue-500 focus:outline-none"
              placeholder="Enter your email"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-500">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded border border-white/20 bg-black p-2 focus:border-blue-500 focus:outline-none"
              placeholder="Enter your password"
            />
          </div>
          <button
            onClick={() => register.mutate({ name, email, username, password })}
            disabled={
              register.isPending || !name || !email || !username || !password
            }
            className="w-full rounded-full bg-blue-500 py-3 font-bold text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {register.isPending ? "Creating account..." : "Sign Up"}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-black px-2 text-gray-500">
                Or sign up with
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => signIn("discord", { callbackUrl: "/" })}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-black py-3 font-bold text-white hover:bg-white/10"
            >
              Sign up with Discord
            </button>
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-black py-3 font-bold text-white hover:bg-white/10"
            >
              Sign up with Google
            </button>
          </div>

          <div className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/signin" className="text-blue-500 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
