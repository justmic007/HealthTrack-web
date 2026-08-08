// app/(admin)/admin/users/page.tsx — inactive users + caregiver license verification.
"use client";

import { useEffect, useState } from "react";
import { getInactiveUsers, updateUserStatus, verifyCaregiverLicense, AdminUser } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    getInactiveUsers().then(setUsers).catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load users"));
  }
  useEffect(load, []);

  async function activate(userId: string) {
    setBusy(userId); setError(null);
    try {
      await updateUserStatus(userId, true);
      setUsers((cur) => (cur ? cur.filter((u) => u.id !== userId) : cur));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally { setBusy(null); }
  }

  async function verify(userId: string) {
    setBusy(userId); setError(null);
    try {
      const updated = await verifyCaregiverLicense(userId);
      setUsers((cur) => (cur ? cur.map((u) => (u.id === userId ? updated : u)) : cur));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally { setBusy(null); }
  }

  if (error && !users) return <div className="mx-auto max-w-4xl p-8 text-sm text-destructive">{error}</div>;
  if (!users) return <div className="mx-auto max-w-4xl p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <h1 className="mb-1 text-2xl font-semibold">User management</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Inactive users awaiting activation. Caregivers can also have their professional license verified here.
      </p>

      {error && <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {users.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No inactive users.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
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
                  {u.user_type === "caregiver" && (
                    <>
                      <div><span className="text-foreground">License:</span> {u.license_type ?? "—"} {u.license_number ?? ""}</div>
                      <div><span className="text-foreground">Verified:</span> {u.license_verified ? "Yes" : "No"}</div>
                    </>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  {!u.is_active && (
                    <Button size="sm" onClick={() => activate(u.id)} disabled={busy === u.id}>
                      {busy === u.id ? "Working…" : "Activate"}
                    </Button>
                  )}
                  {u.user_type === "caregiver" && !u.license_verified && (
                    <Button size="sm" variant="outline" onClick={() => verify(u.id)} disabled={busy === u.id}>
                      Verify license
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
