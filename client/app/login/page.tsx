"use client";

import { useState, useEffect } from "react";
import * as api from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";
import toastLib from "@/lib/toast";

export default function LoginPage() {
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) {
      // already signed in, ensure we don't show the login form
      router.replace("/");
    }
  }, [token, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });

        if (res && res.token) {
        setToken(res.token);
        setUser(res.user);
        toastLib.showToast("Signed in", "success");
        // replace history so Back doesn't return to login
        router.replace("/");
      } else {
        toastLib.showToast(res?.error || "Invalid credentials", "error");
      }
    } catch (err: any) {
      toastLib.errorToToast(err, "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-70px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h1 className="text-2xl font-semibold text-slate-100 mb-4">Welcome back</h1>

        <label className="block text-xs text-slate-400 mb-1">Email</label>
        <input
          type="email"
          className="w-full rounded-md bg-slate-800/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 mb-3 outline-none"
          placeholder="you@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="block text-xs text-slate-400 mb-1">Password</label>
        <input
          type="password"
          className="w-full rounded-md bg-slate-800/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 mb-4 outline-none"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={submit}
            disabled={loading || !email.trim() || !password.trim()}
            className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <button
            onClick={() => router.push("/signup")}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            Create account
          </button>
        </div>
      </div>
    </main>
  );
}
