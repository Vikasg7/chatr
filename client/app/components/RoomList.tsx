"use client";

import { motion } from "framer-motion";
import { Avatar } from "./Avatar";

interface RoomListProps {
  rooms: any[];
  currentRoomId: number | null;
  onSelect: (id: number) => void;
  currentUserId?: number | null; // new
}

export function RoomList({
  rooms,
  currentRoomId,
  onSelect,
  currentUserId = null,
}: RoomListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-1 flex-1 overflow-y-auto pr-1 scroll-thin"
    >
      {rooms.map((r) => {
        const active = currentRoomId === r.id;

        // DM rooms are expected to include `members` with member.user
        const isDm = r.type === "DM" || (r.members && r.members.length === 2);

        // If DM, find the other member to show their avatar/name
        const otherMember =
          isDm && r.members
            ? r.members.find((m: any) => m.user?.id !== currentUserId)?.user ?? null
            : null;

        // Room label / fallback
        const label = isDm
          ? otherMember?.name || otherMember?.email?.split?.("@")?.[0] || "Direct"
          : r.name || (typeof r === "string" ? r : "Room");

        return (
          <motion.button
            key={r.id}
            onClick={() => onSelect(r.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className={`relative w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-3 ${
              active
                ? "bg-indigo-600 text-slate-50 shadow-sm"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {/* Left: avatar / room badge */}
            <div className="flex-shrink-0">
              {isDm && otherMember ? (
                <Avatar
                  src={otherMember.avatarUrl ?? null}
                  name={otherMember.name}
                  email={otherMember.email}
                  size={36}
                />
              ) : (
                <div
                  aria-hidden
                  className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-semibold ${
                    active ? "bg-indigo-700 text-slate-100" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {String(label)
                    .trim()
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
            </div>

            {/* Middle: label */}
            <div className="flex-1 text-left">
              <div className="truncate">{label}</div>
              {isDm && otherMember?.email && (
                <div className="text-[11px] text-slate-400 truncate">
                  {otherMember.email}
                </div>
              )}
            </div>

            {/* Animated active indicator */}
            {active && (
              <motion.div
                layoutId="activeRoomIndicator"
                className="absolute inset-0 rounded-xl border border-indigo-400/20"
              />
            )}
          </motion.button>
        );
      })}

      {rooms.length === 0 && (
        <div className="text-xs text-slate-500 mt-4">
          No rooms yet. Create one using the + Add Room button.
        </div>
      )}
    </motion.div>
  );
}
