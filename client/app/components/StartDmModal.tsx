"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth";
import * as api from "@/lib/api";

interface User {
  id: number;
  email: string;
  name?: string | null;
}

interface StartDmModalProps {
  open: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

export function StartDmModal({ open, onClose, onSelectUser, }: StartDmModalProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([])
  const currentUserId = useAuthStore(s => s.user?.id) 
  
  useEffect(() => {
    if (!open) 
      return;
    loadUsers();
  }, [open])

  useEffect(() => {
    const handle = setTimeout(() => {
      loadUsers(query.trim());
    }, 300);
    
    return () => clearTimeout(handle);
  }, [query]);
  
  if (!open)
    return null;
  
  async function loadUsers(query = "") {
    const q = query.trim();
    const path = q ? `/users?q=${encodeURIComponent(q)}` : "/users";
    const res = await api.get(path);
    setUsers(res);
  }

  function handleSelect(u: User) {
    onSelectUser(u);
    setQuery("");
    onClose();
  }

  // The list is synchronized from backend
  const filtered = users.filter((u) => u.id !== currentUserId);

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="bg-slate-900 p-5 rounded-2xl border border-slate-700 w-[22rem] shadow-xl"
      >
        <h2 className="text-base font-semibold mb-3">Start a Direct Message</h2>

        <input
          className="w-full bg-slate-800 text-slate-200 p-2 rounded-lg border border-slate-700
                     placeholder:text-slate-500 text-sm"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="mt-3 max-h-64 overflow-y-auto scroll-thin">
          {filtered.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">
              No users found.
            </div>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelect(u)}
                className="w-full flex flex-col items-start px-2.5 py-2 rounded-lg text-sm
                           hover:bg-slate-800 transition"
              >
                <span className="font-medium">
                  {u.name || u.email.split("@")[0]}
                </span>
                <span className="text-[11px] text-slate-500">{u.email}</span>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end mt-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
