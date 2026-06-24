import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/require-auth";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ListChecks, CheckCircle2, Flame } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin")({
  component: () => (
    <RequireAuth role="admin">
      <AdminDashboard />
    </RequireAuth>
  ),
});

function AdminDashboard() {
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: api.listUsers });
  const { data: tasks = [] } = useQuery({ queryKey: ["all-tasks"], queryFn: api.listAllTasks });

  const totalUsers = users.filter((u) => u.role === "user").length;
  const totalTasks = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const avgStreak = totalUsers === 0 ? 0 :
    Math.round(users.filter((u) => u.role === "user").reduce((s, u) => s + u.streakCount, 0) / totalUsers);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of all users and tasks.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users" value={totalUsers} icon={<Users className="h-4 w-4" />} />
        <Stat label="Total tasks" value={totalTasks} icon={<ListChecks className="h-4 w-4" />} />
        <Stat label="Completed" value={completed} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
        <Stat label="Avg streak" value={avgStreak} icon={<Flame className="h-4 w-4 text-orange-500" />} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Users</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Streak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const userTasks = tasks.filter((t) => (t as any).userId === u.id);
                const done = userTasks.filter((t) => t.status === "completed").length;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                    </TableCell>
                    <TableCell>{userTasks.length}</TableCell>
                    <TableCell>{done}</TableCell>
                    <TableCell>{u.streakCount} 🔥</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent tasks</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.slice(-15).reverse().map((t) => {
                const owner = users.find((u) => u.id === (t as any).userId);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="text-muted-foreground">{owner?.name ?? (t as any).userId}</TableCell>
                    <TableCell>{t.date}</TableCell>
                    <TableCell><Badge variant="outline">{t.priority}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={t.status === "completed" ? "default" : "secondary"}>{t.status}</Badge>
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

function Stat({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
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
