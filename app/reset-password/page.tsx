// app/reset-password/page.tsx — complete a password reset with a token.
// The token normally arrives via the emailed link (?token=...) and is used
// silently — the user only sees the password field. If someone lands here
// WITHOUT a token in the URL, a manual token field appears as a fallback.
"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { confirmPasswordReset, ApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tokenFromUrl = params.get("token") ?? "";
  const [token, setToken] = useState(tokenFromUrl);
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const hasUrlToken = tokenFromUrl.length > 0;

  async function onSubmit() {
    setError(null);
    if (pw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!token.trim()) { setError("A reset token is required."); return; }
    setBusy(true);
    try {
      await confirmPasswordReset(token.trim(), pw);
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reset password");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">HealthTrack</CardTitle>
          <CardDescription>Your password has been changed. Please sign in again.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/login")} className="w-full">Go to sign in</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">HealthTrack</CardTitle>
        <CardDescription>
          {hasUrlToken ? "Choose a new password." : "Enter your reset token and a new password."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        {!hasUrlToken && (
          <div className="space-y-2">
            <Label htmlFor="token">Reset token</Label>
            <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="From your reset email" />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <Button onClick={onSubmit} disabled={busy} className="w-full">
          {busy ? "Resetting…" : "Reset password"}
        </Button>
        <p className="text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <ResetInner />
      </Suspense>
    </div>
  );
}
