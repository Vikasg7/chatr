import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  setUser: (u: User | null, token?: string) => void;
  setHydrated: (v: boolean) => void;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hydrated: false,
      setUser: (u, t) => set((state) => ({ user: u, token: t ?? state.token })),
      setHydrated: (v) => set({ hydrated: v }),
      updateUser: (data) => set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: "chatr-auth",
      // Persist user and token
      partialize: (state) => ({ user: state.user, token: state.token }),
      // when zustand persist finishes rehydrating, set hydrated = true
      onRehydrateStorage: () => (state) => {
        state?.setHydrated?.(true);
      },
    }
  )
);