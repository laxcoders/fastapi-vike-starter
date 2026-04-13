import { useQuery, useQueryClient } from "@tanstack/react-query";
import { navigate } from "vike/client/router";

import { deleteCookie, getCookie } from "@/lib/cookies";
import { authKeys } from "@/lib/query-keys";
import type { User } from "@/lib/types";
import { getMe } from "@/services/auth";

/**
 * @deprecated Import `authKeys.currentUser()` from `@/lib/query-keys` instead.
 * Retained so tests and older call sites still have a named export.
 */
export const CURRENT_USER_KEY = authKeys.currentUser();

/**
 * Fetch the current user via React Query.
 * Only fires when an access_token cookie is present.
 */
export function useCurrentUser() {
  return useQuery<User>({
    queryKey: authKeys.currentUser(),
    queryFn: getMe,
    enabled: typeof window !== "undefined" && !!getCookie("access_token"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Returns a logout function that clears cookies, wipes the query cache,
 * and redirects to /login.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  return () => {
    deleteCookie("access_token");
    deleteCookie("refresh_token");
    queryClient.clear();
    navigate("/login");
  };
}
