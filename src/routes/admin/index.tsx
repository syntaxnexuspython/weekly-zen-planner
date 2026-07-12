import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Flame, Award, Sparkles, ArrowRight, MessageSquare, Megaphone } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/admin/")({
  component: AdminOverviewDashboard,
});

function AdminOverviewDashboard() {
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: api.listUsers });
  const { data: streakRules = [] } = useQuery({ queryKey: ["streak-rules"], queryFn: api.adminListStreakRules });
  const { data: motivations = [] } = useQuery({ queryKey: ["motivations"], queryFn: api.adminListMotivations });
  const { data: feedbacks = [] } = useQuery({ queryKey: ["admin-feedbacks"], queryFn: api.adminListFeedback });
  const { data: announcements = [] } = useQuery({ queryKey: ["admin-announcements"], queryFn: api.adminListAnnouncements });

  const totalUsers = users.filter((u) => u.role === "user").length;
  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const avgStreak = totalUsers === 0 ? 0 :
    Math.round(users.filter((u) => u.role === "user").reduce((s, u) => s + (u.streakCount ?? 0), 0) / totalUsers);

  const activeStreakRules = streakRules.filter((r) => r.is_active).length;
  const activeMotivations = motivations.filter((m) => m.is_active).length;
  const pendingFeedbacks = feedbacks.filter((f) => f.status === "pending").length;
  const activeAnnouncements = announcements.filter((a) => a.isActive).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview Dashboard</h1>
        <p className="text-sm text-muted-foreground">Zen Planner administrative control panel.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total Users" value={totalUsers} icon={<Users className="h-4 w-4 text-primary" />} />
        <Stat label="Avg User Streak" value={`${avgStreak} days`} icon={<Flame className="h-4 w-4 text-orange-500" />} />
        <Stat label="Streak Rules" value={`${activeStreakRules}/${streakRules.length} Active`} icon={<Award className="h-4 w-4 text-emerald-500" />} />
        <Stat label="Motivation Quotes" value={`${activeMotivations}/${motivations.length} Active`} icon={<Sparkles className="h-4 w-4 text-indigo-500" />} />
        <Stat label="Open Feedback" value={`${pendingFeedbacks} Pending`} icon={<MessageSquare className="h-4 w-4 text-rose-500" />} />
        <Stat label="Announcements" value={`${activeAnnouncements} Active`} icon={<Megaphone className="h-4 w-4 text-amber-550" />} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* User Management Section */}
        <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <Badge variant="secondary">{users.length} Total Accounts</Badge>
            </div>
            <CardTitle className="text-base">User Management</CardTitle>
            <CardDescription>
              Monitor registered user accounts, streaks, and streak freezes.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex-1 flex flex-col justify-between">
            <div className="text-xs text-muted-foreground mb-4 space-y-1">
              <div>• Users: <span className="font-semibold text-foreground">{totalUsers}</span></div>
              <div>• Administrators: <span className="font-semibold text-foreground">{totalAdmins}</span></div>
            </div>
            <Link to="/admin/users" className="w-full">
              <button className="w-full inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold h-9 px-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                Manage Users <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </CardContent>
        </Card>

        {/* Streak Rules Section */}
        <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600">
                <Award className="h-5 w-5" />
              </div>
              <Badge variant="secondary">{streakRules.length} Rules</Badge>
            </div>
            <CardTitle className="text-base">Streak Rules</CardTitle>
            <CardDescription>
              Configure milestone rules that grant streak freezes to users.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex-1 flex flex-col justify-between">
            <div className="text-xs text-muted-foreground mb-4 space-y-1">
              <div>• Active Milestones: <span className="font-semibold text-foreground">{activeStreakRules}</span></div>
              <div>• Inactive Milestones: <span className="font-semibold text-foreground">{streakRules.length - activeStreakRules}</span></div>
            </div>
            <Link to="/admin/rewards" className="w-full">
              <button className="w-full inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold h-9 px-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                Manage Rules <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </CardContent>
        </Card>

        {/* Motivation Quotes Section */}
        <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="rounded-full bg-indigo-500/10 p-2 text-indigo-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <Badge variant="secondary">{motivations.length} Quotes</Badge>
            </div>
            <CardTitle className="text-base">Motivation Quotes</CardTitle>
            <CardDescription>
              Manage motivational quotes shown on user dashboards to inspire completion.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex-1 flex flex-col justify-between">
            <div className="text-xs text-muted-foreground mb-4 space-y-1">
              <div>• Active Quotes: <span className="font-semibold text-foreground">{activeMotivations}</span></div>
              <div>• Inactive Quotes: <span className="font-semibold text-foreground">{motivations.length - activeMotivations}</span></div>
            </div>
            <Link to="/admin/motivations" className="w-full">
              <button className="w-full inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold h-9 px-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                Manage Quotes <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </CardContent>
        </Card>

        {/* User Feedback Section */}
        <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="rounded-full bg-rose-500/10 p-2 text-rose-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <Badge variant="secondary">{feedbacks.length} Items</Badge>
            </div>
            <CardTitle className="text-base">User Feedback</CardTitle>
            <CardDescription>
              Review bug reports, feature requests, appreciation, and support messages.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex-1 flex flex-col justify-between">
            <div className="text-xs text-muted-foreground mb-4 space-y-1">
              <div>• Pending Actions: <span className="font-semibold text-rose-600">{pendingFeedbacks}</span></div>
              <div>• Total Feedback: <span className="font-semibold text-foreground">{feedbacks.length}</span></div>
            </div>
            <Link to="/admin/feedback" className="w-full">
              <button className="w-full inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold h-9 px-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                View Feedback <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </CardContent>
        </Card>

        {/* Announcements Section */}
        <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="rounded-full bg-amber-500/10 p-2 text-amber-600">
                <Megaphone className="h-5 w-5" />
              </div>
              <Badge variant="secondary">{announcements.length} Total</Badge>
            </div>
            <CardTitle className="text-base">Announcements</CardTitle>
            <CardDescription>
              Broadcast alerts, system updates, banner notices, and announcements to users.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex-1 flex flex-col justify-between">
            <div className="text-xs text-muted-foreground mb-4 space-y-1">
              <div>• Active Notices: <span className="font-semibold text-amber-600">{activeAnnouncements}</span></div>
              <div>• Inactive Notices: <span className="font-semibold text-foreground">{announcements.length - activeAnnouncements}</span></div>
            </div>
            <Link to="/admin/announcements" className="w-full">
              <button className="w-full inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold h-9 px-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                Manage Announcements <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
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
