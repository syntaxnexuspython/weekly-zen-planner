import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

type Step = "details" | "otp";

function RegisterPage() {
  const { session, register  } = useAuth(); // adjust to however your auth context exposes a setter
  const router = useRouter();

  const [step, setStep] = useState<Step>("details");
  const [busy, setBusy] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (session) router.navigate({ to: session.role === "admin" ? "/admin" : "/dashboard" });
  }, [session, router]);

  async function onSubmitDetails(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setBusy(true);
    try {
      await api.verifyEmail(email, firstName);
      toast.success("OTP sent to your email");
      setStep("otp");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // verify otp first
      await api.verifyEmailOtp(email, otp);

      // then complete registration
      await register({
  email,
  password,
  first_name: firstName,
  last_name: lastName,
  otp,
});
      toast.success("Account created");
      router.navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    setBusy(true);
    try {
      await api.verifyEmail(email, firstName);
      toast.success("OTP resent");
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
          <CardTitle>{step === "details" ? "Create account" : "Verify your email"}</CardTitle>
          {step === "otp" && (
            <CardDescription>We sent a code to {email}. Enter it below to finish signing up.</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {step === "details" ? (
            <form className="space-y-4" onSubmit={onSubmitDetails}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Sending OTP…" : "Continue"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={onSubmitOtp}>
              <div className="space-y-2">
                <Label htmlFor="otp">OTP</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Verifying…" : "Create account"}
              </Button>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <button
                  type="button"
                  className="underline-offset-4 hover:underline disabled:opacity-50"
                  onClick={() => setStep("details")}
                  disabled={busy}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="underline-offset-4 hover:underline disabled:opacity-50"
                  onClick={resendOtp}
                  disabled={busy}
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}