// app/(lab)/lab/results/[id]/page.tsx — lab result detail + extraction review.
// The lab can view the result, run extraction on an attached file (async),
// review the OCR/text-layer candidate, correct it, and confirm it into raw_data.
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getResult, requestExtraction, getExtraction, confirmExtraction,
  TestResult, ExtractionJob,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const statusStyle: Record<string, string> = {
  normal: "border-emerald-200 bg-emerald-50 text-emerald-700",
  borderline: "border-amber-200 bg-amber-50 text-amber-700",
  abnormal: "border-rose-200 bg-rose-50 text-rose-700",
};
function StatusBadge({ status }: { status: string }) {
  const cls = statusStyle[status?.toLowerCase()] ?? "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{status ?? "—"}</span>;
}

type CandAnalyte = {
  name?: string; result_type?: string;
  value?: number | string | null; unit?: string | null;
  reference_range?: { low: number | null; high: number | null } | null;
};

// Terminal states for the async job.
const DONE = new Set(["extracted", "done", "completed", "succeeded", "success"]);
const FAILED = new Set(["failed", "error"]);

export default function LabResultDetail() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [job, setJob] = useState<ExtractionJob | null>(null);
  const [polling, setPolling] = useState(false);
  const [candidate, setCandidate] = useState<CandAnalyte[]>([]);
  const [testType, setTestType] = useState<string>("");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getResult(id).then(setResult).catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load result"));
  }, [id]);

  // Load candidate analytes into editable state when a job finishes.
  const loadCandidate = useCallback((j: ExtractionJob) => {
    const analytes = (j.candidate_payload?.analytes ?? []) as CandAnalyte[];
    setCandidate(analytes.map((a) => ({ ...a })));
    setTestType(j.candidate_payload?.test_type ?? result?.title ?? "");
  }, [result?.title]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setPolling(false);
  }, []);

  const poll = useCallback(async () => {
    try {
      const j = await getExtraction(id);
      setJob(j);
      if (DONE.has(j.status)) { stopPolling(); loadCandidate(j); }
      else if (FAILED.has(j.status)) { stopPolling(); }
    } catch (e) {
      stopPolling();
      setError(e instanceof Error ? e.message : "Failed to poll extraction");
    }
  }, [id, stopPolling, loadCandidate]);

  useEffect(() => () => stopPolling(), [stopPolling]); // cleanup on unmount

  async function runExtraction() {
    setError(null); setConfirmed(false); setJob(null); setCandidate([]);
    try {
      await requestExtraction(id);
      setPolling(true);
      // poll immediately, then on an interval
      await poll();
      pollRef.current = setInterval(poll, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start extraction");
      setPolling(false);
    }
  }

  function setCand(i: number, patch: Partial<CandAnalyte>) {
    setCandidate((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function removeCand(i: number) { setCandidate((cs) => cs.filter((_, idx) => idx !== i)); }

  async function onConfirm() {
    setConfirming(true); setError(null);
    try {
      const raw_data = {
        test_type: testType || result?.title || "Panel",
        result_type: "numeric",
        analytes: candidate,
      };
      const updated = await confirmExtraction(id, raw_data);
      setResult(updated);
      setConfirmed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm extraction");
    } finally {
      setConfirming(false);
    }
  }

  if (error && !result) return <div className="mx-auto max-w-3xl p-8 text-sm text-destructive">{error}</div>;
  if (!result) return <div className="mx-auto max-w-3xl p-8 text-muted-foreground">Loading…</div>;

  const hasFile = !!result.file_url;
  const jobStatus = job?.status ?? "";
  const jobDone = DONE.has(jobStatus);
  const jobFailed = FAILED.has(jobStatus);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <Link href="/lab" className="mb-4 inline-block text-sm text-primary hover:underline">← Lab results</Link>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{result.title}</h1>
          <p className="text-sm text-muted-foreground">
            {result.patient_name ?? "Unknown patient"} · {new Date(result.date_taken).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <StatusBadge status={result.status} />
      </div>

      {error && <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {/* current raw_data */}
      <Card className="mb-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Current measurements</CardTitle></CardHeader>
        <CardContent>
          {result.raw_data?.analytes?.length ? (
            <div className="divide-y text-sm">
              {(result.raw_data.analytes as CandAnalyte[]).map((a, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="font-medium">{a.name}</span>
                  <span>{String(a.value)}{a.unit ? ` ${a.unit}` : ""}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No structured measurements on this result yet.</p>}
        </CardContent>
      </Card>

      {/* extraction */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Extract from file</CardTitle>
          <CardDescription>
            {hasFile
              ? "Read measurements from the attached file. Nothing is saved until you review and confirm."
              : "No file is attached to this result. Extraction needs an uploaded PDF or image."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button onClick={runExtraction} disabled={!hasFile || polling}>
              {polling ? "Extracting…" : job ? "Re-run extraction" : "Run extraction"}
            </Button>
            {polling && <span className="text-xs text-muted-foreground">Reading the file… (status: {jobStatus || "queued"})</span>}
            {jobFailed && <span className="text-xs text-destructive">Extraction failed{job?.error ? `: ${job.error}` : ""}.</span>}
          </div>

          {confirmed && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Confirmed — the extracted measurements are now this result’s data.
            </p>
          )}

          {jobDone && !confirmed && (
            <>
              {/* extracted text (what OCR / text-layer read) */}
              {job?.extracted_text && (
                <details className="rounded-md border bg-muted/30 p-3 text-sm">
                  <summary className="cursor-pointer text-muted-foreground">Show the text the extractor read</summary>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">{job.extracted_text}</pre>
                </details>
              )}

              {/* editable candidate */}
              <div>
                <p className="mb-2 text-sm font-medium">Review the extracted measurements</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Correct anything the extractor got wrong before confirming. Confirming replaces this result’s measurements.
                </p>
                {candidate.length === 0 ? (
                  <p className="text-sm text-muted-foreground">The extractor didn’t find structured measurements. You can still add them on the upload form.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground">
                      <span className="col-span-4">Analyte</span><span className="col-span-2">Value</span>
                      <span className="col-span-2">Unit</span><span className="col-span-2">Type</span><span className="col-span-2" />
                    </div>
                    {candidate.map((a, i) => (
                      <div key={i} className="grid grid-cols-12 items-center gap-2">
                        <Input className="col-span-4" value={a.name ?? ""} onChange={(e) => setCand(i, { name: e.target.value })} />
                        <Input className="col-span-2" value={String(a.value ?? "")} onChange={(e) => {
                          const v = e.target.value;
                          const num = v.trim() !== "" && !isNaN(Number(v));
                          setCand(i, { value: num ? Number(v) : v });
                        }} />
                        <Input className="col-span-2" value={a.unit ?? ""} onChange={(e) => setCand(i, { unit: e.target.value })} />
                        <span className="col-span-2 text-xs text-muted-foreground">{a.result_type ?? "numeric"}</span>
                        <button type="button" onClick={() => removeCand(i)} className="col-span-2 text-xs text-muted-foreground hover:text-destructive">Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                {job?.unmatched_analytes && job.unmatched_analytes.length > 0 && (
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    No sourced reference range for: {job.unmatched_analytes.join(", ")}. These will be stored but can’t be auto-flagged.
                  </p>
                )}

                <div className="mt-4">
                  <Button onClick={onConfirm} disabled={confirming || candidate.length === 0}>
                    {confirming ? "Confirming…" : "Confirm measurements"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
