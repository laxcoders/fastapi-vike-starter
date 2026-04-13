import { usePageContext } from "vike-react/usePageContext";

/**
 * Vike renders this page for any unhandled client or server error, including
 * 404s, uncaught exceptions in child pages, and guard redirects that throw
 * with an HTTP status.
 *
 * Keep it deliberately tiny and dependency-free — if `+Layout.tsx` itself
 * blows up (e.g., QueryClientProvider mount error), the error page must still
 * render without a QueryClient in scope.
 */
export default function ErrorPage() {
  const pageContext = usePageContext();
  const is404 = pageContext.is404;
  const abortReason = (pageContext as unknown as { abortReason?: unknown }).abortReason;

  const title = is404 ? "Page not found" : "Something went wrong";
  const body = is404
    ? "The page you're looking for doesn't exist."
    : typeof abortReason === "string"
      ? abortReason
      : "An unexpected error occurred. We've been notified and are looking into it.";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      <a
        href="/"
        className="inline-flex cursor-pointer items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        Return home
      </a>
    </main>
  );
}
