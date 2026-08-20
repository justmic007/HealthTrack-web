// components/LabOnboarding.tsx — shown to a lab user whose lab isn't approved
// yet. Lets them upload verification documents (CLIA cert, accreditation,
// etc.), see the review status of each, and see any rejection note so they
// know what to fix.
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  uploadLabDocument, getMyLabDocuments, LabDocumentOut, ApiError,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const DOC_TYPES = [
  { value: "clia_certificate", label: "CLIA certificate" },
  { value: "accreditation", label: "Accreditation" },
  { value: "business_license", label: "Business license" },
  { value: "other", label: "Other" },
];

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  pending: {
    title: "Your lab is pending approval",
    body: "An administrator will review your CLIA number, facility details, and any documents you upload below. You'll be able to sign in fully once approved.",
  },
  rejected: {
    title: "Your lab registration was not approved",
    body: "Contact support if you believe this is a mistake, or upload additional documents for re-review.",
  },
  suspended: {
    title: "Your lab account is suspended",
    body: "Contact an administrator for details.",
  },
};

function DocStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    rejected: "border-rose-200 bg-rose-50 text-rose-700",
  };
  const cls = map[status] ?? "border-muted bg-muted text-muted-foreground";
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${cls}`}>{status}</span>;
}

export function LabOnboarding({ status }: { status: string }) {
  const [docs, setDocs] = useState<LabDocumentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState(DOC_TYPES[0].value);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getMyLabDocuments();
      setDocs(list);
    } catch {
      // non-fatal — the upload form still works even if the list fails to load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onUpload() {
    if (!file) { setError("Choose a file to upload."); return; }
    setError(null);
    setUploading(true);
    try {
      await uploadLabDocument(file, docType);
      setFile(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  const copy = STATUS_COPY[status] ?? STATUS_COPY.pending;
  const rejectedCount = docs.filter((d) => d.status === "rejected").length;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.body}</CardDescription>
        </CardHeader>
        {rejectedCount > 0 && (
          <CardContent>
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {rejectedCount === 1
                ? "One of your documents was not approved — see the note below and upload a replacement."
                : `${rejectedCount} of your documents were not approved — see the notes below and upload replacements.`}
            </p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload a verification document</CardTitle>
          <CardDescription>PDF, JPG, or PNG.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="doc-type">Document type</Label>
            <select id="doc-type" value={docType} onChange={(e) => setDocType(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm">
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-file">File</Label>
            <input id="doc-file" type="file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm" />
          </div>
          <Button onClick={onUpload} disabled={uploading || !file} className="w-full sm:w-auto">
            {uploading ? "Uploading…" : "Upload document"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submitted documents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li key={d.id} className="rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{d.file_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{d.document_type.replace(/_/g, " ")}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <DocStatusBadge status={d.status} />
                      {d.uploaded_at && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(d.uploaded_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {d.status === "rejected" && d.review_note && (
                    <p className="mt-1.5 text-xs text-rose-700">Note: {d.review_note}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
