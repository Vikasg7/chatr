"use client";

import { motion } from "framer-motion";
import { Avatar } from "./Avatar";

interface FriendListProps {
  friends: any[];
  currentFriendId: number | null;
  onSelect: (id: number) => void;
  currentUserId?: number | null;
  onlineUsers?: Set<number>;
}

export function FriendList({
  friends,
  currentFriendId,
  onSelect,
  currentUserId = null,
  onlineUsers = new Set(),
}: FriendListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-1 flex-1 overflow-y-auto pr-1 scroll-thin"
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
            className={`relative w-full rounded-xl text-sm font-medium
              flex flex-row items-center gap-3 px-3 py-2 text-left transition-colors
              ${active
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--border-subtle)]"
              }
              ${!isAccepted ? "opacity-60" : ""}
            `}
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

            {active && (
              <motion.div
                layoutId="activeRoomIndicator"
                className="pointer-events-none absolute inset-0 rounded-xl border border-indigo-400/20"
              />
            )}
          </motion.button>
        );
      })}

      {friends.length === 0 && (
        <div className="text-xs text-[var(--text-muted)] mt-4 px-3 italic">
          No friends yet. Click the + button to find someone!
        </div>
      )}
    </motion.div>
  );
}
