"use client";

import { useState } from "react";
import * as api from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit() {
    const res = await api.post("/auth/login", { email, password });

    if (res.token) {
      setToken(res.token);
      setUser(res.user);
      router.push("/");
    } else {
      alert("Invalid credentials");
    }
  }

  return (
    <main className="p-6 flex flex-col gap-4 max-w-sm mx-auto">
      <h1 className="text-2xl font-bold">Login</h1>

      <input
        className="border p-2"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="border p-2"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={submit}
        className="bg-blue-600 text-white p-2 rounded"
      >
        Login
      </button>

      <button
        onClick={() => router.push("/signup")}
        className="text-blue-600 underline"
      >
        Create an account
      </button>
    </main>
  );
}
