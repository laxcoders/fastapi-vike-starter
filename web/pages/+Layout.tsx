import "./tailwind.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { initSentry } from "@/lib/sentry";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  // Fire-and-forget on mount. `initSentry` is a no-op without VITE_SENTRY_DSN,
  // so local dev and tests pay no cost.
  useEffect(() => {
    void initSentry();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
