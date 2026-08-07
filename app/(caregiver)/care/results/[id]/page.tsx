// app/(caregiver)/care/results/[id]/page.tsx — a single shared result.
// Sourced from shared-with-me (share-scoped, D-44): measurements + flags only,
// no advisor, no trends — those stay with the patient.
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { listSharedWithMe, SharedResult, SharedAnalyte } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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

function flagFor(a: SharedAnalyte): string | null {
  if (a.value == null || a.reference_range == null || typeof a.value !== "number") return null;
  const { low, high } = a.reference_range;
  if (high != null && a.value > high) return "high";
  if (low != null && a.value < low) return "low";
  return "normal";
}

const flagStyle: Record<string, string> = {
  high: "text-rose-600",
  low: "text-amber-600",
  normal: "text-emerald-600",
};

export default function CaregiverResultDetail() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<SharedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    listSharedWithMe()
      .then((p) => {
        const found = p.items.find((r) => r.id === id);
        if (found) setResult(found);
        else setNotFound(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load result"));
  }, [id]);

  if (error) return <div className="mx-auto max-w-3xl p-8 text-sm text-destructive">{error}</div>;
  if (notFound) return (
    <div className="mx-auto max-w-3xl p-8">
      <p className="text-sm text-muted-foreground">This result isn&apos;t shared with you (or the share was revoked).</p>
      <Link href="/care" className="mt-3 inline-block text-sm text-blue-600 hover:underline">← Back to shared results</Link>
    </div>
  );
  if (!result) return <div className="mx-auto max-w-3xl p-8 text-muted-foreground">Loading…</div>;

  const analytes = result.raw_data?.analytes ?? [];

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <Link href="/care" className="mb-4 inline-block text-sm text-blue-600 hover:underline">← Shared with me</Link>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{result.title}</h1>
          <p className="text-sm text-muted-foreground">
            {result.patient_name} · {new Date(result.date_taken).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            {result.lab_name && <> · {result.lab_name}</>}
          </p>
        </div>
        <StatusBadge status={result.status} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Measurements</CardTitle>
          <CardDescription>Values and reference ranges as provided by the lab.</CardDescription>
        </CardHeader>
        <CardContent>
          {analytes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No structured measurements on this result.</p>
          ) : (
            <div className="divide-y">
              {analytes.map((a, i) => {
                const flag = flagFor(a);
                return (
                  <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="font-medium">{a.name}</span>
                    <div className="flex items-center gap-3 text-right">
                      <span>
                        {a.value}{a.unit ? ` ${a.unit}` : ""}
                        {a.reference_range && (a.reference_range.low != null || a.reference_range.high != null) && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (ref {a.reference_range.low ?? "–"}–{a.reference_range.high ?? "–"})
                          </span>
                        )}
                      </span>
                      {flag && <span className={`w-12 text-xs font-semibold capitalize ${flagStyle[flag]}`}>{flag}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        You&apos;re viewing this because {result.patient_name ?? "the patient"}{" "}shared it with you. Trends and AI guidance
        remain with the patient and aren&apos;t shown here.
      </p>
    </div>
  );
}
