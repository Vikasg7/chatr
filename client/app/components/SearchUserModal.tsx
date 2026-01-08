"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, UserPlus, Check, Users } from "lucide-react";
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
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const bottomSentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setHasMore(false);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const limit = 20;
                const users = await api.get(`/users?q=${query}&limit=${limit}&offset=0`);
                const filtered = users.filter((u: any) => u.id !== currentUserId);
                setResults(filtered);
                setHasMore(users.length === limit);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, currentUserId]);

    const loadMore = async () => {
        if (loading || loadingMore || !hasMore || !query.trim()) return;

        setLoadingMore(true);
        try {
            const limit = 20;
            const offset = results.length + (results.length > 0 ? 1 : 0); // Approx since we filter ourselves
            const users = await api.get(`/users?q=${query}&limit=${limit}&offset=${results.length}`);
            const filtered = users.filter((u: any) => u.id !== currentUserId);

            setResults(prev => {
                const existingIds = new Set(prev.map(u => u.id));
                const newOnes = filtered.filter((u: any) => !existingIds.has(u.id));
                return [...prev, ...newOnes];
            });
            setHasMore(users.length === limit);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        if (!hasMore || loading || loadingMore || !isOpen) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                loadMore();
            }
        }, { threshold: 0.1 });

        if (bottomSentinelRef.current) {
            observer.observe(bottomSentinelRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, isOpen, results.length]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-token-2 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-md bg-[var(--color-elevated)] border border-[var(--border-subtle)] rounded-token-2xl shadow-2xl overflow-hidden"
                >
                    <div className="p-token-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Find People</h2>
                        <button onClick={onClose} className="p-token-1 hover:bg-[var(--color-card)] rounded-token-md transition-colors" style={{ padding: 'calc(var(--space-1) * 0.5)' }}>
                            <X className="w-5 h-5 text-[var(--text-muted)]" />
                        </button>
                    </div>

                    <div className="p-token-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search by name or email..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-token-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" style={{ paddingTop: 'calc(var(--space-1) * 1.25)', paddingBottom: 'calc(var(--space-1) * 1.25)', paddingLeft: 'calc(var(--space-2) * 2.5)', paddingRight: 'var(--space-2)' }}
                            />
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto p-token-1 scroll-thin">
                        {loading && (
                            <div className="text-center text-[var(--text-muted)] text-sm" style={{ padding: 'var(--space-4)' }}>Searching...</div>
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
                                    className="w-full p-token-3 flex items-center gap-token-3 rounded-token-lg hover:bg-[var(--color-card)] transition-colors group text-left"
                                >
                                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                        {user.name?.[0] || user.email[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-[var(--text-primary)] truncate">{user.name || "Anonymous"}</div>
                                        <div className="text-xs text-[var(--text-muted)] truncate">{user.email}</div>
                                    </div>
                                    {isFriend ? (
                                        <Check className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <UserPlus className="w-5 h-5 text-[var(--text-muted)] group-hover:text-indigo-400 transition-colors" />
                                    )}
                                </button>
                            );
                        })}

                        {results.length > 0 && (
                            <div ref={bottomSentinelRef} className="h-10 flex items-center justify-center">
                                {loadingMore && (
                                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                )}
                            </div>
                        )}

                        {!loading && query && results.length === 0 && (
                            <div className="py-12 flex flex-col items-center justify-center text-center">
                                <Search className="w-10 h-10 text-[var(--text-muted)] opacity-20 mb-3" />
                                <div className="text-[var(--text-muted)] text-sm">No users found for "{query}"</div>
                            </div>
                        )}

                        {!query && !loading && (
                            <div className="py-12 flex flex-col items-center justify-center text-center">
                                <Users className="w-10 h-10 text-indigo-500/20 mb-3" />
                                <div className="text-[var(--text-muted)] text-sm italic font-medium">Type to search for users...</div>
                                <div className="text-[var(--text-muted)] text-[10px] uppercase mt-1 opacity-50 tracking-widest">Connect with your friends</div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
