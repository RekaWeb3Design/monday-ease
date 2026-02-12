import { useState, useEffect } from "react";
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
  ArrowRight,
  Building2,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useBoardConfigs } from "@/hooks/useBoardConfigs";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { useWorkflowTemplates } from "@/hooks/useWorkflowTemplates";
import { useWorkflowExecutions } from "@/hooks/useWorkflowExecutions";
import { useIntegration } from "@/hooks/useIntegration";
import { useCustomBoardViews } from "@/hooks/useCustomBoardViews";
import { useClients } from "@/hooks/useClients";
import { GettingStartedChecklist } from "@/components/dashboard/GettingStartedChecklist";
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

function getInitials(name: string | null | undefined, email?: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "success":
      return "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/20";
    case "failed":
      return "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]/20";
    case "running":
      return "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getAudienceLabel(audience: string | null) {
  switch (audience) {
    case "clients":
      return "Clients";
    case "both":
      return "Both";
    default:
      return "Team";
  }
}

// Count-up animation hook
function useCountUp(target: number, duration = 600) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const steps = Math.min(target, 20);
    const stepDuration = duration / steps;
    let current = 0;
    const timer = setInterval(() => {
      current++;
      setCount(Math.round((current / steps) * target));
      if (current >= steps) clearInterval(timer);
    }, stepDuration);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

function AnimatedStat({ value, isLoading }: { value: number; isLoading: boolean }) {
  const animated = useCountUp(isLoading ? 0 : value);
  if (isLoading) return <Skeleton className="h-10 w-16" />;
  return <div className="text-4xl font-extrabold">{animated}</div>;
}

