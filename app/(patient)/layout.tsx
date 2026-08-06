// app/(patient)/layout.tsx — guards all patient routes + shared nav shell.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RequireRole } from "@/components/RequireRole";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const NAV = [
    { href: "/app", label: "Home" },
    { href: "/results", label: "Results" },
    { href: "/trends", label: "Trends" },
    { href: "/reminders", label: "Reminders" },
    { href: "/sharing", label: "Sharing" },
    { href: "/profile", label: "Profile" },
];

function PatientNav() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    return (
        <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
                <div className="flex items-center gap-6">
                    <Link href="/app" className="font-semibold">HealthTrack</Link>
                    <nav className="hidden gap-1 sm:flex">
                        {NAV.map((n) => {
                            const active = pathname === n.href || pathname.startsWith(n.href + "/");
                            return (
                                <Link key={n.href} href={n.href}
                                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${active ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60"
                                        }`}>
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
            {/* mobile nav */}
            <nav className="flex gap-1 overflow-x-auto border-t px-2 py-1 sm:hidden">
                {NAV.map((n) => {
                    const active = pathname === n.href || pathname.startsWith(n.href + "/");
                    return (
                        <Link key={n.href} href={n.href}
                            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${active ? "bg-muted font-medium" : "text-muted-foreground"
                                }`}>
                            {n.label}
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
}

export default function PatientLayout({ children }: { children: React.ReactNode }) {
    return (
        <RequireRole role="patient">
            <PatientNav />
            <main>{children}</main>
        </RequireRole>
    );
}
