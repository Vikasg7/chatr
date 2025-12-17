"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, UserPlus, Check } from "lucide-react";
import * as api from "@/lib/api";

interface SearchUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (userId: number) => void;
    currentUserId?: number | null;
    existingFriendIds?: number[];
}

export function SearchUserModal({
    isOpen,
    onClose,
    onSelect,
    currentUserId,
    existingFriendIds = []
}: SearchUserModalProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const users = await api.get(`/users?q=${query}`);
                setResults(users.filter((u: any) => u.id !== currentUserId));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, currentUserId]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
                >
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Find People</h2>
                        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search by name or email..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                            />
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto p-2 scroll-thin">
                        {loading && (
                            <div className="p-8 text-center text-slate-500 text-sm">Searching...</div>
                        )}

                        {!loading && results.length > 0 && results.map((user) => {
                            const isFriend = existingFriendIds.includes(user.id);

                            return (
                                <button
                                    key={user.id}
                                    onClick={() => {
                                        onSelect(user.id);
                                        onClose();
                                    }}
                                    className="w-full p-3 flex items-center gap-3 rounded-xl hover:bg-slate-800 transition-colors group text-left"
                                >
                                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                        {user.name?.[0] || user.email[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate">{user.name || "Anonymous"}</div>
                                        <div className="text-xs text-slate-500 truncate">{user.email}</div>
                                    </div>
                                    {isFriend ? (
                                        <Check className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <UserPlus className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                    )}
                                </button>
                            );
                        })}

                        {!loading && query && results.length === 0 && (
                            <div className="p-8 text-center text-slate-500 text-sm">No users found for "{query}"</div>
                        )}

                        {!query && (
                            <div className="p-8 text-center text-slate-600 text-sm italic">Type to search for users...</div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
