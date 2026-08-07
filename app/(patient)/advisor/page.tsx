// app/(patient)/advisor/page.tsx — whole-picture advisor across all results.
"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  getRecommendations, acceptSuggestedReminder,
  Recommendation, SuggestedReminder,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SuggestedRow({ s }: { s: SuggestedReminder }) {
  const [open, setOpen] = useState(false);
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function confirm() {
    setErr(null);
    if (!due) { setErr("Pick a date."); return; }
    setBusy(true);
    try {
      await acceptSuggestedReminder({ title: s.title, due_datetime: new Date(due).toISOString() });
      setDone(true);
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not add reminder");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="font-medium">{s.title}</span>
          <p className="text-muted-foreground">{s.reason}</p>
        </div>
        {done ? (
          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Added</span>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
            {open ? "Cancel" : "Add reminder"}
          </Button>
        )}
      </div>
      {open && !done && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
          <div className="space-y-1">
            <Label htmlFor={`due-${s.title}`} className="text-xs">Due date</Label>
            <Input id={`due-${s.title}`} type="datetime-local" value={due}
              onChange={(e) => setDue(e.target.value)} className="h-9" />
          </div>
          <Button size="sm" onClick={confirm} disabled={busy}>{busy ? "Adding…" : "Confirm"}</Button>
          {err && <p className="w-full text-xs text-destructive">{err}</p>}
        </div>
      )}
    </div>
  );
}

export default function AdvisorRecommendationsPage() {
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      setRec(await getRecommendations());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load recommendations");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <h1 className="mb-1 text-2xl font-semibold">Your whole picture</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        AI guidance across all your results together — grounded in cited public health sources. Not medical advice.
      </p>

      {!rec && !loading && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              Generate a holistic view that looks at your results as a whole.
            </p>
            <Button onClick={load}>Generate overview</Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          Synthesizing across your results…
        </CardContent></Card>
      )}

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {rec && (
        <div className="space-y-6">
          {rec.suggested_reminders.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Suggested reminders</CardTitle>
                <CardDescription>Pick a date to add any of these to your reminders.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {rec.suggested_reminders.map((s, i) => <SuggestedRow key={i} s={s} />)}
                <p className="pt-1 text-xs text-muted-foreground">
                  Added reminders appear on your{" "}
                  <Link href="/reminders" className="text-blue-600 hover:underline">Reminders</Link> page.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Overview</CardTitle></CardHeader>
            <CardContent>
              {rec.status === "no_data" || !rec.recommendations ? (
                <p className="text-sm text-muted-foreground">Not enough results yet for a holistic view.</p>
              ) : (
                <div className="prose prose-sm max-w-none prose-headings:mt-4 prose-headings:mb-1 prose-headings:text-base prose-headings:font-semibold prose-p:my-2 prose-p:leading-relaxed prose-li:my-1">
                  <ReactMarkdown>{rec.recommendations}</ReactMarkdown>
                </div>
              )}

              {rec.citations.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sources</p>
                  <ol className="space-y-1 text-sm">
                    {rec.citations.map((c, i) => {
                      const ok = /^https?:\/\//i.test(c.source_url ?? "");
                      return (
                        <li key={i}>
                          <span className="text-muted-foreground">[{i + 1}]</span>{" "}
                          {ok ? (
                            <a href={c.source_url} target="_blank" rel="noopener noreferrer"
                              className="text-blue-600 hover:underline">{c.title}</a>
                          ) : <span>{c.title}</span>}
                          {c.source && c.source !== "unknown" && (
                            <span className="text-muted-foreground"> — {c.source}</span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={load} disabled={loading}>Regenerate</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
