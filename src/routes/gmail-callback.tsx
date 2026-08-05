import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/gmail-callback")({
  component: GmailCallback,
});

function GmailCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      setError("No authorization code returned from Google.");
      return;
    }

    async function processCallback() {
      try {
        await api.callbackGmail(code!);
        toast.success("Gmail connected successfully! 🎉");
        navigate({ to: "/dashboard" });
      } catch (err: any) {
        setError(err.message || "Failed to complete Gmail authorization.");
      }
    }

    processCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full text-center py-8 px-4">
        <CardContent className="space-y-4">
          {error ? (
            <>
              <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
              <h2 className="text-lg font-bold text-foreground">Authorization Failed</h2>
              <p className="text-xs text-muted-foreground">{error}</p>
              <button
                onClick={() => navigate({ to: "/dashboard" })}
                className="mt-4 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-md"
              >
                Back to Dashboard
              </button>
            </>
          ) : (
            <>
              <RefreshCw className="h-10 w-10 animate-spin text-primary mx-auto" />
              <h2 className="text-lg font-semibold tracking-tight">Connecting your Gmail...</h2>
              <p className="text-xs text-muted-foreground">
                Exchanging secure OAuth tokens with Google. You will be redirected automatically.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
