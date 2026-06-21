import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login, session } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("user@demo.com");
  const [password, setPassword] = useState("demo");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) router.navigate({ to: session.user.role === "admin" ? "/admin" : "/dashboard" });
  }, [session, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const s = await login(email, password);
      toast.success(`Welcome, ${s.user.name}`);
      router.navigate({ to: s.user.role === "admin" ? "/admin" : "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Calendar className="h-6 w-6" />
            <span className="font-semibold">Weekly Planner</span>
          </div>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Use a demo account: <code className="rounded bg-muted px-1">user@demo.com</code> or{" "}
            <code className="rounded bg-muted px-1">admin@demo.com</code> (any password)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEmail("admin@demo.com");
                  setPassword("demo");
                }}
              >
                Admin
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
