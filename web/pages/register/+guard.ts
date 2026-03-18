import { redirect } from "vike/abort";
import type { PageContext } from "vike/types";

import { getCookie } from "@/lib/cookies";

export function guard(pageContext: PageContext): void {
  const cookieStr =
    typeof window === "undefined"
      ? ((pageContext.headers as Record<string, string> | undefined)?.["cookie"] ?? "")
      : document.cookie;

  if (getCookie("access_token", cookieStr) || getCookie("refresh_token", cookieStr)) {
    throw redirect("/app/dashboard");
  }
}
