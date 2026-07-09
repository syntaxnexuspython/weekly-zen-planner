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
  const [allowPasswordLogin, setAllowPasswordLogin] = useState(true);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    if (userProfile) {
      if (userProfile.profile) {
        setEmailNotifications(userProfile.profile.email_notifications ?? true);
        setReminders(userProfile.profile.reminders ?? true);
      }
      setAllowPasswordLogin(userProfile.allow_password_login ?? true);
    }
  }, [userProfile]);

  const updateLocalSession = (updates: Partial<any>) => {
    try {
      const raw = localStorage.getItem("weekly_planner_session_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (parsed.user) {
            Object.assign(parsed.user, updates);
          } else {
            Object.assign(parsed, updates);
          }
          localStorage.setItem("weekly_planner_session_v1", JSON.stringify(parsed));
        }
      }
    } catch (e) {
      console.error("Failed to update local session storage:", e);
    }
  };

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

  const updateAuthSettings = useMutation({
    mutationFn: (allow: boolean) => api.updateAuthSettings(allow),
    onSuccess: (_, checked) => {
      qc.invalidateQueries({ queryKey: ["userProfile"] });
      updateLocalSession({ allow_password_login: checked });
      toast.success("Authentication settings updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update authentication settings");
      // Revert local toggle state
      setAllowPasswordLogin(userProfile?.allow_password_login ?? true);
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

  const handleToggleAuth = (checked: boolean) => {
    if (checked && userProfile && !userProfile.has_password) {
      toast.error("You must set a password before enabling email and password login.");
      return;
    }
    setAllowPasswordLogin(checked);
    updateAuthSettings.mutate(checked);
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
      const isSetting = userProfile && !userProfile.has_password;
      toast.success(isSetting ? "Password set successfully. Email & password login is now enabled." : "Password updated successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      updateLocalSession({ has_password: true, allow_password_login: true });
      qc.invalidateQueries({ queryKey: ["userProfile"] });
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

          {/* Authentication Settings */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Authentication Settings</CardTitle>
                <CardDescription>Manage how you sign in to your account.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Google Login Status */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Google Sign-In</span>
                    {userProfile?.google_id ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {userProfile?.google_id 
                      ? "Your account is linked with Google. You can sign in using your Google account." 
                      : "Google account is not linked."}
                  </p>
                </div>
              </div>

              {/* Password Login Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="allow-password-login" className="text-sm font-medium">Email & Password Login</Label>
                    {userProfile?.has_password ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                        Password Set
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600">
                        No Password Set
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Allow logging in using your email and password.
                  </p>
                </div>
                <Switch
                  id="allow-password-login"
                  checked={allowPasswordLogin}
                  onCheckedChange={handleToggleAuth}
                  disabled={isLoading || updateAuthSettings.isPending || (userProfile && !userProfile.has_password)}
                />
              </div>

              {userProfile && !userProfile.has_password && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-semibold">Password Setup Required</p>
                    <p className="mt-0.5">You must set a password in the section below before you can enable email & password login.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change / Set Password */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">
                  {userProfile?.has_password ? "Change Password" : "Set Password"}
                </CardTitle>
                <CardDescription>
                  {userProfile?.has_password 
                    ? "Secure your account with a strong password."
                    : "Create a password for your account to enable email and password login."}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {userProfile?.has_password && (
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
                )}

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
                  {passwordBusy 
                    ? (userProfile?.has_password ? "Updating Password..." : "Setting Password...") 
                    : (userProfile?.has_password ? "Update Password" : "Set Password")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
