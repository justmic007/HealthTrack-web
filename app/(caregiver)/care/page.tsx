// app/(caregiver)/care/page.tsx — results patients have shared with this caregiver.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listSharedWithMe, SharedResult } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusStyle: Record<string, string> = {
  normal: "border-emerald-200 bg-emerald-50 text-emerald-700",
  high: "border-rose-200 bg-rose-50 text-rose-700",
  low: "border-amber-200 bg-amber-50 text-amber-700",
  borderline: "border-amber-200 bg-amber-50 text-amber-700",
  abnormal: "border-rose-200 bg-rose-50 text-rose-700",
};

function StatusBadge({ status }: { status: string }) {
  const cls = statusStyle[status?.toLowerCase()] ?? "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{status ?? "—"}</span>;
}

export default function CaregiverDashboard() {
  const [items, setItems] = useState<SharedResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSharedWithMe()
      .then((p) => setItems(p.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load shared results"));
  }, []);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <h1 className="mb-1 text-2xl font-semibold">Shared with me</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Results patients have shared with you. You can view measurements and flags; trends and AI guidance stay with the patient.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!items && !error && <p className="text-muted-foreground">Loading…</p>}

      {items && items.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          No results have been shared with you yet. When a patient shares a result, it appears here.
        </CardContent></Card>
      )}

      <div className="space-y-3">
        {items?.map((r) => (
          <Link key={r.id} href={`/care/results/${r.id}`} className="block">
            <Card className="transition-colors hover:bg-muted/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{r.title}</CardTitle>
                  <StatusBadge status={r.status} />
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span><span className="text-foreground font-medium">{r.patient_name ?? "Unknown patient"}</span></span>
                  <span>{new Date(r.date_taken).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                  {r.lab_name && <span>{r.lab_name}</span>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
