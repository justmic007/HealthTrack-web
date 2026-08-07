// app/results/[id]/page.tsx — single result detail + AI advisor.
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
    getResult,
    getAdvisorForResult,
    TestResult,
    AdvisorNote,
    Analyte,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
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

function analyteFlag(a: Analyte): string {
    if (a.result_type !== "numeric" || typeof a.value !== "number") return "";
    const r = a.reference_range;
    if (!r) return "";
    if (r.high != null && a.value > r.high) return "High";
    if (r.low != null && a.value < r.low) return "Low";
    return "Normal";
}

const flagStyles: Record<string, string> = {
    High: "text-red-700",
    Low: "text-amber-700",
    Normal: "text-emerald-700",
    "": "text-muted-foreground",
};

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric",
    });
}

export default function ResultDetailPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [result, setResult] = useState<TestResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [advisor, setAdvisor] = useState<AdvisorNote | null>(null);
    const [advisorLoading, setAdvisorLoading] = useState(false);
    const [advisorError, setAdvisorError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user || !id) return;
        getResult(id)
            .then(setResult)
            .catch((e) => setError(e instanceof Error ? e.message : "Failed to load result"));
    }, [user, id]);

    async function loadAdvisor() {
        setAdvisorError(null);
        setAdvisorLoading(true);
        try {
            setAdvisor(await getAdvisorForResult(id));
        } catch (e) {
            setAdvisorError(e instanceof Error ? e.message : "Could not load guidance");
        } finally {
            setAdvisorLoading(false);
        }
    }

    if (authLoading || !user) return <div className="p-8 text-muted-foreground">Loading…</div>;

    return (
        <div className="mx-auto max-w-3xl p-4 sm:p-8">
            <Link href="/results" className="text-sm text-muted-foreground hover:underline">
                ← Back to results
            </Link>

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            {!result && !error && <p className="mt-4 text-muted-foreground">Loading…</p>}

            {result && (
                <>
                    <header className="mb-6 mt-4 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold">{result.title}</h1>
                            <p className="text-sm text-muted-foreground">
                                {new Date(result.date_taken).toLocaleDateString(undefined, {
                                    year: "numeric", month: "long", day: "numeric",
                                })}{" "}
                                · {result.lab_name ?? "—"}
                            </p>
                        </div>
                        <StatusBadge status={result.status} />
                    </header>

                    {/* Analytes */}
                    <Card className="mb-6">
                        <CardHeader><CardTitle className="text-base">Measurements</CardTitle></CardHeader>
                        <CardContent>
                            <div className="divide-y">
                                {result.raw_data.analytes.map((a, i) => {
                                    const flag = analyteFlag(a);
                                    return (
                                        <div key={i} className="flex items-center justify-between py-2 text-sm">
                                            <span className="font-medium">{a.name}</span>
                                            <span className="flex items-center gap-3">
                                                <span>{a.value}{a.unit ? ` ${a.unit}` : ""}</span>
                                                {a.reference_range && (a.reference_range.low != null || a.reference_range.high != null) && (
                                                    <span className="text-muted-foreground">
                                                        ({a.reference_range.low ?? "–"}–{a.reference_range.high ?? "–"})
                                                    </span>
                                                )}
                                                {flag && <span className={`font-medium ${flagStyles[flag]}`}>{flag}</span>}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Advisor */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">AI wellness guidance</CardTitle>
                            <CardDescription>
                                Grounded in cited public health sources. Not medical advice.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!advisor && !advisorLoading && (
                                <Button onClick={loadAdvisor}>Get guidance for this result</Button>
                            )}
                            {advisorLoading && (
                                <p className="text-sm text-muted-foreground">Generating grounded guidance…</p>
                            )}
                            {advisorError && <p className="text-sm text-destructive">{advisorError}</p>}

                            {advisor && (
                                <div className="space-y-4">
                                    {advisor.status === "deferred" ? (
                                        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                            {advisor.guidance}
                                        </div>
                                    ) : (
                                        <div className="prose prose-sm max-w-none prose-headings:mt-4 prose-headings:mb-1 prose-headings:text-base prose-headings:font-semibold prose-p:my-2 prose-p:leading-relaxed">
                                            <ReactMarkdown>{advisor.guidance}</ReactMarkdown>
                                        </div>
                                    )}

                                    {advisor.citations.length > 0 && (
                                        <div className="border-t pt-3">
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Sources
                                            </p>
                                            <ol className="space-y-1 text-sm">
                                                {advisor.citations.map((c, i) => {
                                                    const isValidUrl = /^https?:\/\//i.test(c.source_url ?? "");
                                                    const hasSource = c.source && c.source !== "unknown";
                                                    return (
                                                        <li key={i}>
                                                            <span className="text-muted-foreground">[{i + 1}]</span>{" "}
                                                            {isValidUrl ? (
                                                                <a
                                                                    href={c.source_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:underline"
                                                                >
                                                                    {c.title}
                                                                </a>
                                                            ) : (
                                                                <span>{c.title}</span>
                                                            )}
                                                            {hasSource && (
                                                                <span className="text-muted-foreground"> — {c.source}</span>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ol>
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground">
                                        {advisor.model && <>Generated by {advisor.model}</>}
                                        {advisor.prompt_version ? ` · prompt ${advisor.prompt_version}` : ""}
                                        {advisor.created_at ? ` · ${formatDateTime(advisor.created_at)}` : ""}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
