import { useEffect, useState } from "react";

import { APP_LOGO } from "@/lib/app-config";
import { verifyEmail } from "@/services/auth";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Missing verification token");
      return;
    }

    verifyEmail(token)
      .then((data) => {
        setStatus("success");
        setMessage(data.message);
      })
      .catch(() => {
        setStatus("error");
        setMessage("Invalid or expired verification link");
      });
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)] text-white text-sm font-bold">
          {APP_LOGO}
        </div>

        {status === "loading" && <p className="text-sm text-muted-foreground">Verifying your email...</p>}

        {status === "success" && (
          <>
            <h1 className="text-xl font-extrabold text-foreground">Email verified</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <a
              href="/login"
              className="mt-4 inline-block rounded-lg bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] px-6 py-2 text-sm font-bold text-white"
            >
              Sign In
            </a>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-xl font-extrabold text-destructive">Verification failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <a href="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
              Back to login
            </a>
          </>
        )}
      </div>
    </div>
  );
}
