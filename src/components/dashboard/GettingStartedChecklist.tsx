import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  X,
  Rocket,
  LayoutDashboard,
  Users,
  Zap,
  Eye,
  Cable,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isComplete: boolean;
  href: string;
}

interface GettingStartedChecklistProps {
  isConnected: boolean;
  boardCount: number;
  memberCount: number;
  viewCount: number;
  executionCount: number;
  isLoading: boolean;
}

const STORAGE_KEY = "mondayease_onboarding_dismissed";

export function GettingStartedChecklist({
  isConnected,
  boardCount,
  memberCount,
  viewCount,
  executionCount,
  isLoading,
}: GettingStartedChecklistProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const steps: ChecklistStep[] = useMemo(
    () => [
      {
        id: "connect",
        title: "Connect Monday.com",
        description: "Link your account to sync boards",
        icon: Cable,
        isComplete: isConnected,
        href: "/integrations",
      },
      {
        id: "board",
        title: "Configure Your First Board",
        description: "Set up a board for task management",
        icon: LayoutDashboard,
        isComplete: boardCount > 0,
        href: "/board-config",
      },
      {
        id: "members",
        title: "Invite Team Members",
        description: "Add colleagues to collaborate",
        icon: Users,
        isComplete: memberCount > 0,
        href: "/organization",
      },
      {
        id: "view",
        title: "Create a Custom View",
        description: "Build tailored views for your team",
        icon: Eye,
        isComplete: viewCount > 0,
        href: "/board-views",
      },
      {
        id: "workflow",
        title: "Run Your First Workflow",
        description: "Execute an automation template",
        icon: Zap,
        isComplete: executionCount > 0,
        href: "/templates",
      },
    ],
    [isConnected, boardCount, memberCount, viewCount, executionCount]
  );

  const completedCount = steps.filter((s) => s.isComplete).length;
  const progressPercent = (completedCount / steps.length) * 100;
  const allComplete = completedCount === steps.length;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsDismissed(true);
  };

  const handleShowAgain = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsDismissed(false);
  };

  // Auto-hide when all complete
  useEffect(() => {
    if (allComplete && !isDismissed) {
      const timer = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, "true");
        setIsDismissed(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [allComplete, isDismissed]);

  // Show collapsed "Resume setup" button if dismissed but not complete
  if (isDismissed && !allComplete) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleShowAgain}
        className="gap-2"
      >
        <Rocket className="h-4 w-4" />
        Resume setup ({completedCount}/{steps.length} complete)
      </Button>
    );
  }

  // Hide completely if dismissed and all complete
  if (isDismissed && allComplete) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-2 w-full" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Rocket className="h-5 w-5 text-primary" />
          Getting Started
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {completedCount} of {steps.length} steps completed
          </p>
        </div>

        {/* All complete celebration */}
        {allComplete && (
          <div className="rounded-lg bg-primary/10 p-4 text-center">
            <p className="font-medium text-primary">🎉 All done! You're all set up.</p>
            <p className="text-sm text-muted-foreground">
              This checklist will disappear shortly.
            </p>
          </div>
        )}

        {/* Steps list */}
        {!allComplete && (
          <div className="space-y-2">
            {steps.map((step) => {
              const StepIcon = step.icon;

              if (step.isComplete) {
                return (
                  <div
                    key={step.id}
                    className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3"
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-through text-muted-foreground">
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                    <span className="text-xs font-medium text-primary">Done</span>
                  </div>
                );
              }

              return (
                <Link
                  key={step.id}
                  to={step.href}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent hover:border-primary/30"
                >
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
