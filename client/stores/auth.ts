import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  name: string | null;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  setToken: (t: string | null) => void;
  setUser: (u: User | null) => void;
  setHydrated: (v: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setToken: (t) => set({ token: t }),
      setUser: (u) => set({ user: u }),
      setHydrated: (v) => set({ hydrated: v }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "chatr-auth",
      // when zustand persist finishes rehydrating, set hydrated = true
      onRehydrateStorage: () => (state) => {
        state?.setHydrated?.(true);
      },
    }
  )
);