import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, RefreshCw, ClipboardList, X } from "lucide-react";
import { useMemberTasksForMember } from "@/hooks/useMemberTasksForMember";
import { TaskStats } from "@/components/member/TaskStats";
import { TaskCard } from "@/components/member/TaskCard";
import type { OrganizationMember } from "@/types";

interface MemberViewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  member: OrganizationMember | null;
  onEditBoardAccess: (member: OrganizationMember) => void;
}

export function MemberViewSheet({
  isOpen,
  onClose,
  member,
  onEditBoardAccess,
}: MemberViewSheetProps) {
  const { tasks, isLoading, error, refetch } = useMemberTasksForMember(
    isOpen && member ? member.id : null
  );

  const displayName = member?.display_name || member?.email?.split("@")[0] || "Member";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Viewing as</p>
              <SheetTitle className="text-xl">{displayName}</SheetTitle>
            </div>
            <div className="flex items-center gap-2">
              {member && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditBoardAccess(member)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Boards
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-6">
            {/* Stats skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            {/* Cards skeleton */}
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 rounded-lg border border-dashed p-8 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <ClipboardList className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">Unable to load tasks</h3>
              <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
            </div>
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 rounded-lg border border-dashed p-8 text-center">
            <div className="rounded-full bg-muted p-3">
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">No tasks assigned to this member</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Configure board access to assign tasks to this member.
              </p>
            </div>
            {member && (
              <Button
                onClick={() => onEditBoardAccess(member)}
                variant="outline"
                size="sm"
              >
                <Settings className="mr-2 h-4 w-4" />
                Configure Boards
              </Button>
            )}
          </div>
        )}

        {/* Tasks loaded successfully */}
        {!isLoading && tasks.length > 0 && (
          <div className="space-y-6">
            {/* Header with refresh */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {tasks.length} task{tasks.length !== 1 ? "s" : ""} assigned
              </p>
              <Button onClick={refetch} variant="ghost" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            {/* Stats row */}
            <TaskStats tasks={tasks} />

            {/* Task grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
