// app/(admin)/admin/page.tsx — admin overview: system analytics.
"use client";

import { useEffect, useState } from "react";
import { getAnalytics, SystemAnalytics } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="capitalize">{label}</span>
        <span className="text-muted-foreground">{count}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div className="h-2 rounded-full bg-foreground/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [a, setA] = useState<SystemAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAnalytics().then(setA).catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load analytics"));
  }, []);

  if (error) return <div className="mx-auto max-w-6xl p-8 text-sm text-destructive">{error}</div>;
  if (!a) return <div className="mx-auto max-w-6xl p-8 text-muted-foreground">Loading…</div>;

  const totalStatus = Object.values(a.test_results_by_status).reduce((s, n) => s + n, 0);
  const months = Object.entries(a.monthly_test_trends).sort(([x], [y]) => x.localeCompare(y));
  const maxMonth = Math.max(1, ...Object.values(a.monthly_test_trends));

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <h1 className="mb-1 text-2xl font-semibold">System overview</h1>
      <p className="mb-6 text-sm text-muted-foreground">Anonymized analytics across the whole platform.</p>

      {/* headline stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total users" value={a.total_users} hint={`${a.active_users} active`} />
        <Stat label="Test results" value={a.total_test_results} hint={`${a.recent_test_uploads} in last 30 days`} />
        <Stat label="Labs" value={a.total_labs} hint={`${a.pending_labs} pending · ${a.active_labs} active`} />
        <Stat label="New sign-ups" value={a.recent_registrations} hint="last 30 days" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* results by status */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Results by status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(a.test_results_by_status).length === 0
              ? <p className="text-sm text-muted-foreground">No results yet.</p>
              : Object.entries(a.test_results_by_status).map(([k, v]) =>
                  <Bar key={k} label={k} count={v} total={totalStatus} />)}
          </CardContent>
        </Card>

        {/* users by type */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Users by type</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(a.users_by_type).map(([k, v]) =>
              <Bar key={k} label={k} count={v} total={a.total_users} />)}
          </CardContent>
        </Card>

        {/* monthly trend */}
        <Card className="sm:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Upload volume (last 6 months)</CardTitle>
            <CardDescription>Number of results uploaded per month across all labs.</CardDescription>
          </CardHeader>
          <CardContent>
            {months.length === 0 ? (
              <p className="text-sm text-muted-foreground">No uploads in the last 6 months.</p>
            ) : (
              <div className="flex items-end gap-3 pt-2" style={{ height: 140 }}>
                {months.map(([m, count]) => (
                  <div key={m} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full items-end justify-center" style={{ height: 100 }}>
                      <div className="w-8 rounded-t bg-foreground/70"
                        style={{ height: `${Math.round((count / maxMonth) * 100)}%` }} title={`${count}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">{m.slice(5)}/{m.slice(2, 4)}</span>
                    <span className="text-xs font-medium">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* results by lab (anonymized) */}
        <Card className="sm:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Results by lab</CardTitle>
            <CardDescription>Lab identities are anonymized (Lab A, Lab B, …).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(a.test_results_by_lab).map(([k, v]) =>
              <Bar key={k} label={k} count={v} total={a.total_test_results} />)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
