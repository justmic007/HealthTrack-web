// app/register/page.tsx — patient / caregiver self-signup.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerPatient, registerCaregiver, ApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "patient" | "caregiver";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("patient");
  const [form, setForm] = useState({
    email: "", password: "", full_name: "", phone_number: "",
    license_number: "", license_type: "", license_state: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function onSubmit() {
    setError(null);
    if (!form.email || !form.password || !form.full_name) {
      setError("Email, password, and full name are required."); return;
    }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (role === "caregiver" && (!form.license_number || !form.license_type || !form.license_state)) {
      setError("Caregivers must provide license number, type, and state."); return;
    }
    setBusy(true);
    try {
      const base = {
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        ...(form.phone_number.trim() ? { phone_number: form.phone_number.trim() } : {}),
      };
      if (role === "patient") {
        await registerPatient(base);
      } else {
        await registerCaregiver({
          ...base,
          license_number: form.license_number.trim(),
          license_type: form.license_type.trim(),
          license_state: form.license_state.trim().toUpperCase(),
        });
      }
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
        setError(e instanceof Error ? e.message : "Registration failed");
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center p-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Account created</CardTitle>
            <CardDescription>
              {role === "caregiver"
                ? "Your caregiver account was created. A verification email has been sent, and your professional license will be reviewed by an administrator before full access."
                : "Your account was created. A verification email has been sent. You can sign in now."}
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
    <div className="mx-auto flex min-h-screen max-w-md items-center p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Join HealthTrack as a patient or a caregiver.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* role toggle */}
          <div className="flex gap-2">
            {(["patient", "caregiver"] as Role[]).map((r) => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize ${role === r ? "border-foreground bg-foreground text-background" : "text-muted-foreground"}`}>
                {r}
              </button>
            ))}
          </div>

          {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="phone" value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} placeholder="+234…" />
          </div>

          {role === "caregiver" && (
            <div className="space-y-4 rounded-md border bg-muted/30 p-3">
              <p className="text-sm font-medium">Professional license</p>
              <div className="space-y-2">
                <Label htmlFor="lnum">License number</Label>
                <Input id="lnum" value={form.license_number} onChange={(e) => set("license_number", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ltype">Type</Label>
                  <Input id="ltype" value={form.license_type} onChange={(e) => set("license_type", e.target.value)} placeholder="MD, RN, NP…" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lstate">State</Label>
                  <Input id="lstate" value={form.license_state} onChange={(e) => set("license_state", e.target.value)} placeholder="CA" maxLength={2} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">An administrator verifies caregiver licenses before full access.</p>
            </div>
          )}

          <Button onClick={onSubmit} disabled={busy} className="w-full">
            {busy ? "Creating…" : "Create account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
