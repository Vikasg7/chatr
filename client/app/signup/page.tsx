"use client";

import { useState } from "react";
import * as api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  async function submit() {
    await api.post("/auth/signup", {
      email,
      password,
      name,
    });

    alert("Signup successful! Please login.");
    router.push("/login");
  }

  return (
    <main className="p-6 flex flex-col gap-4 max-w-sm mx-auto">
      <h1 className="text-2xl font-bold">Sign Up</h1>

      <input
        className="border p-2"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

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
        Sign Up
      </button>

      <button
        onClick={() => router.push("/login")}
        className="text-blue-600 underline"
      >
        Already have an account? Login
      </button>
    </main>
  );
}