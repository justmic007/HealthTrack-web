// app/(admin)/layout.tsx — admin route group shell (admin-only) + nav.
// Desktop: brand + nav inline left, user + sign-out right.
// Mobile: brand left, hamburger right → toggles a dropdown with nav + sign-out.
"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
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
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <RequireRole role="admin">
      <div className="min-h-screen">
        <header className="border-b">
          <div className="mx-auto max-w-6xl p-4">
            <div className="flex items-center justify-between gap-4">
              {/* brand */}
              <span className="font-semibold">
                HealthTrack <span className="text-muted-foreground">· Admin</span>
              </span>

              {/* desktop nav + actions */}
              <div className="hidden items-center gap-6 sm:flex">
                <nav className="flex items-center gap-1">
                  {NAV.map((n) => (
                    <Link key={n.href} href={n.href}
                      className={`rounded-md px-3 py-1.5 text-sm ${isActive(n.href) ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                      {n.label}
                    </Link>
                  ))}
                </nav>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{user?.full_name ?? "Admin"}</span>
                  <Button variant="outline" size="sm" onClick={logout}>Sign out</Button>
                </div>
              </div>

              {/* mobile hamburger */}
              <button
                className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted sm:hidden"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>

            {/* mobile dropdown */}
            {open && (
              <div className="mt-3 flex flex-col gap-1 border-t pt-3 sm:hidden">
                <p className="px-3 pb-2 text-xs text-muted-foreground">
                  Signed in as <span className="font-medium text-foreground">{user?.full_name ?? "Admin"}</span>
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
        <main>{children}</main>
      </div>
    </RequireRole>
  );
}
