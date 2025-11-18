import { create } from "zustand";

interface Message {
  id: number;
  text: string;
  sender: { id: number; name: string | null; email: string };
  createdAt: string;
}

interface MessageStore {
  messages: Message[];
  addMsg: (msg: Message) => void;
  setMsgs: (msgs: Message[]) => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  messages: [],
  addMsg: (msg) => set((s) => ({ messages: [...s.messages, msg].sort((a, b) => a.id - b.id) })),
  setMsgs: (msgs) => set({ messages: (msgs ?? []).sort((a, b) => a.id - b.id) }),
}));
