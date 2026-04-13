/**
 * Sentry initialisation for the Vike frontend.
 *
 * Design notes — the painful version of these lessons:
 *
 * 1. **No `replayIntegration`.** Replay registers global pointer-event listeners
 *    that silently swallow clicks on elements it considers "inert" (shadcn
 *    radix dialogs, combobox triggers, custom buttons rendered via portals).
 *    You end up debugging "why doesn't this button work" for an afternoon
 *    before realising Replay is the culprit. If you want session replay,
 *    add it behind a runtime flag after you've shipped and can measure the cost.
 *
 * 2. **`beforeSend` strips `Authorization` headers.** Sentry by default will
 *    attach the full request metadata to breadcrumbs, and Bearer tokens live
 *    in `Authorization`. Those tokens shouldn't end up in the Sentry UI where
 *    anyone with org access can grep them.
 *
 * 3. **`denyUrls` excludes the OAuth callback.** Token strings frequently
 *    appear in query params on the way into the callback route. Even with
 *    `beforeSend` we don't want those URLs captured at all.
 *
 * 4. **Initialisation is async-safe.** `initSentry()` is a no-op without a DSN,
 *    so the app never crashes in local dev or in test runs that don't stub it.
 */

type SentryModule = typeof import("@sentry/react");

let sentryInstance: SentryModule | null = null;

export async function initSentry(): Promise<void> {
  if (typeof window === "undefined") return;

  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  // Load dynamically so builds that don't set a DSN don't pay the bundle cost.
  const Sentry = (await import("@sentry/react")) as SentryModule;

  Sentry.init({
    dsn,
    environment: (import.meta.env.VITE_SENTRY_ENV as string | undefined) ?? "development",
    release: import.meta.env.VITE_RELEASE_SHA as string | undefined,
    tracesSampleRate: 0.1,
    // Deliberately NOT adding Sentry.replayIntegration — see header comment.
    integrations: [],
    denyUrls: [
      // Token-bearing URLs we never want captured.
      /\/auth\/verify-email/,
      /\/auth\/reset-password/,
      /\/auth\/github\/callback/,
    ],
    beforeSend(event) {
      // Strip Authorization from anything attached to the event.
      if (event.request?.headers && typeof event.request.headers === "object") {
        const headers = event.request.headers as Record<string, string>;
        delete headers.Authorization;
        delete headers.authorization;
      }
      // Same for breadcrumbs — axios attaches headers there too.
      event.breadcrumbs = event.breadcrumbs?.map((crumb) => {
        const data = crumb.data;
        if (
          data &&
          typeof data === "object" &&
          "request_headers" in data &&
          typeof (data as { request_headers: unknown }).request_headers === "object"
        ) {
          const headers = (data as { request_headers: Record<string, string> }).request_headers;
          delete headers.Authorization;
          delete headers.authorization;
        }
        return crumb;
      });
      return event;
    },
  });

  sentryInstance = Sentry;
}

/** Current Sentry module handle, or `null` if Sentry wasn't initialised. */
export function getSentry(): SentryModule | null {
  return sentryInstance;
}
