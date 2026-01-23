"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "1rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ marginBottom: "1rem" }}>Something went wrong!</h1>
          <p style={{ marginBottom: "1.5rem", color: "#666" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
