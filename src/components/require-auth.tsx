import { useEffect, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/types";

export function RequireAuth({ role, children }: { role?: Role; children: ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.navigate({ to: "/login" });
    } else if (role && session.user.role !== role) {
      router.navigate({ to: session.user.role === "admin" ? "/admin" : "/dashboard" });
    }
  }, [session, loading, role, router]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (role && session.user.role !== role) return null;
  return <>{children}</>;
}
