import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/admin/users")({
  component: AdminUserManagement,
});

function AdminUserManagement() {
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: api.listUsers });
  const { data: tasks = [] } = useQuery({ queryKey: ["all-tasks"], queryFn: api.listAllTasks });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">Monitor user engagement, streaks, and freezes.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All Registered Users</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tasks Created</TableHead>
                <TableHead>Tasks Completed</TableHead>
                <TableHead>Current Streak</TableHead>
                <TableHead>Freezes Left</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const userTasks = tasks.filter((t) => t.userId === u.id);
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
                    <TableCell className="font-semibold text-orange-600">{(u.streakCount ?? 0)} 🔥</TableCell>
                    <TableCell>{(u.streakFreezes ?? 0)} ❄️</TableCell>
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
