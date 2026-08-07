// app/(patient)/sharing/page.tsx — share results with caregivers; list + revoke.
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  listMyShares, createShare, revokeShare, listResults,
  Share, TestResult,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export default function SharingPage() {
  const [shares, setShares] = useState<Share[] | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // share form
  const [resultId, setResultId] = useState("");
  const [email, setEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([listMyShares(), listResults(100, 0)]);
      setShares(s);
      setResults(r.items);
      if (!resultId && r.items.length) setResultId(r.items[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sharing");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleShare() {
    setFormError(null);
    setNotice(null);
    if (!resultId || !email.trim()) {
      setFormError("Pick a result and enter the caregiver's email.");
      return;
    }
    setSharing(true);
    try {
      await createShare({ test_result_id: resultId, caregiver_email: email.trim() });
      setEmail("");
      setNotice("Shared. The caregiver can now view this result.");
      setTimeout(() => setNotice(null), 3500);
      const s = await listMyShares();
      setShares(s);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not share (is the email a registered caregiver?)");
    } finally {
      setSharing(false);
    }
  }

  async function handleRevoke(id: string) {
    setBusy(id);
    try {
      await revokeShare(id);
      setShares((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revoke");
    } finally {
      setBusy(null);
    }
  }

  const activeShares = shares?.filter((s) => s.is_active) ?? [];

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <h1 className="mb-1 text-2xl font-semibold">Sharing</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Share a specific result with a caregiver. They see only what you share — not your full history or guidance.
      </p>

      {/* Share form */}
      <Card className="mb-6">
        <CardHeader className="pb-2"><CardTitle className="text-base">Share a result</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-result">Result</Label>
              <select id="s-result" value={resultId} onChange={(e) => setResultId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                {results.length === 0 && <option value="">No results</option>}
                {results.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} — {fmtDate(r.date_taken)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-email">Caregiver email</Label>
              <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="caregiver@example.com" />
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          {notice && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
          <Button onClick={handleShare} disabled={sharing || results.length === 0}>
            {sharing ? "Sharing…" : "Share result"}
          </Button>
        </CardContent>
      </Card>

      {/* Active shares */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Shared with ({activeShares.length})
      </h2>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {!shares && !error && <p className="text-muted-foreground">Loading…</p>}
      {shares && activeShares.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          You haven&apos;t shared any results yet.
        </CardContent></Card>
      )}

      <div className="space-y-3">
        {activeShares.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.test_result_title}</span>
                  <span className="text-sm text-muted-foreground">shared with</span>
                  <span className="font-medium">{s.caregiver_name}</span>
                  {s.caregiver_license_type && (
                    <span className="rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {s.caregiver_license_type}
                    </span>
                  )}
                  {s.caregiver_license_verified && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Shared {fmtDate(s.date_shared)}</p>
              </div>
              <Button variant="ghost" size="sm" disabled={busy === s.id}
                onClick={() => handleRevoke(s.id)}
                className="text-destructive hover:text-destructive">Revoke</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
