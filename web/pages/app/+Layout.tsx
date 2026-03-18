import { useState, useEffect } from "react";
import { navigate } from "vike/client/router";
import { APP_LOGO, APP_NAME } from "@/lib/app-config";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuthStore } from "@/stores/auth-store";
import { getMe } from "@/services/auth";
import { useQuery } from "@tanstack/react-query";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, setUser, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { isError } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const userData = await getMe();
      setUser(userData);
      return userData;
    },
    enabled: isAuthenticated && !user,
    retry: false,
  });

  useEffect(() => {
    if (isError) {
      logout();
      navigate("/login");
    }
  }, [isError, logout]);

  if (isError) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex h-12 shrink-0 items-center border-b border-border px-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
            aria-label="Open sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div className="ml-3 flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)] text-[8px]">
              {APP_LOGO}
            </div>
            <span className="text-xs font-extrabold">{APP_NAME}</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
