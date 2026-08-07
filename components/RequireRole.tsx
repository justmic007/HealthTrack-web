// components/RequireRole.tsx — guards a subtree by role.
// Redirects: unauthenticated -> /login; wrong role -> that role's home.
"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth, homeForRole } from "@/lib/auth-context";

export function RequireRole({
    role,
    children,
}: {
    role: string | string[];
    children: ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const allowed = Array.isArray(role) ? role : [role];

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace("/login");
            return;
        }
        if (!allowed.includes(user.user_type)) {
            router.replace(homeForRole(user.user_type));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, user]);

    // While resolving, or if not permitted, render nothing (redirect is in flight).
    if (loading || !user || !allowed.includes(user.user_type)) {
        return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
    }
    return <>{children}</>;
}
