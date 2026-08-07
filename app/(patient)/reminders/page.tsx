// app/(patient)/reminders/page.tsx — reminders: create, complete, delete, .ics, show-completed.
"use client";

import { useEffect, useState, useCallback } from "react";
import {
    listReminders, createReminder, completeReminder, deleteReminder,
    downloadReminderIcs, Reminder,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPES = [
    { value: "follow_up", label: "Follow-up" },
    { value: "medication", label: "Medication" },
    { value: "custom", label: "Custom" },
];

const typeLabel = (v: string) => TYPES.find((t) => t.value === v)?.label ?? v;

const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

export default function RemindersPage() {
    const [reminders, setReminders] = useState<Reminder[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [showCompleted, setShowCompleted] = useState(false);

    // create form
    const [title, setTitle] = useState("");
    const [type, setType] = useState("follow_up");
    const [due, setDue] = useState("");
    const [desc, setDesc] = useState("");
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const page = await listReminders(50, 0, showCompleted);
            setReminders(page.items);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load reminders");
        }
    }, [showCompleted]);

    useEffect(() => { load(); }, [load]);

    async function handleCreate() {
        setFormError(null);
        if (!title.trim() || !due) {
            setFormError("Title and due date are required.");
            return;
        }
        setCreating(true);
        try {
            await createReminder({
                title: title.trim(),
                reminder_type: type,
                due_datetime: new Date(due).toISOString(),
                description: desc.trim() || undefined,
            });
            setTitle(""); setDue(""); setDesc(""); setType("follow_up");
            await load();
        } catch (e) {
            setFormError(e instanceof Error ? e.message : "Could not create reminder");
        } finally {
            setCreating(false);
        }
    }

    async function handleComplete(id: string) {
        setBusy(id);
        try {
            await completeReminder(id);
            setNotice("Marked complete. Toggle “Show completed” to see it.");
            setTimeout(() => setNotice(null), 3500);
            await load();
        } finally { setBusy(null); }
    }

    async function handleDelete(id: string) {
        setBusy(id);
        try { await deleteReminder(id); await load(); }
        finally { setBusy(null); }
    }

    async function handleIcs(r: Reminder) {
        try { await downloadReminderIcs(r.id, r.title); }
        catch (e) { setError(e instanceof Error ? e.message : "Download failed"); }
    }

    const activeCount = reminders?.filter((r) => !r.is_completed).length ?? 0;

    return (
        <div className="mx-auto max-w-3xl p-4 sm:p-8">
            <h1 className="mb-1 text-2xl font-semibold">Reminders</h1>
            <p className="mb-6 text-sm text-muted-foreground">Track follow-ups and medication, and add them to your calendar.</p>

            {/* Create */}
            <Card className="mb-6">
                <CardHeader className="pb-2"><CardTitle className="text-base">New reminder</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="r-title">Title</Label>
                            <Input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Recheck HbA1c" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="r-type">Type</Label>
                            <select id="r-type" value={type} onChange={(e) => setType(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="r-due">Due</Label>
                            <Input id="r-due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="r-desc">Note (optional)</Label>
                            <Input id="r-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Monitor the trend" />
                        </div>
                    </div>
                    {formError && <p className="text-sm text-destructive">{formError}</p>}
                    <Button onClick={handleCreate} disabled={creating}>{creating ? "Adding…" : "Add reminder"}</Button>
                </CardContent>
            </Card>

            {/* List header + toggle */}
            <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {activeCount} active{showCompleted ? " · completed shown" : ""}
                </p>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" checked={showCompleted}
                        onChange={(e) => setShowCompleted(e.target.checked)} className="h-4 w-4" />
                    Show completed
                </label>
            </div>

            {notice && <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
            {!reminders && !error && <p className="text-muted-foreground">Loading…</p>}
            {reminders && reminders.length === 0 && (
                <Card><CardContent className="py-10 text-center text-muted-foreground">
                    No reminders{showCompleted ? "" : " — add one above"}.
                </CardContent></Card>
            )}

            <div className="space-y-3">
                {reminders?.map((r) => (
                    <Card key={r.id} className={r.is_completed ? "opacity-60" : ""}>
                        <CardContent className="flex items-center justify-between gap-3 py-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`font-medium ${r.is_completed ? "line-through" : ""}`}>{r.title}</span>
                                    <span className="rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                        {typeLabel(r.reminder_type)}
                                    </span>
                                    {r.is_completed && (
                                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                                            Completed
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">Due {fmt(r.due_datetime)}</p>
                                {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleIcs(r)}>Add to calendar</Button>
                                {!r.is_completed && (
                                    <Button variant="outline" size="sm" disabled={busy === r.id}
                                        onClick={() => handleComplete(r.id)}>Done</Button>
                                )}
                                <Button variant="ghost" size="sm" disabled={busy === r.id}
                                    onClick={() => handleDelete(r.id)}
                                    className="text-destructive hover:text-destructive">Delete</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
