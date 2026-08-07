// app/(patient)/app/page.tsx — patient home dashboard.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listResults, getTrends, TestResult, AnalyteTrend } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        normal: "bg-emerald-100 text-emerald-800 border-emerald-200",
        abnormal: "bg-red-100 text-red-800 border-red-200",
        borderline: "bg-amber-100 text-amber-800 border-amber-200",
    };
    const cls = styles[status] ?? "bg-slate-100 text-slate-700 border-slate-200";
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
            {status}
        </span>
    );
}

export default function PatientDashboard() {
    const { user } = useAuth();
    const [recent, setRecent] = useState<TestResult[] | null>(null);
    const [trends, setTrends] = useState<AnalyteTrend[] | null>(null);

    useEffect(() => {
        listResults(3, 0).then((p) => setRecent(p.items)).catch(() => setRecent([]));
        getTrends().then(setTrends).catch(() => setTrends([]));
    }, []);

    const firstName = user?.full_name?.split(" ")[0] ?? "there";

    return (
        <div className="mx-auto max-w-4xl p-4 sm:p-8">
            <h1 className="mb-1 text-2xl font-semibold">Welcome back, {firstName}</h1>
            <p className="mb-6 text-sm text-muted-foreground">Here&apos;s a snapshot of your health record.</p>

            <div className="grid gap-4 sm:grid-cols-2">
                {/* Recent results */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Recent results</CardTitle>
                            <Link href="/results" className="text-sm text-blue-600 hover:underline">View all</Link>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {!recent && <p className="text-sm text-muted-foreground">Loading…</p>}
                        {recent && recent.length === 0 && <p className="text-sm text-muted-foreground">No results yet.</p>}
                        {recent?.map((r) => (
                            <Link key={r.id} href={`/results/${r.id}`}
                                className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted/50">
                                <span className="font-medium">{r.title}</span>
                                <StatusBadge status={r.status} />
                            </Link>
                        ))}
                    </CardContent>
                </Card>

                {/* Trend snapshot */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Trends</CardTitle>
                            <Link href="/trends" className="text-sm text-blue-600 hover:underline">View all</Link>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {!trends && <p className="text-sm text-muted-foreground">Loading…</p>}
                        {trends && trends.length === 0 && (
                            <p className="text-sm text-muted-foreground">Not enough data for trends yet.</p>
                        )}
                        {trends?.slice(0, 3).map((t) => (
                            <div key={t.name} className="flex items-center justify-between rounded-md border p-2 text-sm">
                                <span className="font-medium">{t.name}</span>
                                <span className="text-muted-foreground">
                                    {t.latest}{t.unit ?? ""}{" "}
                                    <span className={
                                        t.direction === "rising" ? "text-rose-600"
                                            : t.direction === "falling" ? "text-amber-600" : "text-emerald-600"
                                    }>
                                        {t.direction === "rising" ? "↑" : t.direction === "falling" ? "↓" : "→"}
                                    </span>
                                </span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Quick links */}
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Link href="/reminders">
                    <Card className="transition-colors hover:bg-muted/50">
                        <CardHeader className="pb-2"><CardTitle className="text-base">Reminders</CardTitle></CardHeader>
                        <CardContent><CardDescription>Track follow-ups and add them to your calendar.</CardDescription></CardContent>
                    </Card>
                </Link>
                <Link href="/sharing">
                    <Card className="transition-colors hover:bg-muted/50">
                        <CardHeader className="pb-2"><CardTitle className="text-base">Sharing</CardTitle></CardHeader>
                        <CardContent><CardDescription>Share results with a caregiver.</CardDescription></CardContent>
                    </Card>
                </Link>
                <Link href="/profile">
                    <Card className="transition-colors hover:bg-muted/50">
                        <CardHeader className="pb-2"><CardTitle className="text-base">Profile</CardTitle></CardHeader>
                        <CardContent><CardDescription>Keep your health profile up to date.</CardDescription></CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
