import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { Shield, Users, Flame, Sparkles, Menu, X, MessageSquare, Megaphone, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  component: () => (
    <RequireAuth role="admin">
      <AdminLayout />
    </RequireAuth>
  ),
});

function AdminLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navLinks = [
    {
      to: "/admin",
      label: "Overview Dashboard",
      icon: <Shield className="h-4 w-4 text-primary" />,
      exact: true,
    },
    {
      to: "/admin/users",
      label: "User Management",
      icon: <Users className="h-4 w-4 text-emerald-500" />,
    },
    {
      to: "/admin/habits",
      label: "Bad Habits Limit",
      icon: <ShieldAlert className="h-4 w-4 text-amber-500" />,
    },
    {
      to: "/admin/rewards",
      label: "Streak Rules (Rewards)",
      icon: <Flame className="h-4 w-4 text-orange-500" />,
    },
    {
      to: "/admin/motivations",
      label: "Motivation Quotes",
      icon: <Sparkles className="h-4 w-4 text-sky-500" />,
    },
    {
      to: "/admin/feedback",
      label: "User Feedback",
      icon: <MessageSquare className="h-4 w-4 text-rose-500" />,
    },
    {
      to: "/admin/announcements",
      label: "Announcements",
      icon: <Megaphone className="h-4 w-4 text-amber-500" />,
    },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] gap-6 relative">
      {/* Mobile Top Bar / Toggle Button */}
      <div className="flex items-center justify-between border-b pb-4 md:hidden">
        <div className="flex items-center gap-2 text-primary font-bold">
          <Shield className="h-5 w-5" />
          <span>Admin Portal</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(true)}
          className="h-9 w-9 cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 w-64 bg-background border-r p-6 z-50 flex flex-col justify-between shrink-0
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0 md:flex md:w-64 md:border-r md:p-0 md:pr-6 md:bg-transparent md:z-auto md:min-h-0
        `}
      >
        <div className="space-y-6">
          {/* Sidebar Header with Close Button for Mobile */}
          <div className="flex items-center justify-between px-2 text-primary font-bold">
            <div className="flex items-center gap-2 font-bold text-lg">
              <Shield className="h-5 w-5" />
              <span>Admin Portal</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileOpen(false)}
              className="h-8 w-8 md:hidden cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeProps={{ className: "bg-secondary text-secondary-foreground font-semibold" }}
                inactiveProps={{ className: "hover:bg-accent hover:text-accent-foreground text-muted-foreground" }}
                className="w-full inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer"
                activeOptions={link.exact ? { exact: true } : undefined}
                onClick={() => setIsMobileOpen(false)}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t pt-4 px-2 text-[10px] text-muted-foreground mt-6 md:mt-0">
          Logged in as Administrator
        </div>
      </aside>

      {/* Main Admin Content Container */}
      <main className="flex-1 min-w-0 space-y-6">
        <Outlet />
      </main>
    </div>
  );
}
