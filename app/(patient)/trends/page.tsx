// app/trends/page.tsx — analyte trends with clinical zone bands.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceArea, ReferenceLine,
} from "recharts";
import { getTrends, AnalyteTrend } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const directionLabel: Record<string, string> = {
    rising: "Rising", falling: "Falling", stable: "Stable",
};
const directionColor: Record<string, string> = {
    rising: "text-rose-600", falling: "text-amber-600", stable: "text-emerald-600",
};
const directionArrow: Record<string, string> = {
    rising: "↑", falling: "↓", stable: "→",
};

// HbA1c clinical zones (%). Only applied to HbA1c; other analytes just show the line.
const HBA1C_ZONES = [
    { y1: 0, y2: 5.7, fill: "#dcfce7", label: "Normal" },      // green
    { y1: 5.7, y2: 6.5, fill: "#fef3c7", label: "Prediabetes" }, // amber
    { y1: 6.5, y2: 100, fill: "#fee2e2", label: "Diabetes" },   // red
];

function CustomTooltip({ active, payload, label, unit }: any) {
    if (!active || !payload?.length) return null;
    const v = payload[0].value;
    return (
        <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-sm">
            <div className="font-medium">{label}</div>
            <div className="text-muted-foreground">{v}{unit ?? ""}</div>
        </div>
    );
}

function firstCrossing(points: { date: string; value: number }[], threshold: number): string | null {
    for (const p of points) if (p.value >= threshold) return p.date;
    return null;
}

function TrendCard({ t }: { t: AnalyteTrend }) {
    const data = t.points.map((p) => ({
        date: new Date(p.date).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        rawDate: p.date,
        value: p.value,
    }));

    const isHbA1c = t.name === "HbA1c";
    const values = t.points.map((p) => p.value);
    const yMin = Math.min(...values, isHbA1c ? 5.4 : Math.min(...values)) - 0.2;
    const yMax = Math.max(...values, isHbA1c ? 6.6 : Math.max(...values)) + 0.2;

    // narrative caption: when did it cross into prediabetes?
    const crossed = isHbA1c ? firstCrossing(t.points, 5.7) : null;
    const caption = crossed
        ? `Crossed into the prediabetes range around ${new Date(crossed).toLocaleDateString(undefined, { month: "long", year: "numeric" })}.`
        : null;

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <span className={`text-sm font-semibold ${directionColor[t.direction] ?? "text-muted-foreground"}`}>
                        {directionArrow[t.direction] ?? ""} {directionLabel[t.direction] ?? t.direction}
                    </span>
                </div>
                <CardDescription>
                    Latest {t.latest}{t.unit ?? ""}
                    {t.delta != null && <> · {t.delta > 0 ? "+" : ""}{t.delta}{t.unit ?? ""} over {t.points.length} readings</>}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
                            <defs>
                                <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            {/* clinical zone bands (HbA1c only) */}
                            {isHbA1c && HBA1C_ZONES.map((z, i) => (
                                <ReferenceArea key={i} y1={z.y1} y2={z.y2} fill={z.fill} fillOpacity={0.55} ifOverflow="hidden" />
                            ))}

                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
                            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false}
                                domain={[yMin, yMax]} width={44} />
                            <Tooltip content={<CustomTooltip unit={t.unit} />} />

                            {isHbA1c && (
                                <>
                                    <ReferenceLine y={5.7} stroke="#d97706" strokeWidth={1} strokeDasharray="4 3" />
                                    <ReferenceLine y={6.5} stroke="#dc2626" strokeWidth={1} strokeDasharray="4 3" />
                                </>
                            )}

                            <Area type="monotone" dataKey="value" stroke="none" fill="url(#lineFill)" />
                            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5}
                                dot={{ r: 3.5, fill: "#2563eb", strokeWidth: 0 }}
                                activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {isHbA1c && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#dcfce7" }} /> Normal &lt;5.7
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#fef3c7" }} /> Prediabetes 5.7–6.4
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#fee2e2" }} /> Diabetes ≥6.5
                        </span>
                    </div>
                )}

                {caption && <p className="mt-3 text-sm text-muted-foreground">{caption}</p>}
            </CardContent>
        </Card>
    );
}

export default function TrendsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [trends, setTrends] = useState<AnalyteTrend[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;
        getTrends().then(setTrends)
            .catch((e) => setError(e instanceof Error ? e.message : "Failed to load trends"));
    }, [user]);

    if (authLoading || !user) return <div className="p-8 text-muted-foreground">Loading…</div>;

    return (
        <div className="mx-auto max-w-3xl p-4 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Trends</h1>
                    <p className="text-sm text-muted-foreground">How your measurements change over time</p>
                </div>
                <Link href="/results"><Button variant="outline" size="sm">Results</Button></Link>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {!trends && !error && <p className="text-muted-foreground">Loading trends…</p>}
            {trends && trends.length === 0 && (
                <Card><CardContent className="py-10 text-center text-muted-foreground">
                    Not enough data yet — trends need at least two readings of the same test.
                </CardContent></Card>
            )}

            <div className="space-y-6">
                {trends?.map((t) => <TrendCard key={t.name} t={t} />)}
            </div>
        </div>
    );
}
