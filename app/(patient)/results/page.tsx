// app/results/page.tsx — patient's list of test results.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listResults, TestResult } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        normal: "bg-emerald-100 text-emerald-800 border-emerald-200",
        abnormal: "bg-red-100 text-red-800 border-red-200",
        borderline: "bg-amber-100 text-amber-800 border-amber-200",
    };
    const cls = styles[status] ?? "bg-slate-100 text-slate-700 border-slate-200";
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
            {status}
        </span>
    );
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export default function ResultsPage() {
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();
    const [results, setResults] = useState<TestResult[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    // redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;
        listResults()
            .then((page) => setResults(page.items))
            .catch((e) => setError(e instanceof Error ? e.message : "Failed to load results"));
    }, [user]);

    if (authLoading || !user) {
        return <div className="p-8 text-muted-foreground">Loading…</div>;
    }

    return (
        <div className="mx-auto max-w-3xl p-4 sm:p-8">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Your results</h1>
                    <p className="text-sm text-muted-foreground">
                        {user.full_name ?? user.email}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={logout}>
                    Sign out
                </Button>
            </header>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {!results && !error && (
                <p className="text-muted-foreground">Loading results…</p>
            )}

            {results && results.length === 0 && (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        No results yet.
                    </CardContent>
                </Card>
            )}

            <div className="space-y-3">
                {results?.map((r) => (
                    <Link key={r.id} href={`/results/${r.id}`} className="block">
                        <Card className="transition-colors hover:bg-muted/50">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-base">{r.title}</CardTitle>
                                <StatusBadge status={r.status} />
                            </CardHeader>
                            <CardContent className="pb-4">
                                <CardDescription>
                                    {formatDate(r.date_taken)} · {r.lab_name ?? "—"}
                                </CardDescription>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
