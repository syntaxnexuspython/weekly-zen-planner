import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!session) router.navigate({ to: "/login" });
    else router.navigate({ to: session.user.role === "admin" ? "/admin" : "/dashboard" });
  }, [session, loading, router]);
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
      Redirecting…
    </div>
  );
}
