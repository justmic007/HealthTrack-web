// app/(admin)/admin/labs/page.tsx — full lab directory.
// All labs, filterable by status. Actions are contextual to current status:
//   pending  -> Approve / Reject
//   approved -> Suspend
//   suspended/rejected -> Reactivate (approve)
// Deactivate-never-delete: labs are never removed, only status-changed.
// Each card can expand to show the lab's uploaded verification documents
// (CLIA cert, accreditation, etc.) with download links, so approval is an
// informed decision — not just CLIA/address text, but the actual documents.
"use client";

import { useEffect, useState, useCallback } from "react";
import { getAllLabs, updateLabStatus, AdminLab, getLabDocumentsAdmin, openLabDocumentDownload, updateLabDocumentStatus, LabDocumentOut } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STATUSES = ["all", "pending", "approved", "suspended", "rejected"] as const;
type Filter = (typeof STATUSES)[number];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    suspended: "border-rose-200 bg-rose-50 text-rose-700",
    rejected: "border-muted bg-muted text-muted-foreground",
  };
  const cls = map[status] ?? "border-muted bg-muted text-muted-foreground";
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{status}</span>;
}

function DocStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    rejected: "border-rose-200 bg-rose-50 text-rose-700",
  };
  const cls = map[status] ?? "border-muted bg-muted text-muted-foreground";
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${cls}`}>{status}</span>;
}

function LabDocuments({ labId }: { labId: string }) {
  const [docs, setDocs] = useState<LabDocumentOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);
  const [rejectingDoc, setRejectingDoc] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = () => {
    getLabDocumentsAdmin(labId)
      .then(setDocs)
      .catch(() => setError("Could not load documents"));
  };
  useEffect(load, [labId]);

  async function approve(docId: string) {
    setBusyDoc(docId);
    try {
      await updateLabDocumentStatus(labId, docId, "approved");
      load();
    } catch {
      alert("Could not approve document. Try again.");
    } finally {
      setBusyDoc(null);
    }
  }

  async function reject(docId: string) {
    setBusyDoc(docId);
    try {
      await updateLabDocumentStatus(labId, docId, "rejected", note.trim() || undefined);
      setRejectingDoc(null);
      setNote("");
      load();
    } catch {
      alert("Could not reject document. Try again.");
    } finally {
      setBusyDoc(null);
    }
  }

  if (error) return <p className="text-xs text-rose-600">{error}</p>;
  if (docs === null) return <p className="text-xs text-muted-foreground">Loading documents…</p>;
  if (docs.length === 0) return <p className="text-xs text-muted-foreground">No verification documents uploaded yet.</p>;

  return (
    <ul className="space-y-2">
      {docs.map((d) => (
        <li key={d.id} className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{d.file_name}</span>
              <span className="capitalize text-muted-foreground">{d.document_type.replace(/_/g, " ")}</span>
              <DocStatusBadge status={d.status} />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={() => openLabDocumentDownload(labId, d.id).catch(() => alert("Download failed. Try again."))}
                className="font-medium text-primary hover:underline"
              >
                Download
              </button>
              {d.status !== "approved" && (
                <button onClick={() => approve(d.id)} disabled={busyDoc === d.id}
                  className="font-medium text-emerald-700 hover:underline disabled:opacity-50">
                  {busyDoc === d.id ? "…" : "Approve"}
                </button>
              )}
              {d.status !== "rejected" && (
                <button onClick={() => setRejectingDoc(rejectingDoc === d.id ? null : d.id)}
                  className="font-medium text-rose-700 hover:underline">
                  Reject
                </button>
              )}
            </div>
          </div>

          {d.status === "rejected" && d.review_note && (
            <p className="mt-1.5 text-muted-foreground">Note: {d.review_note}</p>
          )}

          {rejectingDoc === d.id && (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for rejection (optional)"
                className="w-full rounded-md border px-2 py-1 text-xs"
              />
              <button onClick={() => reject(d.id)} disabled={busyDoc === d.id}
                className="shrink-0 font-medium text-rose-700 hover:underline disabled:opacity-50">
                {busyDoc === d.id ? "…" : "Confirm"}
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function AdminLabs() {
  const [labs, setLabs] = useState<AdminLab[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    setLabs(null); setError(null);
    getAllLabs(filter === "all" ? undefined : filter)
      .then(setLabs)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load labs"));
  }, [filter]);
  useEffect(load, [load]);

  async function act(labId: string, status: string) {
    setBusy(labId); setError(null);
    try {
      const updated = await updateLabStatus(labId, status);
      setLabs((cur) => (cur ? cur.map((l) => (l.id === labId ? { ...l, ...updated } : l)) : cur));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <h1 className="mb-1 text-2xl font-semibold">Labs</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Every lab on the platform. Approve pending labs, suspend or reactivate active ones.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-md border px-3 py-1.5 text-sm capitalize transition-colors ${
              filter === s ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}>
            {s}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {!labs ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : labs.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No labs match this filter.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {labs.map((lab) => (
            <Card key={lab.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{lab.name}</CardTitle>
                  <StatusBadge status={lab.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-1 text-muted-foreground sm:grid-cols-2">
                  <div><span className="text-foreground">CLIA:</span> {lab.clia_number}</div>
                  <div><span className="text-foreground">Email:</span> {lab.email}</div>
                  <div><span className="text-foreground">Phone:</span> {lab.phone ?? "—"}</div>
                  <div><span className="text-foreground">Address:</span> {lab.address}</div>
                </div>

                <div>
                  <button
                    onClick={() => setExpanded((cur) => (cur === lab.id ? null : lab.id))}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {expanded === lab.id ? "Hide verification documents" : "View verification documents"}
                  </button>
                  {expanded === lab.id && (
                    <div className="mt-2">
                      <LabDocuments labId={lab.id} />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {lab.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => act(lab.id, "approved")} disabled={busy === lab.id}>
                        {busy === lab.id ? "Working…" : "Approve"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => act(lab.id, "rejected")} disabled={busy === lab.id}>
                        Reject
                      </Button>
                    </>
                  )}
                  {lab.status === "approved" && (
                    <Button size="sm" variant="outline" onClick={() => act(lab.id, "suspended")} disabled={busy === lab.id}>
                      {busy === lab.id ? "Working…" : "Suspend"}
                    </Button>
                  )}
                  {(lab.status === "suspended" || lab.status === "rejected") && (
                    <Button size="sm" onClick={() => act(lab.id, "approved")} disabled={busy === lab.id}>
                      {busy === lab.id ? "Working…" : "Reactivate"}
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
