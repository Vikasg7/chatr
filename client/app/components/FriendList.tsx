"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Avatar } from "./Avatar";

interface FriendListProps {
  friends: any[];
  currentFriendId: number | null;
  onSelect: (id: number) => void;
  currentUserId?: number | null;
  onlineUsers?: Set<number>;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  unreadCounts?: Record<number, number>;
}

export function FriendList({
  friends,
  currentFriendId,
  onSelect,
  currentUserId = null,
  onlineUsers = new Set(),
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  unreadCounts = {},
}: FriendListProps) {
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onLoadMore || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (bottomSentinelRef.current) {
      observer.observe(bottomSentinelRef.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loadingMore]);
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex-1 overflow-y-auto scroll-thin" style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-1) * 0.5)', paddingRight: 'calc(var(--space-1) * 0.5)' }}
    >
      {friends.map((f) => {
        const active = currentFriendId === f.id;
        const isSender = f.senderId === currentUserId;
        const friendUser = isSender ? f.receiver : f.sender;

        if (!friendUser) return null; // Safety check

        const isOnline = onlineUsers.has(friendUser.id);
        const isAccepted = f.status === "ACCEPTED";

        return (
          <motion.button
            key={f.id}
            onClick={() => onSelect(f.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className={`relative w-full rounded-token-lg text-sm font-medium
              flex flex-row items-center gap-token-3 px-token-3 text-left transition-colors
              ${active
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--border-subtle)]"
              }
              ${!isAccepted ? "opacity-60" : ""}
            `}
            style={{ paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)' }}
          >
            <div className="shrink-0">
              <Avatar
                src={friendUser.avatarUrl ?? null}
                name={friendUser.name || friendUser.email}
                email={friendUser.email}
                size={36}
                online={isOnline}
              />
            </div>

            <div className="min-w-0 flex-1 text-left">
              <div className={`room-name truncate leading-tight flex items-center gap-2 ${active ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                {friendUser.name || friendUser.email?.split("@")[0] || "Unknown"}
                {!isAccepted && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${active ? 'bg-indigo-500 text-white' : 'bg-[var(--border-subtle)] text-[var(--text-muted)]'}`}>
                    {isSender ? "Pending" : "Request"}
                  </span>
                )}
              </div>
              <div className={`meta-small truncate ${active ? 'text-indigo-100' : 'text-[var(--text-muted)]'}`}>
                {friendUser.email}
              </div>
            </div>

            {unreadCounts[f.id] > 0 && !active && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-black shadow-lg shadow-indigo-500/20"
              >
                {unreadCounts[f.id]}
              </motion.div>
            )}

            {active && (
              <motion.div
                layoutId="activeRoomIndicator"
                className="pointer-events-none absolute inset-0 rounded-xl border border-indigo-400/20"
              />
            )}
          </motion.button>
        );
      })}

      {friends.length === 0 ? (
        loadingMore ? (
          <div className="space-y-3 px-1">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 opacity-50">
                <div className="w-9 h-9 rounded-full bg-[var(--border-subtle)] animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-[var(--border-subtle)] animate-pulse" />
                  <div className="h-2 w-32 rounded bg-[var(--border-subtle)] animate-pulse opacity-50" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[var(--text-muted)] mt-4 px-3 italic">
            No friends yet. Click the + button to find someone!
          </div>
        )
      ) : (
        <div ref={bottomSentinelRef} className="h-10 flex items-center justify-center">
          {loadingMore && (
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}
    </motion.div>
  );
}
