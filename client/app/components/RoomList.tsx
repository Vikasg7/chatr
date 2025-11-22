"use client";

import { useRoomStore } from "@/stores/room";

interface RoomListProps {
  onSelect: (id: number) => void;
};

export function RoomList( { onSelect }: RoomListProps) {
  const { rooms, currentRoomId } = useRoomStore();

  return (
    <div className="space-y-1 flex-1 overflow-y-auto pr-1 scroll-thin">
      {rooms.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r.id)}
          className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            currentRoomId === r.id
              ? "bg-indigo-600 text-slate-50 shadow-sm"
              : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          {r.name}
        </button>
      ))}

      {rooms.length === 0 && (
        <div className="text-xs text-slate-500 mt-4">
          No rooms yet. Create one via API or auto-create “General”.
        </div>
      )}
    </div>
  );
}
