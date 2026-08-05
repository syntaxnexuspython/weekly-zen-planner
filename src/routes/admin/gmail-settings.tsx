import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Sparkles, Save, RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/admin/gmail-settings")({
  component: AdminGmailSettings,
});

function AdminGmailSettings() {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState<boolean>(true);

  const { data: serverConfig, isLoading, refetch } = useQuery({
    queryKey: ["adminGmailToggle"],
    queryFn: () => api.getAdminGmailFeatureToggle(),
  });

  useEffect(() => {
    if (serverConfig !== undefined) {
      setEnabled(serverConfig.feature_enabled);
    }
  }, [serverConfig]);

  const updateMutation = useMutation({
    mutationFn: (newEnabled: boolean) => api.updateAdminGmailFeatureToggle(newEnabled),
    onSuccess: (updated) => {
      setEnabled(updated.feature_enabled);
      queryClient.invalidateQueries({ queryKey: ["adminGmailToggle"] });
      queryClient.invalidateQueries({ queryKey: ["gmailStatus"] });
      toast.success(`Gmail AI integration feature ${updated.feature_enabled ? "enabled" : "disabled"} system-wide!`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update feature settings");
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(enabled);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Mail className="h-6 w-6 text-indigo-500" /> Gmail & Groq AI System Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Global administrative control panel for Google Gmail OAuth and Groq AI email extraction features.
        </p>
      </div>

      <Card className="shadow-sm border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" /> System-wide Gmail Integration Status
            </CardTitle>
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
              enabled
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
            }`}>
              {enabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
              {enabled ? "Feature Active" : "Feature Disabled"}
            </div>
          </div>
          <CardDescription>
            Enabling this allows users to connect their Gmail accounts and use Groq AI to extract important emails into tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading feature settings...
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-accent/20">
                <div className="space-y-0.5">
                  <Label htmlFor="gmailToggle" className="text-sm font-semibold cursor-pointer">
                    Enable Gmail & Groq AI Feature for All Users
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When disabled, the email extraction widget will display a notice and API requests will be blocked.
                  </p>
                </div>
                <Switch
                  id="gmailToggle"
                  checked={enabled}
                  onCheckedChange={(checked) => setEnabled(checked)}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={updateMutation.isPending} className="gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Save className="h-4 w-4" /> Save Feature Settings
                </Button>
                <Button type="button" variant="outline" onClick={() => refetch()} className="cursor-pointer">
                  Reset
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
