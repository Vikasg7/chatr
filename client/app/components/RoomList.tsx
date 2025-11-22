"use client";

import { useRoomStore } from "@/stores/room";
import { motion } from "framer-motion";

interface RoomListProps {
  onSelect: (id: number) => void;
};

export function RoomList( { onSelect }: RoomListProps) {
  const { rooms, currentRoomId } = useRoomStore();

    return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-1 flex-1 overflow-y-auto pr-1 scroll-thin"
    >
      {rooms.map((r) => {
        const active = currentRoomId === r.id;

        return (
          <motion.button
            key={r.id}
            onClick={() => onSelect(r.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className={`relative w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              active
                ? "bg-indigo-600 text-slate-50 shadow-sm"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {r.name}

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
