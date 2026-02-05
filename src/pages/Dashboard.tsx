import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Zap,
  TrendingUp,
  Activity,
  Sparkles,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useBoardConfigs } from "@/hooks/useBoardConfigs";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { useWorkflowTemplates } from "@/hooks/useWorkflowTemplates";
import { useWorkflowExecutions } from "@/hooks/useWorkflowExecutions";
import { useIntegration } from "@/hooks/useIntegration";
import mondayeaseLogo from "@/assets/mondayease_logo.png";

// Format relative time (e.g., "2 hours ago")
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Unknown time";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

// Get status badge variant
function getStatusVariant(status: string): "default" | "destructive" | "secondary" | "outline" {
  switch (status) {
    case "success":
      return "default";
    case "failed":
      return "destructive";
    case "running":
      return "secondary";
    default:
      return "outline";
  }
}

// Status icon component
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success":
      return <CheckCircle className="h-5 w-5 text-primary" />;
    case "failed":
      return <XCircle className="h-5 w-5 text-destructive" />;
    case "running":
      return <Loader2 className="h-5 w-5 text-secondary-foreground animate-spin" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
}

const getRoleBadgeVariant = (role: string | null) => {
  switch (role) {
    case "owner":
      return "default";
    case "admin":
      return "secondary";
    case "member":
      return "outline";
    default:
      return "outline";
  }
};

const getRoleLabel = (role: string | null) => {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "member":
      return "Member";
    default:
      return "";
  }
};

export default function Dashboard() {
  const { profile, organization, memberRole } = useAuth();
  const { configs, isLoading: boardsLoading } = useBoardConfigs();
  const { members, isLoading: membersLoading } = useOrganizationMembers();
  const { templates, isLoading: templatesLoading } = useWorkflowTemplates();
  const { executions, isLoading: executionsLoading } = useWorkflowExecutions();
  const { isConnected } = useIntegration();

  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "User";

  // Active team members (not pending)
  const activeMembers = members.filter((m) => m.status === "active");

  // Executions this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const executionsThisMonth = executions.filter(
    (e) => e.started_at && new Date(e.started_at) >= startOfMonth
  );

  // Recent executions for activity feed (last 5)
  const recentExecutions = executions.slice(0, 5);

  // Build stats array with real values
  const stats = [
    {
      title: "Total Boards",
      value: configs.length,
      description: "Configured boards",
      icon: LayoutDashboard,
      isLoading: boardsLoading,
    },
    {
      title: "Team Members",
      value: activeMembers.length,
      description: "Active members",
      icon: Users,
      isLoading: membersLoading,
    },
    {
      title: "Templates",
      value: templates.length,
      description: "Available workflows",
      icon: Zap,
      isLoading: templatesLoading,
    },
    {
      title: "Executions",
      value: executionsThisMonth.length,
      description: "This month",
      icon: TrendingUp,
      isLoading: executionsLoading,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {organization ? `Welcome to ${organization.name}` : "Dashboard"}
            </h1>
            {memberRole && (
              <Badge variant={getRoleBadgeVariant(memberRole)}>
                {getRoleLabel(memberRole)}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Welcome back, {displayName}! Here's what's happening.
          </p>
        </div>
      </div>

      {/* Integration Warning Banner */}
      {!isConnected && (
        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium">Monday.com not connected</p>
                <p className="text-sm text-muted-foreground">
                  Connect your account to start managing boards
                </p>
              </div>
            </div>
            <Button asChild size="sm">
              <Link to="/integrations">Connect Now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
              {stat.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" asChild className="justify-start">
              <Link to="/board-config">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Configure Boards
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/organization">
                <Users className="mr-2 h-4 w-4" />
                Manage Team
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/templates">
                <Zap className="mr-2 h-4 w-4" />
                Run Template
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/integrations">
                <Settings className="mr-2 h-4 w-4" />
                Integrations
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {executionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : recentExecutions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-20 w-40 items-center justify-center">
                <img src={mondayeaseLogo} alt="MondayEase" className="h-auto w-full opacity-50" />
              </div>
              <p className="mt-4 text-muted-foreground">No recent workflow executions</p>
              <p className="text-sm text-muted-foreground">Run a template to see activity here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentExecutions.map((exec) => (
                <div
                  key={exec.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon status={exec.status} />
                    <div>
                      <p className="text-sm font-medium">
                        {exec.workflow_templates?.name || "Unknown Template"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(exec.started_at)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(exec.status)}>{exec.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
