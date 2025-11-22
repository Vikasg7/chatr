"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";

export default function GlobalHeader() {
  const { token, hydrated, user, setToken } = useAuthStore();
  const router = useRouter();

  function logout() {
    setToken(null);
    router.push("/login");
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/login");
    }
  }, [hydrated, token, router]);

  return (
    <header className="flex h-[70px] items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur z-20">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-sm font-bold">
          C
        </div>
        <div>
          <div className="text-lg font-semibold tracking-tight">Chatr</div>
          <div className="text-xs text-slate-500">
            Real-time chat • full-stack playground
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        {hydrated && user ? (
          <>
            <span className="hidden sm:inline text-slate-400">
              {user.name || user.email}
            </span>
            <button
              onClick={logout}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
            >
              Logout
            </button>
          </>
        ) : (
          <span className="text-slate-500">Not signed in</span>
        )}
      </div>
    </header>
  );
}