"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";

export default function GlobalHeader() {
  const { token, hydrated, user, setToken } = useAuthStore();
  const router = useRouter();

  function logout() {
    setToken(null);
    router.push("/");
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/");
    }
  }, [hydrated, token]);

  return (
    <header className="app-header z-20">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-sm font-bold">
          C
        </div>
        <div>
          <div className="text-h6">Chatr</div>
          <div className="text-xs text-slate-400">
            Real-time chat • full-stack playground
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        {hydrated && token ? (
          <>
            <span className="hidden sm:inline text-slate-400">
              {user?.name || user?.email}
            </span>
            <button
              onClick={logout}
              className="btn-ghost"
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