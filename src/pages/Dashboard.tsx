import { LayoutDashboard, Users, Zap, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const stats = [
  {
    title: "Total Boards",
    value: "12",
    description: "Active boards",
    icon: LayoutDashboard,
  },
  {
    title: "Team Members",
    value: "8",
    description: "In your organization",
    icon: Users,
  },
  {
    title: "Automations",
    value: "24",
    description: "Active templates",
    icon: Zap,
  },
  {
    title: "Tasks Completed",
    value: "156",
    description: "This month",
    icon: TrendingUp,
  },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name || "User"}! Here's what's happening.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder content area */}
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Welcome to MondayEase</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Your Monday.com productivity companion. Start by connecting your
            organization to unlock powerful automation templates and insights.
          </p>
        </div>
      </Card>
    </div>
  );
}
