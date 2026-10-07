// components/DemoAccess.tsx — one-click demo sign-in for reviewers.
// Signs in as a synthetic demo account (no credentials in the browser) and routes to that role's home.
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { demoLogin } from "@/lib/api";
import { useAuth, homeForRole } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";

export function DemoAccess({ className }: { className?: string }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The backend can be asleep on first hit; explain the wait instead of looking stuck.
  useEffect(() => {
    if (!busy) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, [busy]);

  async function enter(role: string, key: string) {
    setError(null);
    setBusy(role);
    try {
      await demoLogin(key);
      const me = await refresh();
      router.push(homeForRole(me?.user_type));
    } catch {
      setError("Couldn't start the demo. Please try again in a moment.");
      setBusy(null);
    }
  }

  const [primary, ...others] = DEMO_ACCOUNTS;

  return (
    <div className={className}>
      <Button size="lg" className="w-full" disabled={!!busy}
        onClick={() => enter(primary.role, primary.key)}>
        {busy === primary.role ? "Opening demo…" : `Explore as a ${primary.role.toLowerCase()}`}
      </Button>
      <p className="mb-2 mt-4 text-xs text-muted-foreground">Or explore as</p>
      <div className="grid grid-cols-3 gap-2">
        {others.map((a) => (
          <Button key={a.role} variant="outline" disabled={!!busy}
            onClick={() => enter(a.role, a.key)}>
            {busy === a.role ? "…" : a.role}
          </Button>
        ))}
      </div>
      {slow && (
        <p className="mt-3 text-xs text-muted-foreground">
          Waking the demo server. The first sign-in can take up to a minute.
        </p>
      )}
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      <p className="mt-3 text-xs text-muted-foreground">
        One click, no sign-up. Demo accounts use synthetic data only.
      </p>
    </div>
  );
}
