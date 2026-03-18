import { APP_LOGO, APP_NAME } from "@/lib/app-config";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)] text-lg">
        {APP_LOGO}
      </div>
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">{APP_NAME}</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Internal operations platform. Sign in to get started.
      </p>
      <a
        href="/login"
        className="mt-6 rounded-lg bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-shadow hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]"
      >
        Sign In
      </a>
    </div>
  );
}
