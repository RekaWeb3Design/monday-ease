import { useState, useEffect, useMemo } from "react";
import { Loader2, ChevronLeft, ChevronRight, Check, Info, ChevronsUpDown, User, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMondayBoards } from "@/hooks/useMondayBoards";
import { useBoardConfigs } from "@/hooks/useBoardConfigs";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { useMondayUsers } from "@/hooks/useMondayUsers";
import { cn } from "@/lib/utils";
import type { MondayBoard, MondayColumn, OrganizationMember } from "@/types";

interface AddBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;

export function AddBoardDialog({ open, onOpenChange, onSuccess }: AddBoardDialogProps) {
  const { boards, isLoading: boardsLoading, fetchBoards } = useMondayBoards();
  const { createConfig } = useBoardConfigs();
  const { members } = useOrganizationMembers();
  const { users: mondayUsers, isLoading: usersLoading, fetchUsers } = useMondayUsers();

  // Step state
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Selected board
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [selectedBoard, setSelectedBoard] = useState<MondayBoard | null>(null);

  // Step 2: Column configuration
  const [filterColumnId, setFilterColumnId] = useState<string>("");
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  // Step 3: Member mappings
  const [memberMappings, setMemberMappings] = useState<Record<string, string>>({});
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

  // Get the selected filter column to determine type
  const selectedFilterColumn = useMemo(() => {
    if (!selectedBoard || !filterColumnId || filterColumnId === 'none') return null;
    return selectedBoard.columns.find((c) => c.id === filterColumnId) || null;
  }, [selectedBoard, filterColumnId]);

  // More robust person column detection
  const isPersonColumn = useMemo(() => {
    if (!selectedFilterColumn) return false;
    const type = selectedFilterColumn.type?.toLowerCase() || '';
    const id = filterColumnId?.toLowerCase() || '';
    return type.includes('person') || type.includes('people') || 
           id.includes('person') || id.includes('people');
  }, [selectedFilterColumn, filterColumnId]);

  // Fetch boards when dialog opens
  useEffect(() => {
    if (open && boards.length === 0) {
      fetchBoards();
    }
  }, [open, boards.length, fetchBoards]);

  // Update selected board when selection changes
  useEffect(() => {
    if (selectedBoardId) {
      const board = boards.find((b) => b.id === selectedBoardId);
      setSelectedBoard(board || null);
    } else {
      setSelectedBoard(null);
    }
  }, [selectedBoardId, boards]);

  // Fetch Monday users when entering step 3 with a person column
  useEffect(() => {
    if (step === 3 && isPersonColumn && mondayUsers.length === 0) {
      fetchUsers();
    }
  }, [step, isPersonColumn, mondayUsers.length, fetchUsers]);

  // Pre-fill member mappings with display names when entering step 3
  useEffect(() => {
    if (step === 3) {
      const prefilled: Record<string, string> = {};
      mappableMembers.forEach((member) => {
        if (!memberMappings[member.id] && member.display_name) {
          prefilled[member.id] = member.display_name;
        }
      });
      if (Object.keys(prefilled).length > 0) {
        setMemberMappings((prev) => ({ ...prefilled, ...prev }));
      }
    }
  }, [step]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedBoardId("");
      setSelectedBoard(null);
      setFilterColumnId("");
      setVisibleColumns([]);
      setMemberMappings({});
      setOpenPopovers({});
    }
  }, [open]);

  const handleVisibleColumnToggle = (columnId: string) => {
    setVisibleColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleMemberMappingChange = (memberId: string, value: string) => {
    setMemberMappings((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedBoard) return;

    setIsSubmitting(true);

    const filterColumn = selectedBoard.columns.find((c) => c.id === filterColumnId);

    const success = await createConfig({
      monday_board_id: selectedBoard.id,
      board_name: selectedBoard.name,
      filter_column_id: filterColumnId === 'none' ? null : filterColumnId || null,
      filter_column_name: filterColumn?.title || null,
      filter_column_type: filterColumn?.type || null,
      visible_columns: visibleColumns,
      memberMappings: Object.entries(memberMappings)
        .filter(([_, value]) => value.trim() !== "")
        .map(([member_id, filter_value]) => ({ member_id, filter_value })),
    });

    setIsSubmitting(false);

    if (success) {
      onOpenChange(false);
      onSuccess();
    }
  };

  const canProceedStep1 = !!selectedBoardId;
  const canProceedStep2 = true; // Column config is optional
  const canSubmit = !!selectedBoard;

  // Filter members to show (exclude owner for mapping since they have full access)
  // Also deduplicate by member id
  const mappableMembers = useMemo(() => {
    const seen = new Set<string>();
    return members.filter((m) => {
      if (m.role === "owner" || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [members]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Board Configuration</DialogTitle>
          <DialogDescription>
            Step {step} of 3:{" "}
            {step === 1
              ? "Select a Monday.com board"
              : step === 2
              ? "Configure columns"
              : "Map members to filter values"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full transition-colors ${
                s === step
                  ? "bg-primary"
                  : s < step
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="min-h-[300px]">
          {/* Step 1: Select Board */}
          {step === 1 && (
            <div className="space-y-4">
              {boardsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : boards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No boards found. Make sure Monday.com is connected.
                  </p>
                  <Button variant="outline" onClick={fetchBoards}>
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Select Board</Label>
                  <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a board..." />
                    </SelectTrigger>
                    <SelectContent>
                      {boards.map((board) => (
                        <SelectItem key={board.id} value={board.id}>
                          <div className="flex items-center gap-2">
                            <span>{board.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({board.board_kind})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBoard && (
                    <p className="text-sm text-muted-foreground">
                      {selectedBoard.columns.length} columns available
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Configure Columns */}
          {step === 2 && selectedBoard && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Filter Column (Optional)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px]">
                        <p>Choose which column determines what each member sees. For example, if you select 'Assigned Agent', members will only see rows where they are assigned. Leave as 'None' if all members should see all rows.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select value={filterColumnId} onValueChange={setFilterColumnId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (show all rows)</SelectItem>
                    {selectedBoard.columns.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.title} ({col.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Visible Columns (Optional)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px]">
                        <p>Select which columns members can see in their dashboard. Unselected columns will be hidden. Leave all unchecked to show every column.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <ScrollArea className="h-[180px] rounded-md border p-3">
                  <div className="space-y-2">
                    {selectedBoard.columns.map((col) => (
                      <div key={col.id} className="flex items-center gap-2">
                        <Checkbox
                          id={col.id}
                          checked={visibleColumns.includes(col.id)}
                          onCheckedChange={() => handleVisibleColumnToggle(col.id)}
                        />
                        <label
                          htmlFor={col.id}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {col.title}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({col.type})
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Step 3: Map Members */}
          {step === 3 && (
            <div className="space-y-4">
              {mappableMembers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No team members to configure. Invite members first.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-muted-foreground">
                        {isPersonColumn
                          ? "Select which person each member represents"
                          : "Enter the exact text value to filter by for each member"}
                      </p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[280px]">
                            {isPersonColumn ? (
                              <p>Choose from your organization members or Monday.com users. This determines which board items they can see based on the People column.</p>
                            ) : (
                              <p>Enter the exact value that matches this member in the Filter Column. For example, if the filter column value is 'Priya Desai', enter that exact text here.</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    {isPersonColumn && usersLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading users...
                      </div>
                    )}
                  </div>
                  <ScrollArea className="h-[240px] rounded-md border p-3">
                    <div className="space-y-3">
                      {mappableMembers.map((member) => (
                        <div key={member.id} className="space-y-1.5">
                          <Label className="text-sm font-normal flex flex-col">
                            <span>{member.display_name || member.email}</span>
                            {member.display_name && (
                              <span className="text-xs text-muted-foreground font-normal">{member.email}</span>
                            )}
                          </Label>
                          {isPersonColumn ? (
                            <Popover
                              open={openPopovers[member.id] || false}
                              onOpenChange={(isOpen) =>
                                setOpenPopovers((prev) => ({ ...prev, [member.id]: isOpen }))
                              }
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between font-normal"
                                  disabled={usersLoading}
                                >
                                  {memberMappings[member.id] || "Select Monday.com user..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[340px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search users..." />
                                  <CommandList>
                                    <CommandEmpty>No user found.</CommandEmpty>
                                    
                                    {/* Organization Members */}
                                    {mappableMembers.length > 0 && (
                                      <CommandGroup heading="Organization Members">
                                        {mappableMembers.map((orgMember) => (
                                          <CommandItem
                                            key={`org-${orgMember.id}`}
                                            value={`org ${orgMember.display_name || ''} ${orgMember.email}`}
                                            onSelect={() => {
                                              handleMemberMappingChange(member.id, orgMember.display_name || orgMember.email);
                                              setOpenPopovers((prev) => ({ ...prev, [member.id]: false }));
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                memberMappings[member.id] === orgMember.display_name
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              )}
                                            />
                                            <Users className="mr-2 h-4 w-4 text-primary" />
                                            <div className="flex flex-col">
                                              <span>{orgMember.display_name || orgMember.email}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {orgMember.email}
                                              </span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    )}
                                    
                                    <CommandSeparator />
                                    
                                    {/* Monday.com Users */}
                                    {mondayUsers.length > 0 && (
                                      <CommandGroup heading="Monday.com Users">
                                        {mondayUsers.map((user) => (
                                          <CommandItem
                                            key={`monday-${user.id}`}
                                            value={`monday ${user.name} ${user.email || ''}`}
                                            onSelect={() => {
                                              handleMemberMappingChange(member.id, user.name);
                                              setOpenPopovers((prev) => ({ ...prev, [member.id]: false }));
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                memberMappings[member.id] === user.name
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              )}
                                            />
                                            <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <div className="flex flex-col">
                                              <span>{user.name}</span>
                                              {user.email && (
                                                <span className="text-xs text-muted-foreground">
                                                  {user.email}
                                                </span>
                                              )}
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    )}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <Input
                              placeholder="Enter exact filter value..."
                              value={memberMappings[member.id] || ""}
                              onChange={(e) =>
                                handleMemberMappingChange(member.id, e.target.value)
                              }
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep((s) => (s - 1) as Step)}
                disabled={isSubmitting}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={step === 1 && !canProceedStep1}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
