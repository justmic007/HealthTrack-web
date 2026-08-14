// app/(admin)/admin/users/page.tsx — admin user management.
// Three parts:
//   1. Caregivers pending verification  -> Verify
//   2. Inactive users (queue)           -> Activate
//   3. Full directory (all users)       -> filter by type/status, Activate/Deactivate
// Deactivate-never-delete: users are never removed, only is_active toggled.
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getPendingCaregivers, verifyCaregiverLicense,
  getAllUsers, updateUserStatus, AdminUser,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TYPES = ["all", "patient", "caregiver", "lab", "admin"] as const;
const STATES = ["all", "active", "inactive"] as const;
type TypeFilter = (typeof TYPES)[number];
type StateFilter = (typeof STATES)[number];

function TypeBadge({ t }: { t: string }) {
  return <span className="rounded-full border px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">{t}</span>;
}

export default function AdminUsers() {
  const [pendingCg, setPendingCg] = useState<AdminUser[] | null>(null);
  const [dir, setDir] = useState<AdminUser[] | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadPending = useCallback(() => {
    getPendingCaregivers().then(setPendingCg)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load pending caregivers"));
  }, []);

  const loadDir = useCallback(() => {
    setDir(null);
    const type = typeFilter === "all" ? undefined : typeFilter;
    const active = stateFilter === "all" ? undefined : stateFilter === "active";
    getAllUsers(type, active).then(setDir)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load users"));
  }, [typeFilter, stateFilter]);

  useEffect(loadPending, [loadPending]);
  useEffect(loadDir, [loadDir]);

  async function verify(userId: string) {
    setBusy(userId); setError(null);
    try {
      await verifyCaregiverLicense(userId);
      setPendingCg((cur) => (cur ? cur.filter((u) => u.id !== userId) : cur));
      loadDir(); // reflect the change in the directory too
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally { setBusy(null); }
  }

  async function setActive(userId: string, isActive: boolean) {
    setBusy(userId); setError(null);
    try {
      const updated = await updateUserStatus(userId, isActive);
      setDir((cur) => (cur ? cur.map((u) => (u.id === userId ? { ...u, ...updated } : u)) : cur));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally { setBusy(null); }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <h1 className="mb-1 text-2xl font-semibold">User management</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Verify caregiver licenses, and manage every account. Users are deactivated, never deleted.
      </p>

      {error && <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {/* 1. Caregivers pending verification */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium">Caregivers pending verification</h2>
        {pendingCg === null ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : pendingCg.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No caregivers awaiting verification.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {pendingCg.map((u) => (
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

      {/* 2. Full directory */}
      <section>
        <h2 className="mb-3 text-lg font-medium">All users</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`rounded-md border px-3 py-1.5 text-sm capitalize transition-colors ${
                typeFilter === t ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}>{t}</button>
          ))}
          <span className="mx-1 self-center text-muted-foreground">·</span>
          {STATES.map((st) => (
            <button key={st} onClick={() => setStateFilter(st)}
              className={`rounded-md border px-3 py-1.5 text-sm capitalize transition-colors ${
                stateFilter === st ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}>{st}</button>
          ))}
        </div>

        {dir === null ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : dir.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No users match these filters.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {dir.map((u) => (
              <Card key={u.id}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{u.full_name}</span>
                      <TypeBadge t={u.user_type} />
                      {!u.is_active && <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs text-rose-700">Inactive</span>}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">{u.email}</div>
                  </div>
                  {u.is_active ? (
                    <Button size="sm" variant="outline" onClick={() => setActive(u.id, false)} disabled={busy === u.id}>
                      {busy === u.id ? "…" : "Deactivate"}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setActive(u.id, true)} disabled={busy === u.id}>
                      {busy === u.id ? "…" : "Activate"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
