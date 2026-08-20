// app/page.tsx — HealthTrack landing page (public).
// Monochrome base + one professional teal accent (via --primary / text-primary).
// Color discipline: teal = brand/interaction; emerald/amber/rose = clinical status
// only. Signature: the hero IS a real "result -> explanation" product moment.
import Link from "next/link";

export const metadata = {
  title: "HealthTrack — your lab results, explained",
  description:
    "A multi-role health-records platform with AI-assisted, non-diagnostic interpretation of lab results. Portfolio project — synthetic data only.",
};

function Flag({ tone, children }: { tone: "normal" | "borderline" | "abnormal"; children: React.ReactNode }) {
  const styles = {
    normal: "border-emerald-200 bg-emerald-50 text-emerald-700",
    borderline: "border-amber-200 bg-amber-50 text-amber-700",
    abnormal: "border-rose-200 bg-rose-50 text-rose-700",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-xs font-medium ${styles}`}>
      {children}
    </span>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-primary sm:tracking-[0.22em]">{children}</p>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ---- top bar ---- */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
            HealthTrack
          </span>
          <nav className="flex items-center gap-1">
            <Link href="/login" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              Sign in
            </Link>
            <Link href="/register" className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              Create account
            </Link>
          </nav>
        </div>
      </header>

      {/* ---- hero ---- */}
      <section className="relative overflow-hidden">
        {/* faint accent wash, top-right — the only ambient color */}
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full opacity-[0.07] blur-3xl"
          style={{ background: "var(--primary)" }}
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-20 sm:pt-28">
          <Eyebrow>Health records · AI-assisted · non-diagnostic</Eyebrow>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Your lab results,
            <br />
            <span className="text-primary">explained</span> in plain language.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            HealthTrack turns raw lab data into something you can actually read —
            with trends over time and grounded guidance that assists, but never
            diagnoses.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register" className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              Create an account
            </Link>
            <Link href="/login" className="rounded-md border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted">
              Sign in
            </Link>
          </div>

          {/* signature artifact: a result being explained */}
          <div className="mt-16 overflow-hidden rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Result · HbA1c</span>
              <span className="font-mono text-xs text-muted-foreground">26 Apr 2026</span>
            </div>
            <div className="grid gap-px bg-border md:grid-cols-2">
              {/* data side */}
              <div className="bg-background p-6 sm:p-8">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Glycated hemoglobin</span>
                  <Flag tone="abnormal">Abnormal</Flag>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight">6.5</span>
                  <span className="font-mono text-xl text-muted-foreground">%</span>
                  <span className="ml-1 font-mono text-sm text-rose-600">▲ rising</span>
                </div>
                <div className="mt-2 font-mono text-xs text-muted-foreground">
                  reference 4.0–5.6% · independently sourced
                </div>
                <div className="mt-6 flex h-20 items-end gap-1.5" aria-hidden>
                  {[5.4, 5.6, 5.9, 6.0, 6.2, 6.5].map((v, i) => {
                    // scale 5.2..6.5 across ~16..80px so the rise is clearly visible
                    const h = 16 + ((v - 5.2) / (6.5 - 5.2)) * 64;
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className={`w-full rounded-t-sm ${i === 5 ? "bg-primary" : "bg-foreground/20"}`}
                          style={{ height: `${h}px` }}
                        />
                        <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{v}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Jan 2025 → Apr 2026 · six readings
                </div>
              </div>
              {/* explanation side */}
              <div className="bg-background p-6 sm:p-8">
                <span className="font-mono text-xs uppercase tracking-wider text-primary">What this means</span>
                <p className="mt-4 leading-relaxed">
                  Your HbA1c has risen steadily over the past year and is now above the
                  normal range. It reflects average blood sugar over roughly three
                  months, and is worth discussing with your doctor.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  This is context, not a diagnosis. The trend and reference range are
                  computed deterministically; the wording is drafted by an AI and
                  reviewed before it reaches you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- four roles ---- */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Eyebrow>Access control</Eyebrow>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">
            Four roles, each sees exactly what it should
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            HealthTrack isn’t a single dashboard. It’s a permissioned system where
            every role has its own view and its own boundaries — enforced on the
            server, deny-by-default.
          </p>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", role: "Patient", body: "Owns their record. Sees results, trends, plain-language guidance, and reminders — and controls exactly what’s shared." },
              { n: "02", role: "Caregiver", body: "Sees only results a patient has explicitly shared. No trends, no advisor — access is scoped and revocable." },
              { n: "03", role: "Lab", body: "Uploads results, drafts summaries with AI, and extracts measurements from real lab PDFs with human review." },
              { n: "04", role: "Admin", body: "Operational only — approves labs, verifies licenses, views anonymized analytics. Never holds clinical data." },
            ].map((r) => (
              <div key={r.role} className="group bg-background p-6 transition-colors hover:bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-primary">{r.n}</span>
                </div>
                <div className="mt-3 text-base font-semibold">{r.role}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- AI features ---- */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Eyebrow>AI that assists</Eyebrow>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">
            Intelligence where it helps — with a human in the loop
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {[
              { k: "Result advisor", d: "Explains what a result means and drafts follow-up reminders. Trends and flags are computed deterministically — the AI only writes the explanation, so it can’t invent a clinical value." },
              { k: "PDF extraction", d: "Reads measurements from real lab reports (text layer or OCR), structures them against known analytes, and shows the lab exactly what it read — to correct before confirming." },
              { k: "Grounded guidance", d: "Whole-picture guidance is drawn from your own results over a window you choose — never generic advice — and always framed as non-diagnostic." },
            ].map((f) => (
              <div key={f.k} className="border-t-2 border-primary/70 pt-4">
                <div className="text-base font-semibold">{f.k}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- safety / design ---- */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Eyebrow>Built with care</Eyebrow>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">
            Safety is a design decision, not a disclaimer
          </h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
            {[
              { k: "Non-diagnostic by design", d: "The system explains and contextualizes; it never diagnoses. Deterministic trend analysis is kept separate from AI-written text to eliminate hallucinated clinical values." },
              { k: "Sourced reference ranges", d: "Flags are computed against independently-sourced clinical ranges — a lab can’t define its own “normal” and quietly flag away an abnormal result." },
              { k: "Separation of duties", d: "Roles are strictly bounded and enforced server-side. An admin operates the system, but can never be assigned clinical results." },
              { k: "Synthetic data only", d: "This is a portfolio build running entirely on synthetic records. No real patient data is involved." },
            ].map((sItem) => (
              <div key={sItem.k} className="bg-background p-6 sm:p-8">
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <div>
                    <div className="font-semibold">{sItem.k}</div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{sItem.d}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Eyebrow>Grounded in real sources</Eyebrow>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">
            Explanations are backed by citations, not guesses
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The advisor doesn&apos;t invent medical explanations. Every &ldquo;what this means&rdquo; is grounded in a
            curated knowledge base &mdash; 30 sourced passages from MedlinePlus, WHO, CDC, Mayo Clinic, Cleveland Clinic,
            and NORD, covering diabetes, cholesterol, hypertension, anemia, sickle cell disease, malaria, and typhoid.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-6 sm:p-8">
              <div className="font-semibold">Numeric flagging</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Five core analytes &mdash; HbA1c, Total Cholesterol, LDL, HDL, and Triglycerides &mdash; are compared against
                reference ranges read directly from MedlinePlus and Johns Hopkins Medicine, one citation per number.
                Other numeric results are extracted and shown, but flagged &ldquo;unknown&rdquo; rather than guessed.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-6 sm:p-8">
              <div className="font-semibold">Coverage grows deliberately</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Rapid, titer, and graded tests (malaria, typhoid, and others) are flagged against the assay&apos;s own
                reported cutoff or expected value &mdash; never a lab-invented range. New sourced ranges are added
                over time; accuracy comes before coverage.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {["MedlinePlus", "WHO", "CDC", "Mayo Clinic", "Cleveland Clinic", "NORD", "Johns Hopkins Medicine"].map((src) => (
              <span key={src} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                {src}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">See it for yourself</h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Create an account and explore the patient experience, or sign in.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/register" className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              Create an account
            </Link>
            <Link href="/login" className="rounded-md border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ---- footer ---- */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-10 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold tracking-tight">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
            <span>HealthTrack</span>
            <span className="font-mono text-xs font-normal text-muted-foreground">
              Synthetic data only · non-diagnostic
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            <a
              href="https://github.com/justmic007/HealthTrack-web"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
