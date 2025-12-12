"use client";

import { useState, useEffect } from "react";
import * as api from "@/lib/api";
import { useRouter } from "next/navigation";
import toastLib from "@/lib/toast";

export default function SignupPage() {
  const router = useRouter();
  const token = null as string | null; // default
  try {
    // in case store is available, read token to redirect authenticated users
    // (we import inside to avoid import cycles in server rendering)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useAuthStore } = require("@/stores/auth");
    // useAuthStore is a hook; calling here is not allowed outside components, so instead
    // we'll use a client-side effect below to redirect if token exists.
  } catch (e) {
    // ignore
  }

  useEffect(() => {
    // redirect if already signed in (client-only)
    // read token from store dynamically
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useAuthStore } = require("@/stores/auth");
    try {
      const t = useAuthStore.getState ? useAuthStore.getState().token : null;
      if (t) router.replace("/");
    } catch (e) {
      // no-op
    }
  }, [router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post("/auth/signup", {
        email,
        password,
        name,
      });

      toastLib.showToast(res?.message || "Signup successful! Please login.", "success");
      // replace so Back doesn't return to signup
      router.replace("/login");
    } catch (err: any) {
      toastLib.errorToToast(err, "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-70px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h1 className="text-2xl font-semibold text-slate-100 mb-4">Create an account</h1>

        <label className="block text-xs text-slate-400 mb-1">Full name</label>
        <input
          className="w-full rounded-md bg-slate-800/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 mb-3 outline-none"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

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
          placeholder="Choose a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={submit}
            disabled={loading || !email.trim() || !password.trim() || !name.trim()}
            className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating…" : "Create account"}
          </button>

          <button
            onClick={() => router.push("/login")}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            Sign in
          </button>
        </div>
      </div>
    </main>
  );
}