// app/register/lab/page.tsx — lab facility self-registration.
// Collects facility info (name, CLIA, address, contact) + the first lab user's
// credentials. Lands in the admin's pending queue; an admin verifies the CLIA
// and facility details before approving. The lab user must also verify their
// email (hard gate) before they can sign in.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerLab, ApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterLabPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    lab_name: "", clia_number: "", address: "", phone: "", lab_email: "", website: "",
    user_name: "", user_email: "", password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function onSubmit() {
    setError(null);
    const required = ["lab_name", "clia_number", "address", "lab_email", "user_name", "user_email", "password"] as const;
    for (const k of required) {
      if (!form[k].trim()) { setError("Please fill in all required fields."); return; }
    }
    if (form.clia_number.trim().length < 10) { setError("CLIA number must be at least 10 characters."); return; }
    if (form.address.trim().length < 10) { setError("Please enter a full facility address."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setBusy(true);
    try {
      await registerLab({
        lab_name: form.lab_name.trim(),
        clia_number: form.clia_number.trim(),
        address: form.address.trim(),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        lab_email: form.lab_email.trim(),
        ...(form.website.trim() ? { website: form.website.trim() } : {}),
        user_name: form.user_name.trim(),
        user_email: form.user_email.trim(),
        password: form.password,
      });
      setDone(true);
    } catch (e) {
      if (e instanceof ApiError) {
        const d = e.detail as unknown;
        if (Array.isArray(d) && d[0] && typeof d[0] === "object" && "msg" in d[0]) {
          setError(String((d[0] as { msg: string }).msg));
        } else {
          setError(e.message);
        }
      } else {
        setError(e instanceof Error ? e.message : "Lab registration failed");
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Registration received</CardTitle>
            <CardDescription>
              We sent a verification link to <span className="font-medium text-foreground">{form.user_email.trim()}</span>.
              Verify your email, then an administrator will review your facility&apos;s CLIA number and
              details before activating the account. You&apos;ll be able to sign in once both steps are complete.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")} className="w-full">Go to sign in</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg my-8">
        <CardHeader>
          <CardTitle className="text-2xl">Register a lab facility</CardTitle>
          <CardDescription>
            Labs are reviewed by an administrator before activation. Provide your facility
            details and the first lab user&apos;s credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <p className="text-sm font-medium">Facility</p>
          <div className="space-y-2">
            <Label htmlFor="lab_name">Lab name</Label>
            <Input id="lab_name" value={form.lab_name} onChange={(e) => set("lab_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="clia">CLIA number</Label>
              <Input id="clia" value={form.clia_number} onChange={(e) => set("clia_number", e.target.value)} placeholder="10–20 chars" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Full facility address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lab_email">Lab email</Label>
              <Input id="lab_email" type="email" value={form.lab_email} onChange={(e) => set("lab_email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="website" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <p className="text-sm font-medium">First lab user</p>
            <div className="space-y-2">
              <Label htmlFor="user_name">Full name</Label>
              <Input id="user_name" value={form.user_name} onChange={(e) => set("user_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user_email">Email</Label>
              <Input id="user_email" type="email" value={form.user_email} onChange={(e) => set("user_email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
          </div>

          <Button onClick={onSubmit} disabled={busy} className="w-full">
            {busy ? "Submitting…" : "Register lab"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Not a lab? <Link href="/register" className="text-primary hover:underline">Patient or caregiver signup</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
