"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";

interface GlobalHeaderProps {
  onMenuClick?: () => void;
}

import { Menu, LogOut, MessageSquare } from "lucide-react";

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
    <header className="app-header z-20 border-b border-white/5 backdrop-blur-xl bg-slate-950/50 px-6 h-16 flex items-center justify-between shadow-2xl">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          aria-label="Toggle menu"
          title="Toggle Sidebar"
        >
          <Menu size={24} />
        </button>

        <div className="flex items-center gap-3 group px-1">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300 ring-2 ring-white/10">
            <MessageSquare size={22} fill="white" />
          </div>
          <div className="flex flex-col">
            <div className="text-xl font-black tracking-tight text-white leading-none">Chatr</div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mt-1">
              Connect Securely
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {hydrated && token ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-200">
                {user?.name || user?.email?.split('@')[0]}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {user?.email}
              </span>
            </div>

            <div className="w-[1px] h-8 bg-white/5 hidden sm:block" />

            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white font-bold text-xs uppercase tracking-wider transition-all border border-rose-500/10 hover:border-rose-500/20 active:scale-95"
            >
              <LogOut size={16} />
              <span className="hidden xs:inline">Logout</span>
            </button>
          </div>
        ) : (
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Not signed in</span>
        )}
      </div>
    </header>
  );
}