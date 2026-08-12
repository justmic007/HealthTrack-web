// app/(admin)/layout.tsx — admin route group shell (admin-only) + nav.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RequireRole } from "@/components/RequireRole";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/labs", label: "Labs" },
  { href: "/admin/users", label: "Users" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  return (
    <RequireRole role="admin">
      <div className="min-h-screen">
        <header className="border-b">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-6">
              <span className="font-semibold">HealthTrack <span className="text-muted-foreground">· Admin</span></span>
              <nav className="flex items-center gap-1">
                {NAV.map((n) => {
                  const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
                  return (
                    <Link key={n.href} href={n.href}
                      className={`rounded-md px-3 py-1.5 text-sm ${active ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                      {n.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{user?.full_name ?? "Admin"}</span>
              <Button variant="outline" size="sm" onClick={logout}>Sign out</Button>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </RequireRole>
  );
}
