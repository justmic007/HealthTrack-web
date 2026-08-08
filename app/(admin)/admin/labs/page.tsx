// app/(admin)/admin/labs/page.tsx — pending lab approvals.
"use client";

import { useEffect, useState } from "react";
import { getPendingLabs, updateLabStatus, AdminLab } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminLabs() {
  const [labs, setLabs] = useState<AdminLab[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // lab id being acted on

  function load() {
    getPendingLabs().then(setLabs).catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load pending labs"));
  }
  useEffect(load, []);

  async function act(labId: string, status: "approved" | "rejected") {
    setBusy(labId); setError(null);
    try {
      await updateLabStatus(labId, status);
      setLabs((cur) => (cur ? cur.filter((l) => l.id !== labId) : cur)); // drop from pending list
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  if (error && !labs) return <div className="mx-auto max-w-4xl p-8 text-sm text-destructive">{error}</div>;
  if (!labs) return <div className="mx-auto max-w-4xl p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <h1 className="mb-1 text-2xl font-semibold">Lab approvals</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Labs awaiting review. Approving activates the lab and its first user; rejecting keeps them inactive.
      </p>

      {error && <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {labs.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No labs are awaiting approval.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {labs.map((lab) => (
            <Card key={lab.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{lab.name}</CardTitle>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Pending</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-1 text-muted-foreground sm:grid-cols-2">
                  <div><span className="text-foreground">CLIA:</span> {lab.clia_number}</div>
                  <div><span className="text-foreground">Email:</span> {lab.email}</div>
                  <div><span className="text-foreground">Phone:</span> {lab.phone ?? "—"}</div>
                  <div><span className="text-foreground">Address:</span> {lab.address}</div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => act(lab.id, "approved")} disabled={busy === lab.id}>
                    {busy === lab.id ? "Working…" : "Approve"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => act(lab.id, "rejected")} disabled={busy === lab.id}>
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
