// app/(lab)/lab/page.tsx — the lab's uploaded results.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listLabResults, LabResult } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const statusStyle: Record<string, string> = {
  normal: "border-emerald-200 bg-emerald-50 text-emerald-700",
  borderline: "border-amber-200 bg-amber-50 text-amber-700",
  abnormal: "border-rose-200 bg-rose-50 text-rose-700",
};

function StatusBadge({ status }: { status: string }) {
  const cls = statusStyle[status?.toLowerCase()] ?? "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{status ?? "—"}</span>;
}

export default function LabDashboard() {
  const [items, setItems] = useState<LabResult[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listLabResults()
      .then((p) => { setItems(p.items); setTotal(p.total); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load results"));
  }, []);

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lab results</h1>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total} result${total === 1 ? "" : "s"} uploaded by your lab` : "Results uploaded by your lab"}
          </p>
        </div>
        <Link href="/lab/upload"><Button>Upload result</Button></Link>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!items && !error && <p className="text-muted-foreground">Loading…</p>}

      {items && items.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          No results yet. Click “Upload result” to add one.
        </CardContent></Card>
      )}

      <div className="space-y-3">
        {items?.map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{r.title}</CardTitle>
                <StatusBadge status={r.status} />
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-foreground font-medium">{r.patient_name ?? r.patient_email ?? "Unknown patient"}</span>
                <span>{new Date(r.date_taken).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                {r.file_url && <span className="text-blue-600">has file</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
