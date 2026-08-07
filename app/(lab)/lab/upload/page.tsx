// app/(lab)/lab/upload/page.tsx — lab uploads a result for a patient.
// Supports structured analytes, an AI-drafted summary (reviewed before save),
// and an optional PDF file.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTestResult, draftSummary } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUSES = ["normal", "borderline", "abnormal"];

type AnalyteRow = { name: string; value: string; unit: string; low: string; high: string };
const emptyRow: AnalyteRow = { name: "", value: "", unit: "", low: "", high: "" };

function buildRawData(testType: string, rows: AnalyteRow[]) {
  const analytes = rows
    .filter((r) => r.name.trim() && r.value.trim())
    .map((r) => {
      const numeric = r.value.trim() !== "" && !isNaN(Number(r.value));
      return {
        name: r.name.trim(),
        result_type: numeric ? "numeric" : "text",
        value: numeric ? Number(r.value) : r.value.trim(),
        unit: r.unit.trim() || null,
        reference_range:
          r.low.trim() || r.high.trim()
            ? { low: r.low.trim() ? Number(r.low) : null, high: r.high.trim() ? Number(r.high) : null }
            : null,
      };
    });
  if (analytes.length === 0) return null;
  return { test_type: testType || "Panel", result_type: "numeric", analytes };
}

export default function LabUploadPage() {
  const router = useRouter();
  const [patientEmail, setPatientEmail] = useState("");
  const [title, setTitle] = useState("");
  const [dateTaken, setDateTaken] = useState("");
  const [status, setStatus] = useState("normal");
  const [summary, setSummary] = useState("");
  const [rows, setRows] = useState<AnalyteRow[]>([{ ...emptyRow }]);
  const [file, setFile] = useState<File | null>(null);

  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function setRow(i: number, patch: Partial<AnalyteRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() { setRows((rs) => [...rs, { ...emptyRow }]); }
  function removeRow(i: number) { setRows((rs) => rs.filter((_, idx) => idx !== i)); }

  async function onDraftSummary() {
    setError(null);
    const raw_data = buildRawData(title, rows);
    if (!patientEmail.trim()) { setError("Enter the patient email first."); return; }
    if (!raw_data) { setError("Add at least one analyte (name + value) to draft a summary."); return; }
    setDrafting(true);
    try {
      const { draft } = await draftSummary({ patient_email: patientEmail.trim(), raw_data });
      setSummary(draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not draft summary");
    } finally {
      setDrafting(false);
    }
  }

  async function onSave() {
    setError(null); setOk(null);
    if (!patientEmail.trim() || !title.trim() || !dateTaken || !summary.trim()) {
      setError("Patient email, title, date, and summary are required.");
      return;
    }
    setSaving(true);
    try {
      const raw_data = buildRawData(title, rows);
      await createTestResult({
        patient_email: patientEmail.trim(),
        title: title.trim(),
        date_taken: new Date(dateTaken).toISOString(),
        status,
        summary_text: summary.trim(),
        raw_data: raw_data ?? undefined,
        file,
      });
      setOk("Result uploaded. The patient has been notified.");
      setTimeout(() => router.push("/lab"), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload result");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <h1 className="mb-1 text-2xl font-semibold">Upload result</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Enter the result for a patient. You can add structured measurements, draft a plain-language summary, and attach a PDF.
      </p>

      {error && <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {ok && <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{ok}</p>}

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Patient email</Label>
              <Input type="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} placeholder="patient@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Test title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HbA1c" />
            </div>
            <div className="space-y-1.5">
              <Label>Date taken</Label>
              <Input type="datetime-local" value={dateTaken} onChange={(e) => setDateTaken(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm capitalize">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Measurements</CardTitle>
            <CardDescription>Structured analytes (name + value required; unit and range optional). The reference range you enter is stored and shown to the patient; clinical flags are computed from the system&apos;s own sourced ranges.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <Input className="col-span-4" placeholder="Analyte" value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} />
                <Input className="col-span-2" placeholder="Value" value={r.value} onChange={(e) => setRow(i, { value: e.target.value })} />
                <Input className="col-span-2" placeholder="Unit" value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} />
                <Input className="col-span-1" placeholder="Low" value={r.low} onChange={(e) => setRow(i, { low: e.target.value })} />
                <Input className="col-span-1" placeholder="High" value={r.high} onChange={(e) => setRow(i, { high: e.target.value })} />
                <button type="button" onClick={() => removeRow(i)} className="col-span-2 text-xs text-muted-foreground hover:text-destructive">Remove</button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add analyte</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Summary</CardTitle>
            <CardDescription>Plain-language summary for the patient. Draft it with AI, then review and edit before saving.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onDraftSummary} disabled={drafting}>
                {drafting ? "Drafting…" : "Draft summary with AI"}
              </Button>
              <span className="text-xs text-muted-foreground">Review and edit before saving — you stay in control.</span>
            </div>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={5}
              placeholder="Summary shown to the patient…"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attachment (optional)</CardTitle>
            <CardDescription>Attach the original PDF. You can later run extraction on it to auto-fill measurements.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && <p className="mt-1 text-xs text-muted-foreground">{file.name}</p>}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={onSave} disabled={saving}>{saving ? "Uploading…" : "Upload result"}</Button>
          <Button variant="outline" onClick={() => router.push("/lab")} disabled={saving}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
