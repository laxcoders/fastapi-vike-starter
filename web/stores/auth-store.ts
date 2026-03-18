import { create } from "zustand";

import { deleteCookie, getCookie } from "@/lib/cookies";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
}

const getInitialAuth = () => {
  if (typeof window === "undefined") return false;
  return !!getCookie("access_token");
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: getInitialAuth(),
  setUser: (user) => set({ user, isAuthenticated: true }),
  logout: () => {
    if (typeof window !== "undefined") {
      deleteCookie("access_token");
      deleteCookie("refresh_token");
    }
    set({ user: null, isAuthenticated: false });
  },
}));
