// app/(caregiver)/layout.tsx — guards all caregiver routes + shared nav shell.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RequireRole } from "@/components/RequireRole";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/care", label: "Shared with me" },
];

function CaregiverNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/care" className="font-semibold">HealthTrack <span className="text-muted-foreground font-normal">· Caregiver</span></Link>
          <nav className="hidden gap-1 sm:flex">
            {NAV.map((n) => {
              const active = pathname === n.href || pathname.startsWith(n.href + "/");
              return (
                <Link key={n.href} href={n.href}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${active ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60"}`}>
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user?.full_name ?? user?.email}
          </span>
          <Button variant="outline" size="sm" onClick={logout}>Sign out</Button>
        </div>
      </div>
    </header>
  );
}

export default function CaregiverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="caregiver">
      <CaregiverNav />
      <main>{children}</main>
    </RequireRole>
  );
}
