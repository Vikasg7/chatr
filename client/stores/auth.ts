import { create } from "zustand";

interface User {
  id: number;
  name: string | null;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (t: string | null) => void;
  setUser: (u: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setToken: (t) => set({ token: t }),
  setUser: (u) => set({ user: u })
}));