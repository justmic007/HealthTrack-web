// app/verify-email/page.tsx — confirm an email address with a token.
// The token arrives via the emailed link (?token=...). We auto-confirm ONCE on
// load (guarded against React Strict Mode's double-effect, and against the
// single-use token being retried). Manual paste is offered only when there's no
// token in the URL.
"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { confirmEmailVerification, ApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type State = "idle" | "verifying" | "done" | "error";

function VerifyInner() {
  const params = useSearchParams();
  const urlToken = params.get("token") ?? "";
  const [token, setToken] = useState(urlToken);
  const [state, setState] = useState<State>(urlToken ? "verifying" : "idle");
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false); // guard: confirm the URL token at most once

  const confirm = useCallback(async (t: string) => {
    if (!t.trim()) { setError("A verification token is required."); setState("error"); return; }
    setState("verifying"); setError(null);
    try {
      await confirmEmailVerification(t.trim());
      setState("done");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not verify email");
      setState("error");
    }
  }, []);

  // auto-confirm the URL token exactly once (survives Strict Mode double-mount)
  useEffect(() => {
    if (urlToken && !attempted.current) {
      attempted.current = true;
      confirm(urlToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "verifying") {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">HealthTrack</CardTitle>
          <CardDescription>Verifying your email…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (state === "done") {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">HealthTrack</CardTitle>
          <CardDescription>Your email address is now confirmed. Thank you.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full"><Link href="/login">Go to sign in</Link></Button>
        </CardContent>
      </Card>
    );
  }

  // idle (no token in URL) or error — manual paste + retry
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">HealthTrack</CardTitle>
        <CardDescription>
          {urlToken
            ? "We couldn't verify that link. It may have already been used — try signing in."
            : "Enter the verification token from your email."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && !urlToken && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
        {!urlToken && (
          <div className="space-y-2">
            <Label htmlFor="token">Verification token</Label>
            <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="From your verification email" />
            <Button onClick={() => confirm(token)} className="w-full">Verify email</Button>
          </div>
        )}
        <p className="text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <VerifyInner />
      </Suspense>
    </div>
  );
}
