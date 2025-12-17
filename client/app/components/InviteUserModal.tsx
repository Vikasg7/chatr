"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import * as api from "@/lib/api";
import { Avatar } from "./Avatar";
import { useAuthStore } from "@/stores/auth";

interface User {
    id: number;
    email: string;
    name?: string | null;
}

interface InviteUserModalProps {
    open: boolean;
    onClose: () => void;
    onInvite: (email: string) => void;
    excludeIds?: number[];
}

export function InviteUserModal({ open, onClose, onInvite, excludeIds = [] }: InviteUserModalProps) {
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const currentUserId = useAuthStore(s => s.user?.id);

    useEffect(() => {
        if (!open) return;
        loadUsers();
    }, [open]);

    useEffect(() => {
        const handle = setTimeout(() => {
            loadUsers(query.trim());
        }, 300);
        return () => clearTimeout(handle);
    }, [query]);

    async function loadUsers(query = "") {
        const q = query.trim();
        const path = q ? `/users?q=${encodeURIComponent(q)}` : "/users";
        try {
            const res = await api.get(path);
            // Ensure we get an array, just in case
            setUsers(Array.isArray(res) ? res : []);
        } catch (err) {
            console.error("Failed to search users", err);
            setUsers([]);
        }
    }

    function handleSelect(u: User) {
        onInvite(u.email);
        setQuery("");
        onClose();
    }

    // Filter out self and already members
    const filtered = users.filter((u) => u.id !== currentUserId && !excludeIds.includes(u.id));

    if (!open) return null;

    return (
        <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="card w-[24rem] max-h-[80vh] flex flex-col"
            >
                <h2 className="text-xl font-semibold text-white mb-4">Invite User</h2>

                <input
                    className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                    placeholder="Search by name or email to invite..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />

                <div className="flex-1 overflow-y-auto scroll-thin -mx-2 px-2">
                    {filtered.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-8">
                            {query ? "No matching users found." : "Type to search users."}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filtered.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => handleSelect(user)}
                                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
                                >
                                    <Avatar src={null} name={user.name} email={user.email} size={36} />
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-white truncate">
                                            {user.name || user.email.split('@')[0]}
                                        </div>
                                        <div className="text-xs text-slate-400 truncate">
                                            {user.email}
                                        </div>
                                    </div>
                                    <div className="ml-auto text-xs text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                        Invite
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-700/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