export default function Dashboard() {
  const { user, profile, organization, memberRole } = useAuth();
  const { configs, isLoading: boardsLoading } = useBoardConfigs();
  const { members, isLoading: membersLoading } = useOrganizationMembers();
  const { templates, isLoading: templatesLoading } = useWorkflowTemplates();
  const { executions, isLoading: executionsLoading } = useWorkflowExecutions();
  const { isConnected } = useIntegration();
  const { views, isLoading: viewsLoading } = useCustomBoardViews();
  const { clients, isLoading: clientsLoading } = useClients();

  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "User";

  // Active team members (not pending)
  const activeMembers = members.filter((m) => m.status === "active");

  // Other active members excluding current user (for checklist)
  const otherActiveMembers = members.filter(
    (m) => m.status === "active" && m.user_id !== user?.id
  );

  // Executions this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const executionsThisMonth = executions.filter(
    (e) => e.started_at && new Date(e.started_at) >= startOfMonth
  );

  // Recent executions for activity feed (last 5)
  const recentExecutions = executions.slice(0, 5);

  // Member board counts
  const memberBoardCounts = new Map<string, number>();
  configs.forEach((config) => {
    (config as any).memberAccess?.forEach((access: any) => {
      memberBoardCounts.set(
        access.member_id,
        (memberBoardCounts.get(access.member_id) || 0) + 1
      );
    });
  });

  // Active boards for summary
  const activeBoards = configs.filter((c) => c.is_active).slice(0, 4);

  // Stats
  const stats = [
    {
      title: "Total Boards",
      value: configs.length,
      description: "Configured boards",
      icon: LayoutDashboard,
      isLoading: boardsLoading,
      gradient: "from-blue-500/10 to-blue-600/5",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-500/10",
    },
    {
      title: "Team Members",
      value: activeMembers.length,
      description: "Active members",
      icon: Users,
      isLoading: membersLoading,
      gradient: "from-emerald-500/10 to-emerald-600/5",
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-500/10",
    },
    {
      title: "Templates",
      value: templates.length,
      description: "Available workflows",
      icon: Zap,
      isLoading: templatesLoading,
      gradient: "from-purple-500/10 to-purple-600/5",
      iconColor: "text-purple-600",
      iconBg: "bg-purple-500/10",
    },
    {
      title: "Executions",
      value: executionsThisMonth.length,
      description: "This month",
      icon: TrendingUp,
      isLoading: executionsLoading,
      gradient: "from-orange-500/10 to-orange-600/5",
      iconColor: "text-orange-600",
      iconBg: "bg-orange-500/10",
    },
  ];

  const quickActions = [
    { label: "Configure Boards", to: "/boards", icon: LayoutDashboard, color: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "Manage Team", to: "/organization", icon: Users, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Run Template", to: "/templates", icon: Zap, color: "text-purple-600", bg: "bg-purple-500/10" },
    { label: "Integrations", to: "/integrations", icon: Settings, color: "text-orange-600", bg: "bg-orange-500/10" },
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

      {/* Getting Started Checklist (owners only) */}
      {memberRole === "owner" && (
        <GettingStartedChecklist
          isConnected={isConnected}
          boardCount={configs.length}
          memberCount={otherActiveMembers.length}
          viewCount={views.length}
          executionCount={executions.length}
          isLoading={boardsLoading || membersLoading || viewsLoading || executionsLoading}
        />
      )}

      {/* Enhanced Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {stats.map((stat) => (
          <Card key={stat.title} className={`bg-gradient-to-br ${stat.gradient} border hover:shadow-md hover:translate-y-[-2px] transition-all duration-200`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.iconBg}`}>
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <AnimatedStat value={stat.value} isLoading={stat.isLoading} />
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Team Overview + Board Summary row */}
      <div className="grid gap-4 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
        {/* Team Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-muted-foreground" />
              Team Overview
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="group">
              <Link to="/organization" className="text-xs text-muted-foreground">
                View all <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No team members yet.{" "}
                <Link to="/organization" className="text-primary underline">
                  Invite someone
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {members.slice(0, 5).map((member) => {
                  const boardCount = memberBoardCounts.get(member.id) || 0;
                  const isCurrentUser = member.user_id === user?.id;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(member.display_name, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-none">
                            {member.display_name || member.email}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge
                              variant={getRoleBadgeVariant(member.role)}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {getRoleLabel(member.role)}
                            </Badge>
                            <Badge
                              variant={member.status === "active" ? "default" : "secondary"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {member.status === "active" ? "Active" : "Pending"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isCurrentUser ? (
                          <span className="text-primary font-medium">You</span>
                        ) : (
                          <>
                            <span>{boardCount} board{boardCount !== 1 ? "s" : ""}</span>
                            <Link to="/organization">
                              <Eye className="h-3.5 w-3.5 hover:text-foreground transition-colors" />
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {members.length > 5 && (
                  <Link
                    to="/organization"
                    className="block text-xs text-primary text-center hover:underline pt-1"
                  >
                    View all {members.length} members →
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Boards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
              Your Boards
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="group">
              <Link to="/boards" className="text-xs text-muted-foreground">
                View all <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {boardsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : activeBoards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No boards configured yet.{" "}
                <Link to="/boards" className="text-primary underline">
                  Add your first board
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {activeBoards.map((board) => {
                  const memberCount = (board as any).memberAccess?.length || 0;
                  const colCount = Array.isArray(board.visible_columns)
                    ? board.visible_columns.length
                    : 0;
                  return (
                    <div
                      key={board.id}
                      className="rounded-lg border p-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">{board.board_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {getAudienceLabel(board.target_audience)}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {memberCount} member{memberCount !== 1 ? "s" : ""}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          · {colCount} column{colCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {configs.filter((c) => c.is_active).length > 4 && (
                  <Link
                    to="/boards"
                    className="block text-xs text-primary text-center hover:underline pt-1"
                  >
                    View all {configs.filter((c) => c.is_active).length} boards →
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clients + Quick Actions row */}
      <div className="grid gap-4 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
        {/* Your Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              Your Clients
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="group">
              <Link to="/clients" className="text-xs text-muted-foreground">
                Manage <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {clientsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : clients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No clients yet.{" "}
                <Link to="/clients" className="text-primary underline">
                  Add your first client
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {clients.slice(0, 3).map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm font-medium truncate">
                        {client.company_name}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {client.board_access_count} board
                      {client.board_access_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
                {clients.length > 3 && (
                  <Link
                    to="/clients"
                    className="block text-xs text-primary text-center hover:underline pt-1"
                  >
                    View all {clients.length} clients →
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2">
              {quickActions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="group flex items-center gap-3 rounded-lg border p-3 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                >
                  <div className={`rounded-lg p-2 ${action.bg} group-hover:scale-110 transition-transform`}>
                    <action.icon className={`h-4 w-4 ${action.color}`} />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-muted-foreground" />
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
              <p className="mt-4 font-medium text-muted-foreground">No recent activity</p>
              <p className="text-sm text-muted-foreground mb-3">
                Start by configuring a board or running a template!
              </p>
              <Button asChild size="sm" variant="outline">
                <Link to="/boards">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Configure a Board
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentExecutions.map((exec) => (
                <div
                  key={exec.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
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
                  <Badge className={getStatusBadgeClass(exec.status)}>
                    {exec.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
