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
  hydrated: boolean;
  setUser: (u: User | null) => void;
  setHydrated: (v: boolean) => void;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      setUser: (u) => set({ user: u }),
      setHydrated: (v) => set({ hydrated: v }),
      updateUser: (data) => set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),
      logout: () => set({ user: null }),
    }),
    {
      name: "chatr-auth",
      // Only persist the user object, NOT the token
      partialize: (state) => ({ user: state.user }),
      // when zustand persist finishes rehydrating, set hydrated = true
      onRehydrateStorage: () => (state) => {
        state?.setHydrated?.(true);
      },
    }
  )
);