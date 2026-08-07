// app/(patient)/profile/page.tsx — view/edit patient health profile with set-once fields.
"use client";

import { useEffect, useState } from "react";
import { getProfile, updateProfile, PatientProfile, PatientProfileUpdate } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SEX = ["male", "female", "unknown"];
const GENOTYPE = ["AA", "AS", "SS", "AC", "SC", "unknown"];
const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];
const SMOKING = ["never", "former", "current", "unknown"];
const ALCOHOL = ["none", "occasional", "regular", "unknown"];
const ACTIVITY = ["sedentary", "light", "moderate", "active", "unknown"];

// Fields that are set-once (locked after first real value) — mirrors backend D-45.
const PROTECTED = ["genotype", "blood_type", "date_of_birth", "sex"] as const;
const UNSET = new Set([null, undefined, "", "unknown"]);
const isUnset = (v: unknown) => UNSET.has(v as string);

const cap = (s: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");
const listToStr = (a: string[] | undefined) => (a && a.length ? a.join(", ") : "");
const strToList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Select({ value, onChange, options, disabled }: {
  value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-60">
      {options.map((o) => <option key={o} value={o}>{cap(o)}</option>)}
    </select>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<PatientProfileUpdate>({});

  useEffect(() => {
    getProfile().then(setProfile).catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load profile"));
  }, []);

  // Is a protected field already locked (has a real value on the saved profile)?
  const locked = (field: string): boolean =>
    !!profile && !isUnset((profile as unknown as Record<string, unknown>)[field]);

  function startEdit() {
    if (!profile) return;
    setForm({
      date_of_birth: profile.date_of_birth ?? undefined,
      sex: profile.sex ?? "unknown",
      height_cm: profile.height_cm ?? undefined,
      weight_kg: profile.weight_kg ?? undefined,
      genotype: profile.genotype ?? "unknown",
      blood_type: profile.blood_type ?? "unknown",
      known_conditions: profile.known_conditions,
      current_medications: profile.current_medications,
      allergies: profile.allergies,
      family_history: profile.family_history,
      smoking_status: profile.smoking_status ?? "unknown",
      alcohol_use: profile.alcohol_use ?? "unknown",
      dietary_restrictions: profile.dietary_restrictions,
      activity_level: profile.activity_level ?? "unknown",
      lifestyle_notes: profile.lifestyle_notes ?? "",
    });
    setEditing(true);
    setNotice(null);
  }

  function set<K extends keyof PatientProfileUpdate>(k: K, v: PatientProfileUpdate[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // Don't send locked protected fields at all (backend would ignore them anyway).
      const payload: PatientProfileUpdate = { ...form };
      for (const f of PROTECTED) {
        if (locked(f)) delete (payload as Record<string, unknown>)[f];
      }
      const updated = await updateProfile(payload);
      setProfile(updated);
      setEditing(false);
      setNotice("Profile updated. This information personalizes your AI guidance.");
      setTimeout(() => setNotice(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  if (error && !profile) return <div className="mx-auto max-w-3xl p-8 text-sm text-destructive">{error}</div>;
  if (!profile) return <div className="mx-auto max-w-3xl p-8 text-muted-foreground">Loading…</div>;

  const anyProtectedUnset = PROTECTED.some((f) => !locked(f));

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Your health profile personalizes the AI guidance on your results.
          </p>
        </div>
        {!editing && <Button onClick={startEdit}>Edit</Button>}
      </div>

      {notice && <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {editing && anyProtectedUnset && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Enter genotype, blood type, date of birth, and sex carefully.</strong>{" "}
          These affect how your results are interpreted (for example, genotype changes
          how an HbA1c result is read). Once saved, they can&apos;t be changed here —
          contact support if you need to correct them later.
        </div>
      )}

      {!editing ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Demographics</CardTitle></CardHeader>
            <CardContent className="divide-y">
              <Row label="Date of birth">{profile.date_of_birth ?? "—"}</Row>
              <Row label="Sex">{cap(profile.sex)}</Row>
              <Row label="Height">{profile.height_cm ? `${profile.height_cm} cm` : "—"}</Row>
              <Row label="Weight">{profile.weight_kg ? `${profile.weight_kg} kg` : "—"}</Row>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Clinical</CardTitle>
              <CardDescription>Details here directly affect your guidance (e.g. genotype for HbA1c reliability).</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              <Row label="Genotype">{profile.genotype ?? "—"}</Row>
              <Row label="Blood type">{profile.blood_type ?? "—"}</Row>
              <Row label="Known conditions">{listToStr(profile.known_conditions) || "—"}</Row>
              <Row label="Current medications">{listToStr(profile.current_medications) || "—"}</Row>
              <Row label="Allergies">{listToStr(profile.allergies) || "—"}</Row>
              <Row label="Family history">{listToStr(profile.family_history) || "—"}</Row>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Lifestyle</CardTitle></CardHeader>
            <CardContent className="divide-y">
              <Row label="Smoking">{cap(profile.smoking_status)}</Row>
              <Row label="Alcohol">{cap(profile.alcohol_use)}</Row>
              <Row label="Activity level">{cap(profile.activity_level)}</Row>
              <Row label="Dietary restrictions">{listToStr(profile.dietary_restrictions) || "—"}</Row>
              <Row label="Notes">{profile.lifestyle_notes || "—"}</Row>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Demographics</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Date of birth" hint={locked("date_of_birth") ? "Set — contact support to change" : "Can't be changed after saving"}>
                <Input type="date" value={form.date_of_birth ?? ""} disabled={locked("date_of_birth")}
                  onChange={(e) => set("date_of_birth", e.target.value)} />
              </Field>
              <Field label="Sex" hint={locked("sex") ? "Set — contact support to change" : "Can't be changed after saving"}>
                <Select value={form.sex ?? "unknown"} onChange={(v) => set("sex", v)} options={SEX} disabled={locked("sex")} />
              </Field>
              <Field label="Height (cm)">
                <Input type="number" value={form.height_cm ?? ""} onChange={(e) => set("height_cm", e.target.value ? Number(e.target.value) : undefined)} />
              </Field>
              <Field label="Weight (kg)">
                <Input type="number" value={form.weight_kg ?? ""} onChange={(e) => set("weight_kg", e.target.value ? Number(e.target.value) : undefined)} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Clinical</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Genotype" hint={locked("genotype") ? "Set — contact support to change" : "Set once — can't be changed after saving"}>
                <Select value={form.genotype ?? "unknown"} onChange={(v) => set("genotype", v)} options={GENOTYPE} disabled={locked("genotype")} />
              </Field>
              <Field label="Blood type" hint={locked("blood_type") ? "Set — contact support to change" : "Set once — can't be changed after saving"}>
                <Select value={form.blood_type ?? "unknown"} onChange={(v) => set("blood_type", v)} options={BLOOD} disabled={locked("blood_type")} />
              </Field>
              <Field label="Known conditions (comma-separated)">
                <Input value={listToStr(form.known_conditions)} onChange={(e) => set("known_conditions", strToList(e.target.value))} />
              </Field>
              <Field label="Current medications (comma-separated)">
                <Input value={listToStr(form.current_medications)} onChange={(e) => set("current_medications", strToList(e.target.value))} />
              </Field>
              <Field label="Allergies (comma-separated)">
                <Input value={listToStr(form.allergies)} onChange={(e) => set("allergies", strToList(e.target.value))} />
              </Field>
              <Field label="Family history (comma-separated)">
                <Input value={listToStr(form.family_history)} onChange={(e) => set("family_history", strToList(e.target.value))} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Lifestyle</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Smoking"><Select value={form.smoking_status ?? "unknown"} onChange={(v) => set("smoking_status", v)} options={SMOKING} /></Field>
              <Field label="Alcohol"><Select value={form.alcohol_use ?? "unknown"} onChange={(v) => set("alcohol_use", v)} options={ALCOHOL} /></Field>
              <Field label="Activity level"><Select value={form.activity_level ?? "unknown"} onChange={(v) => set("activity_level", v)} options={ACTIVITY} /></Field>
              <Field label="Dietary restrictions (comma-separated)">
                <Input value={listToStr(form.dietary_restrictions)} onChange={(e) => set("dietary_restrictions", strToList(e.target.value))} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Lifestyle notes">
                  <Input value={form.lifestyle_notes ?? ""} onChange={(e) => set("lifestyle_notes", e.target.value)} />
                </Field>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
