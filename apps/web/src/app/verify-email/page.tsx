import { Suspense } from "react";
import { VerifyEmailClient } from "./verify-email-client";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="identity-shell">
          <p>Preparing verification…</p>
        </main>
      }
    >
      <VerifyEmailClient />
    </Suspense>
  );
}
