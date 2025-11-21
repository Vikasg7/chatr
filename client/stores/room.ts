import { create } from "zustand";

interface RoomStore {
  rooms: any[];
  currentRoomId: number | null;

  setRooms: (rooms: any[]) => void;
  setCurrentRoom: (id: number) => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  rooms: [],
  currentRoomId: null,
  setRooms: (rooms) => set({ rooms }),
  setCurrentRoom: (id) => set({ currentRoomId: id }),
}));