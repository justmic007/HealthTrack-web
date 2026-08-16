// app/login/page.tsx — login, redirects by role. Handles the verify-before-login
// gate: distinguishes unverified email (offers resend) from pending approval.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, resendVerification, ApiError } from "@/lib/api";
import { useAuth, homeForRole } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";

type GateState = null | "unverified" | "pending";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<GateState>(null);
  const [resent, setResent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  async function handleSubmit() {
    setError(null);
    setGate(null);
    setResent(false);
    setSubmitting(true);
    try {
      await login(email, password);
      const me = await refresh();
      router.push(homeForRole(me?.user_type));
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && err.detail === "email_not_verified") {
        setGate("unverified");
      } else if (err instanceof ApiError && err.status === 403 && err.detail === "account_pending_approval") {
        setGate("pending");
      } else {
        setError(err instanceof Error ? err.message : "Login failed. Check your details.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onResend() {
    setResent(false);
    try {
      await resendVerification(email);
      setResent(true);
    } catch {
      setResent(true); // anti-enumeration: always show the same confirmation
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">HealthTrack</CardTitle>
          <CardDescription>Sign in to your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoComplete="current-password" />
            <p className="text-right text-sm">
              <a href="/forgot-password" className="text-primary hover:underline">Forgot password?</a>
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {gate === "unverified" && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <p>Please verify your email before signing in. Check your inbox for the verification link.</p>
              {resent ? (
                <p className="mt-2 font-medium">If that account needs verification, a new link has been sent.</p>
              ) : (
                <button onClick={onResend} className="mt-2 font-medium text-primary hover:underline">
                  Resend verification email
                </button>
              )}
            </div>
          )}

          {gate === "pending" && (
            <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
              Your account is awaiting administrator approval. You&apos;ll be able to sign in once it&apos;s approved.
            </div>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            No account?{" "}
            <a href="/register" className="text-primary hover:underline">Create one</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
