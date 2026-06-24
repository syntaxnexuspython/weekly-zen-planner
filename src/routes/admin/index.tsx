import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, ListChecks, CheckCircle2, Flame } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/admin/")({
  component: AdminOverviewDashboard,
});

function AdminOverviewDashboard() {
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: api.listUsers });
  const { data: tasks = [] } = useQuery({ queryKey: ["all-tasks"], queryFn: api.listAllTasks });

  const totalUsers = users.filter((u) => u.role === "user").length;
  const totalTasks = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.status === "completed").length;
  const avgStreak = totalUsers === 0 ? 0 :
    Math.round(users.filter((u) => u.role === "user").reduce((s, u) => s + (u.streakCount ?? 0), 0) / totalUsers);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview Dashboard</h1>
        <p className="text-sm text-muted-foreground">System-wide metrics and activities.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total Users" value={totalUsers} icon={<Users className="h-4 w-4 text-primary" />} />
        <Stat label="Total Tasks" value={totalTasks} icon={<ListChecks className="h-4 w-4 text-emerald-500" />} />
        <Stat label="Completed Tasks" value={completedTasksCount} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
        <Stat label="Avg User Streak" value={`${avgStreak} days`} icon={<Flame className="h-4 w-4 text-orange-500" />} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Activity Logs</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Title</TableHead>
                <TableHead>User Name</TableHead>
                <TableHead>Target Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.slice(-8).reverse().map((t) => {
                const owner = users.find((u) => u.id === t.userId);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="text-muted-foreground">{owner?.name ?? "Unknown User"}</TableCell>
                    <TableCell>{t.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{t.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.status === "completed" ? "default" : "secondary"}>
                        {t.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}
