import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { User, Lock, Bell, Mail, ShieldAlert, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/profile")({
  component: () => (
    <RequireAuth>
      <ProfileSettings />
    </RequireAuth>
  ),
});

function ProfileSettings() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const { data: userProfile, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => api.getUserProfile(),
  });

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    if (userProfile && userProfile.profile) {
      setEmailNotifications(userProfile.profile.email_notifications ?? true);
      setReminders(userProfile.profile.reminders ?? true);
    }
  }, [userProfile]);

  const updatePrefs = useMutation({
    mutationFn: ({ email, remind }: { email: boolean; remind: boolean }) =>
      api.updateNotificationPreferences(email, remind),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userProfile"] });
      toast.success("Notification preferences updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update notification preferences");
    },
  });

  const handleToggleEmail = (checked: boolean) => {
    setEmailNotifications(checked);
    updatePrefs.mutate({ email: checked, remind: reminders });
  };

  const handleToggleReminders = (checked: boolean) => {
    setReminders(checked);
    updatePrefs.mutate({ email: emailNotifications, remind: checked });
  };

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setPasswordBusy(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      toast.success("Password updated successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setPasswordBusy(false);
    }
  }

  const initials = session?.user
    ? `${session.user.first_name[0] || ""}${session.user.last_name[0] || ""}`.toUpperCase()
    : "U";

  const fullName = session?.user
    ? `${session.user.first_name} ${session.user.last_name}`
    : "User Profile";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal details, secure your account, and set notification preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <Card className="overflow-hidden border border-border bg-gradient-to-b from-card to-background">
            <CardHeader className="flex flex-col items-center pb-6">
              <Avatar className="h-20 w-20 border-2 border-primary/20 bg-muted mb-4 ring-offset-background ring-2 ring-primary/10">
                <AvatarFallback className="text-2xl font-semibold text-primary-foreground bg-primary/95">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-lg font-bold text-center mt-2">{fullName}</CardTitle>
              <CardDescription className="text-center">{session?.user?.email}</CardDescription>
              <span className="mt-3 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize">
                <BadgeCheck className="h-3.5 w-3.5" />
                {session?.role || "user"}
              </span>
            </CardHeader>
            <CardContent className="border-t pt-4 text-sm space-y-3">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Email address</span>
                <span className="font-medium text-foreground">{session?.user?.email}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">First Name</span>
                <span className="font-medium text-foreground">{session?.user?.first_name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Last Name</span>
                <span className="font-medium text-foreground">{session?.user?.last_name}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Settings & Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Notification Preferences */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Notification Preferences</CardTitle>
                <CardDescription>Select which notifications you would like to receive.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="text-sm font-medium">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive daily summaries and updates via email.</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={handleToggleEmail}
                  disabled={isLoading || updatePrefs.isPending}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="reminders" className="text-sm font-medium">Task Reminders</Label>
                  <p className="text-xs text-muted-foreground">Get reminded of tasks scheduled for today.</p>
                </div>
                <Switch
                  id="reminders"
                  checked={reminders}
                  onCheckedChange={handleToggleReminders}
                  disabled={isLoading || updatePrefs.isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Change Password</CardTitle>
                <CardDescription>Secure your account with a strong password.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="old-password">Current Password</Label>
                  <Input
                    id="old-password"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 4 characters"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={passwordBusy} className="w-full sm:w-auto">
                  {passwordBusy ? "Updating Password..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
