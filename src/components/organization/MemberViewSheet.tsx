import { useMemo, useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Settings, RefreshCw, ClipboardList, X, MapPin } from "lucide-react";
import { useMemberTasksForMember } from "@/hooks/useMemberTasksForMember";
import { TaskStats } from "@/components/member/TaskStats";
import { format } from "date-fns";
import type { OrganizationMember, MondayTask, MondayColumnValue } from "@/types";

interface MemberViewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  member: OrganizationMember | null;
  onEditBoardAccess: (member: OrganizationMember) => void;
}

interface BoardGroup {
  boardId: string;
  boardName: string;
  tasks: MondayTask[];
}

interface AccountGroup {
  accountId: string;
  accountName: string;
  boards: BoardGroup[];
  taskCount: number;
}

const getBoardColumns = (boardTasks: MondayTask[]) => {
  if (boardTasks.length === 0) return [];
  const columnMap = new Map<string, { id: string; title: string; type: string }>();
  for (const task of boardTasks) {
    for (const cv of task.column_values) {
      if (!columnMap.has(cv.id)) {
        columnMap.set(cv.id, { id: cv.id, title: cv.title, type: cv.type });
      }
    }
  }
  return Array.from(columnMap.values());
};

const renderCellValue = (col: MondayColumnValue) => {
  if (!col.text) return <span className="text-muted-foreground">—</span>;

  if (col.type === "status" || col.type === "color") {
    const labelColor = col.value?.label_style?.color;
    return (
      <Badge
        className="text-xs border-none"
        style={labelColor ? {
          backgroundColor: labelColor,
          color: "white",
        } : undefined}
      >
        {col.text}
      </Badge>
    );
  }

  if (col.type === "date") {
    try {
      return format(new Date(col.text), "MMM dd");
    } catch {
      return col.text;
    }
  }

  return <span className="truncate max-w-[200px] block">{col.text}</span>;
};

function BoardTable({ tasks }: { tasks: MondayTask[] }) {
  const columns = getBoardColumns(tasks);

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No tasks assigned on this board
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">Name</TableHead>
            {columns.map((col) => (
              <TableHead key={col.id} className="min-w-[100px]">{col.title}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{task.name}</TableCell>
              {columns.map((col) => {
                const cv = task.column_values.find((c) => c.id === col.id);
                return (
                  <TableCell key={col.id}>
                    {cv ? renderCellValue(cv) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
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

  // Group tasks by account, then by board within each account
  const accountGroups: AccountGroup[] = useMemo(() => {
    // First group tasks by board
    const boardMap: Record<string, { boardName: string; accountId: string; accountName: string; tasks: MondayTask[] }> = {};
    for (const task of tasks) {
      const key = task.board_id;
      if (!boardMap[key]) {
        boardMap[key] = {
          boardName: task.board_name,
          accountId: task.monday_account_id || "__default__",
          accountName: task.account_name || "",
          tasks: [],
        };
      }
      boardMap[key].tasks.push(task);
    }

    // Then group boards by account
    const accountMap: Record<string, { accountName: string; boards: BoardGroup[] }> = {};
    for (const [boardId, data] of Object.entries(boardMap)) {
      const accKey = data.accountId;
      if (!accountMap[accKey]) {
        accountMap[accKey] = { accountName: data.accountName, boards: [] };
      }
      accountMap[accKey].boards.push({
        boardId,
        boardName: data.boardName,
        tasks: data.tasks,
      });
    }

    return Object.entries(accountMap).map(([accountId, data]) => ({
      accountId,
      accountName: data.accountName,
      boards: data.boards,
      taskCount: data.boards.reduce((sum, b) => sum + b.tasks.length, 0),
    }));
  }, [tasks]);

  const hasMultipleAccounts = accountGroups.length > 1;

  // Flatten all boards for tab navigation
  const allBoards = useMemo(
    () => accountGroups.flatMap((ag) => ag.boards),
    [accountGroups]
  );

  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (allBoards.length > 0 && !activeTab) {
      setActiveTab(allBoards[0].boardId);
    }
  }, [allBoards, activeTab]);

  // Reset tab when sheet closes
  useEffect(() => {
    if (!isOpen) setActiveTab("");
  }, [isOpen]);

  const activeBoard = allBoards.find((b) => b.boardId === activeTab);
  const activeTasks = activeBoard?.tasks || tasks;

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
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

            {/* Stats row — scoped to active tab */}
            <TaskStats tasks={activeTasks} />

            {/* Tabbed table view or single table */}
            {allBoards.length === 1 ? (
              <>
                {accountGroups[0]?.accountName && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-muted">
                      <MapPin className="mr-1 h-3 w-3" />
                      {accountGroups[0].accountName}
                    </Badge>
                  </div>
                )}
                <BoardTable tasks={allBoards[0].tasks} />
              </>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full flex-wrap h-auto gap-1">
                  {hasMultipleAccounts ? (
                    accountGroups.map((account) => (
                      account.boards.map((group) => (
                        <TabsTrigger key={group.boardId} value={group.boardId} className="text-xs">
                          <span className="truncate max-w-[120px]">{group.boardName}</span>
                          <span className="ml-1 text-muted-foreground">({group.tasks.length})</span>
                        </TabsTrigger>
                      ))
                    ))
                  ) : (
                    allBoards.map((group) => (
                      <TabsTrigger key={group.boardId} value={group.boardId} className="text-xs">
                        {group.boardName} ({group.tasks.length})
                      </TabsTrigger>
                    ))
                  )}
                </TabsList>
                {allBoards.map((group) => {
                  const account = accountGroups.find((ag) => ag.boards.some((b) => b.boardId === group.boardId));
                  return (
                    <TabsContent key={group.boardId} value={group.boardId}>
                      {account?.accountName && (
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-muted">
                            <MapPin className="mr-1 h-3 w-3" />
                            {account.accountName}
                          </Badge>
                        </div>
                      )}
                      <BoardTable tasks={group.tasks} />
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
