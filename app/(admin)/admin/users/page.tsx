// app/(admin)/admin/users/page.tsx — two admin queues:
//   1. Inactive users        -> Activate
//   2. Caregivers pending     -> Verify license
//      license verification
"use client";

import { useEffect, useState } from "react";
import {
  getInactiveUsers, updateUserStatus, verifyCaregiverLicense,
  getPendingCaregivers, AdminUser,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminUsers() {
  const [inactive, setInactive] = useState<AdminUser[] | null>(null);
  const [pendingCg, setPendingCg] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    getInactiveUsers().then(setInactive).catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load inactive users"));
    getPendingCaregivers().then(setPendingCg).catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load pending caregivers"));
  }
  useEffect(load, []);

  async function activate(userId: string) {
    setBusy(userId); setError(null);
    try {
      await updateUserStatus(userId, true);
      setInactive((cur) => (cur ? cur.filter((u) => u.id !== userId) : cur));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally { setBusy(null); }
  }

  async function verify(userId: string) {
    setBusy(userId); setError(null);
    try {
      await verifyCaregiverLicense(userId);
      // verified -> leaves the pending-verification queue
      setPendingCg((cur) => (cur ? cur.filter((u) => u.id !== userId) : cur));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally { setBusy(null); }
  }

  const loading = inactive === null || pendingCg === null;
  if (error && loading) return <div className="mx-auto max-w-4xl p-8 text-sm text-destructive">{error}</div>;
  if (loading) return <div className="mx-auto max-w-4xl p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <h1 className="mb-1 text-2xl font-semibold">User management</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Activate users awaiting approval, and verify caregivers’ professional licenses.
      </p>

      {error && <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {/* Caregivers pending license verification */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">Caregivers pending verification</h2>
        {pendingCg!.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No caregivers awaiting license verification.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {pendingCg!.map((u) => (
              <Card key={u.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{u.full_name}</CardTitle>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">License unverified</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid gap-1 text-muted-foreground sm:grid-cols-2">
                    <div><span className="text-foreground">Email:</span> {u.email}</div>
                    <div><span className="text-foreground">License:</span> {u.license_type ?? "—"} {u.license_number ?? ""}</div>
                    <div><span className="text-foreground">State:</span> {u.license_state ?? "—"}</div>
                  </div>
                  <Button size="sm" onClick={() => verify(u.id)} disabled={busy === u.id}>
                    {busy === u.id ? "Verifying…" : "Verify license"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Inactive users */}
      <section>
        <h2 className="mb-3 text-lg font-medium">Inactive users</h2>
        {inactive!.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No inactive users.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {inactive!.map((u) => (
              <Card key={u.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{u.full_name}</CardTitle>
                    <span className="rounded-full border px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">{u.user_type}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid gap-1 text-muted-foreground sm:grid-cols-2">
                    <div><span className="text-foreground">Email:</span> {u.email}</div>
                    <div><span className="text-foreground">Active:</span> {u.is_active ? "Yes" : "No"}</div>
                  </div>
                  <Button size="sm" onClick={() => activate(u.id)} disabled={busy === u.id}>
                    {busy === u.id ? "Working…" : "Activate"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
