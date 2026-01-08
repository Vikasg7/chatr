"use client";

import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, LogOut, MessageSquare, ChevronDown, User, Palette } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import * as api from "@/lib/api";

interface GlobalHeaderProps {
  onMenuClick?: () => void;
}

export default function GlobalHeader({ onMenuClick }: GlobalHeaderProps) {
  const { hydrated, user, setUser } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function logout() {
    try {
      await api.post("/auth/logout", {});
    } catch (e) {
      console.error("Logout failed on server", e);
    }
    setUser(null);
    router.push("/");
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/");
    }
  }, [hydrated, user]);

  // Handle click outside to close menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="app-header z-50 pl-1 pr-4 md:pr-5 md:pl-3 relative">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="md:hidden hover:bg-[var(--border-subtle)] transition-colors"
          style={{ padding: 'var(--space-1)', borderRadius: 'var(--radius-md)' }}
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
            <div className="text-xl font-black tracking-tight text-[var(--text-primary)] leading-none">Chatr</div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)] mt-1">
              Connect Securely
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {hydrated && user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex items-center gap-3 p-1.5 pl-3 rounded-2xl border transition-all active:scale-95 ${isMenuOpen
                ? 'bg-[var(--accent)]/10 border-[var(--accent)] shadow-lg shadow-indigo-500/10'
                : 'bg-[var(--color-card)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
                }`}
            >
              <div className="hidden sm:flex flex-col items-end mr-1">
                <span className="text-sm font-black text-[var(--text-primary)] leading-none">
                  {user?.name || user?.email?.split('@')[0]}
                </span>
                <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-wider mt-1 opacity-70">
                  Online
                </span>
              </div>

              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md ring-2 ring-white/10 overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  (user?.name?.[0] || user?.email?.[0] || "?").toUpperCase()
                )}
              </div>

              <ChevronDown
                size={16}
                className={`text-[var(--text-muted)] transition-transform duration-300 ${isMenuOpen ? 'rotate-180 text-indigo-400' : ''}`}
              />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 w-64 bg-[var(--color-elevated)] border border-[var(--border-subtle)] overflow-hidden z-[1000]"
                  style={{ marginTop: 'var(--space-1)', borderRadius: 'var(--radius-xl)', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}
                >
                  <div className="border-b border-[var(--border-subtle)] bg-indigo-500/5 p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-600 flex items-center justify-center text-white font-bold rounded-full shadow-inner ring-2 ring-white/10">
                        {(user?.name?.[0] || user?.email?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-[var(--text-primary)] truncate">
                          {user?.name || "Account"}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-wider mt-0.5 opacity-60">
                          {user?.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 flex flex-col gap-1">
                    <div className="flex items-center justify-between px-2 py-2.5 rounded-xl hover:bg-slate-500/5 text-[var(--text-primary)] transition-all group cursor-default">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-xl bg-[var(--color-card)] border border-[var(--border-subtle)] text-indigo-400 group-hover:scale-110 transition-transform shadow-sm">
                          <Palette size={18} />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-[0.1em]">Toggle Theme</span>
                      </div>
                      <ThemeToggle />
                    </div>

                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-all group"
                    >
                      <div className="p-2 rounded-xl bg-rose-500/5 border border-rose-500/10 group-hover:bg-rose-500 group-hover:text-white group-hover:scale-110 transition-all shadow-sm">
                        <LogOut size={18} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-[0.1em]">Logout Session</span>
                    </button>
                  </div>

                  <div className="px-4 py-3 bg-[var(--color-card)]/50 border-t border-[var(--border-subtle)] flex items-center justify-center">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-50">Chatr Premium v1.0</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest px-3 py-1 bg-[var(--border-subtle)]/30 rounded-full">Not signed in</span>
          </div>
        )}
      </div>
    </header>
  );
}