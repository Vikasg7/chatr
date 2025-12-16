"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";

interface GlobalHeaderProps {
  onMenuClick?: () => void;
}

export default function GlobalHeader({ onMenuClick }: GlobalHeaderProps) {
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
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-1 mr-1 text-slate-400 hover:text-white transition"
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

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