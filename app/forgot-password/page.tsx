// app/forgot-password/page.tsx — request a password-reset link.
"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true); // always succeeds (anti-enumeration)
    } catch {
      setSent(true); // show the same message regardless
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>Enter your email and we’ll send a reset link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <>
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                If that email is registered, a reset link has been sent. Check your inbox.
              </p>
              <p className="text-center text-sm">
                <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
              </p>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button onClick={onSubmit} disabled={busy || !email} className="w-full">
                {busy ? "Sending…" : "Send reset link"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Remembered it? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
