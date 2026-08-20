// app/(lab)/layout.tsx — guards all lab routes + shared nav shell.
// A PENDING lab sees a minimal onboarding shell (upload verification docs,
// see status) instead of the normal nav + dashboard. Real lab endpoints are
// already blocked server-side (require_approved_lab) — this is just the
// matching frontend experience.
"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { RequireRole } from "@/components/RequireRole";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LabOnboarding } from "@/components/LabOnboarding";

const NAV = [
  { href: "/lab", label: "Results" },
  { href: "/lab/upload", label: "Upload result" },
];

function LabNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || (href !== "/lab" && pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/lab" className="font-semibold">HealthTrack <span className="font-normal text-muted-foreground">· Lab</span></Link>
            <nav className="hidden gap-1 sm:flex">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${isActive(n.href) ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60"}`}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <span className="text-sm text-muted-foreground">{user?.full_name ?? user?.email}</span>
            <Button variant="outline" size="sm" onClick={logout}>Sign out</Button>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted sm:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="mt-3 flex flex-col gap-1 border-t pt-3 sm:hidden">
            <p className="px-3 pb-2 text-xs text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user?.full_name ?? user?.email}</span>
            </p>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                className={`rounded-md px-3 py-2 text-sm ${isActive(n.href) ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                {n.label}
              </Link>
            ))}
            <div className="mt-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={logout} className="w-full">Sign out</Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

// Minimal shell shown to a pending lab — brand + sign out only, no dashboard nav.
function PendingLabShell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="font-semibold">HealthTrack <span className="font-normal text-muted-foreground">· Lab</span></span>
          <Button variant="outline" size="sm" onClick={logout}>Sign out</Button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="lab">
      <LabGate>{children}</LabGate>
    </RequireRole>
  );
}

// Inside RequireRole so `user` is guaranteed non-null here.
function LabGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.lab_status && user.lab_status !== "approved") {
    return (
      <PendingLabShell>
        <LabOnboarding status={user.lab_status} />
      </PendingLabShell>
    );
  }
  return (
    <>
      <LabNav />
      <main>{children}</main>
    </>
  );
}
