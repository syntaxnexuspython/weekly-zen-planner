import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { StreakRule } from "@/types";

export const Route = createFileRoute("/admin/rewards")({
  component: AdminStreakRules,
});

function AdminStreakRules() {
  const { data: streakRules = [], refetch: refetchRules } = useQuery({
    queryKey: ["streak-rules"],
    queryFn: api.adminListStreakRules,
  });

  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<StreakRule | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleDays, setRuleDays] = useState(3);
  const [ruleFreezes, setRuleFreezes] = useState(1);
  const [ruleMaxFreezes, setRuleMaxFreezes] = useState(2);
  const [ruleActive, setRuleActive] = useState(true);

  function openCreateRule() {
    setRuleToEdit(null);
    setRuleName("");
    setRuleDays(3);
    setRuleFreezes(1);
    setRuleMaxFreezes(2);
    setRuleActive(true);
    setIsRuleDialogOpen(true);
  }

  function openEditRule(rule: StreakRule) {
    setRuleToEdit(rule);
    setRuleName(rule.name);
    setRuleDays(rule.required_consecutive_days);
    setRuleFreezes(rule.freezes_to_grant);
    setRuleMaxFreezes(rule.max_freezes_allowed);
    setRuleActive(rule.is_active);
    setIsRuleDialogOpen(true);
  }

  async function handleSaveRule(e: React.FormEvent) {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const ruleData = {
      name: ruleName,
      required_consecutive_days: ruleDays,
      freezes_to_grant: ruleFreezes,
      max_freezes_allowed: ruleMaxFreezes,
      is_active: ruleActive,
    };

    try {
      if (ruleToEdit) {
        await api.adminUpdateStreakRule(ruleToEdit.id, ruleData);
        toast.success("Streak rule updated");
      } else {
        await api.adminCreateStreakRule(ruleData);
        toast.success("Streak rule created");
      }
      refetchRules();
      setIsRuleDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save streak rule");
    }
  }

  async function handleToggleRuleActive(rule: StreakRule) {
    try {
      await api.adminUpdateStreakRule(rule.id, { is_active: !rule.is_active });
      toast.success(`Rule ${!rule.is_active ? "activated" : "deactivated"}`);
      refetchRules();
    } catch (err: any) {
      toast.error(err.message || "Failed to update rule status");
    }
  }

  async function handleDeleteRule(id: string) {
    if (!confirm("Are you sure you want to delete this streak rule?")) return;
    try {
      await api.adminDeleteStreakRule(id);
      toast.success("Streak rule deleted");
      refetchRules();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete rule");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Streak Rules & Freeze Rewards</h1>
          <p className="text-sm text-muted-foreground">Configure milestone rules for granting freezes.</p>
        </div>
        <Button onClick={openCreateRule} size="sm" className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> Create Rule
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">System Milestone Rules</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Req. Consecutive Days</TableHead>
                <TableHead>Freezes to Grant</TableHead>
                <TableHead>Max Allowed Freezes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {streakRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                    No rules defined. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                streakRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>{rule.required_consecutive_days} days</TableCell>
                    <TableCell>{rule.freezes_to_grant} freeze(s)</TableCell>
                    <TableCell>{rule.max_freezes_allowed} freezes</TableCell>
                    <TableCell>
                      <Badge variant={rule.is_active ? "default" : "secondary"}>
                        {rule.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer"
                          onClick={() => handleToggleRuleActive(rule)}
                        >
                          {rule.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 cursor-pointer"
                          onClick={() => openEditRule(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-650 cursor-pointer"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{ruleToEdit ? "Edit Streak Rule" : "Create Streak Rule"}</DialogTitle>
            <DialogDescription>
              Configure milestone rules to award freezes when users complete tasks.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRule} className="space-y-4 my-2">
            <div className="space-y-1">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                placeholder="e.g., Weekly Streak Reward"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="rule-days">Req. Days</Label>
                <Input
                  id="rule-days"
                  type="number"
                  min={1}
                  value={ruleDays}
                  onChange={(e) => setRuleDays(parseInt(e.target.value) || 3)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-grant">Grant Freezes</Label>
                <Input
                  id="rule-grant"
                  type="number"
                  min={0}
                  value={ruleFreezes}
                  onChange={(e) => setRuleFreezes(parseInt(e.target.value) || 1)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-max">Max Freezes</Label>
                <Input
                  id="rule-max"
                  type="number"
                  min={0}
                  value={ruleMaxFreezes}
                  onChange={(e) => setRuleMaxFreezes(parseInt(e.target.value) || 2)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Label htmlFor="rule-active-state">Make Rule Active</Label>
              <Button
                type="button"
                variant={ruleActive ? "default" : "outline"}
                size="sm"
                onClick={() => setRuleActive(!ruleActive)}
                className="cursor-pointer"
              >
                {ruleActive ? <Check className="mr-1 h-4 w-4" /> : <X className="mr-1 h-4 w-4" />}
                {ruleActive ? "Active" : "Inactive"}
              </Button>
            </div>

            <Button type="submit" size="sm" className="w-full cursor-pointer">
              {ruleToEdit ? "Save Rule" : "Create Rule"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
