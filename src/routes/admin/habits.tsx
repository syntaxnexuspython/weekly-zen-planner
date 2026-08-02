import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldAlert, Save, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/habits")({
  component: AdminHabitSettings,
});

function AdminHabitSettings() {
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState<number>(3);

  const { data: serverLimit, isLoading, refetch } = useQuery({
    queryKey: ["adminHabitLimit"],
    queryFn: () => api.getAdminHabitLimit(),
  });

  useEffect(() => {
    if (serverLimit !== undefined) {
      setLimit(serverLimit);
    }
  }, [serverLimit]);

  const updateMutation = useMutation({
    mutationFn: (newLimit: number) => api.updateAdminHabitLimit(newLimit),
    onSuccess: (updated) => {
      setLimit(updated);
      queryClient.invalidateQueries({ queryKey: ["adminHabitLimit"] });
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      toast.success(`Bad habit limit updated to ${updated} per user`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update habit limit");
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (limit < 1 || limit > 50) {
      toast.error("Limit must be between 1 and 50");
      return;
    }
    updateMutation.mutate(limit);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-amber-500" /> Bad Habits Vault Limits
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure maximum active bad habit trackers allowed per user across the system.
        </p>
      </div>

      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle className="text-lg">System-wide Active Habit Limit</CardTitle>
          <CardDescription>
            Prevents users from overloading their recovery process by restricting maximum simultaneously active habit trackers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading limit configuration...
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="maxLimit">Maximum Active Habits Per User</Label>
                <Input
                  id="maxLimit"
                  type="number"
                  min={1}
                  max={50}
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">Range: 1 to 50 (Default: 3)</p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={updateMutation.isPending} className="gap-2 cursor-pointer">
                  <Save className="h-4 w-4" /> Save Limit
                </Button>
                <Button type="button" variant="outline" onClick={() => refetch()} className="cursor-pointer">
                  Reset Form
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
