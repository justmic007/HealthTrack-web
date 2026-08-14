// app/verify-email/page.tsx — confirm an email address with a token.
// The token arrives via the emailed link (?token=...). Unlike reset, there's no
// user input — we confirm automatically on load and show the outcome. A manual
// paste + retry is offered if the token is missing or the auto-confirm fails.
"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
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
  const [token, setToken] = useState(params.get("token") ?? "");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const t = params.get("token");
    if (t) confirm(t);
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

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">HealthTrack</CardTitle>
        <CardDescription>Enter the verification token from your email.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="space-y-2">
          <Label htmlFor="token">Verification token</Label>
          <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="From your verification email" />
        </div>
        <Button onClick={() => confirm(token)} className="w-full">Verify email</Button>
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
