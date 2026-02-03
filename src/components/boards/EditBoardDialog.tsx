import { useState, useEffect, useMemo } from "react";
import { Loader2, Check, Info, ChevronsUpDown, User, Users, AlertTriangle } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMondayBoards } from "@/hooks/useMondayBoards";
import { useBoardConfigs } from "@/hooks/useBoardConfigs";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { useMondayUsers } from "@/hooks/useMondayUsers";
import { cn } from "@/lib/utils";
import type { BoardConfigWithAccess, MondayBoard } from "@/types";

interface EditBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: BoardConfigWithAccess;
  onSuccess: () => void;
}

export function EditBoardDialog({ open, onOpenChange, config, onSuccess }: EditBoardDialogProps) {
  const { boards, isLoading: boardsLoading, fetchBoards } = useMondayBoards();
  const { updateConfig } = useBoardConfigs();
  const { members } = useOrganizationMembers();
  const { users: mondayUsers, isLoading: usersLoading, fetchUsers } = useMondayUsers();

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state - initialized from config
  const [filterColumnId, setFilterColumnId] = useState<string>(config.filter_column_id || "none");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(config.visible_columns || []);
  const [memberMappings, setMemberMappings] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    config.memberAccess.forEach(access => {
      initial[access.member_id] = access.filter_value;
    });
    return initial;
  });
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

  // Find the board from Monday.com data
  const selectedBoard = useMemo(() => {
    return boards.find(b => b.id === config.monday_board_id) || null;
  }, [boards, config.monday_board_id]);

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

  // Fetch Monday users when we have a person column
  useEffect(() => {
    if (open && isPersonColumn && mondayUsers.length === 0) {
      fetchUsers();
    }
  }, [open, isPersonColumn, mondayUsers.length, fetchUsers]);

  // Reset form when config changes or dialog opens
  useEffect(() => {
    if (open) {
      setFilterColumnId(config.filter_column_id || "none");
      setVisibleColumns(config.visible_columns || []);
      const initial: Record<string, string> = {};
      config.memberAccess.forEach(access => {
        initial[access.member_id] = access.filter_value;
      });
      setMemberMappings(initial);
      setOpenPopovers({});
    }
  }, [open, config]);

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
    setIsSubmitting(true);

    const filterColumn = selectedBoard?.columns.find((c) => c.id === filterColumnId);

    const success = await updateConfig(config.id, {
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

  // Filter members to show (exclude owner for mapping since they have full access)
  const mappableMembers = useMemo(() => {
    const seen = new Set<string>();
    return members.filter((m) => {
      if (m.role === "owner" || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [members]);

  const boardNotFound = !boardsLoading && boards.length > 0 && !selectedBoard;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Board Configuration</DialogTitle>
          <DialogDescription>{config.board_name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning if board not found in Monday.com */}
          {boardNotFound && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This board is no longer accessible in Monday.com. You can still edit member mappings.
              </AlertDescription>
            </Alert>
          )}

          {/* Filter Column Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Filter Column</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px]">
                    <p>Choose which column determines what each member sees.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {boardsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading columns...
              </div>
            ) : selectedBoard ? (
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
            ) : (
              <p className="text-sm text-muted-foreground">
                Current: {config.filter_column_name || "None"}
              </p>
            )}
          </div>

          {/* Visible Columns Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Visible Columns</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px]">
                    <p>Select which columns members can see. Leave all unchecked to show every column.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {boardsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading columns...
              </div>
            ) : selectedBoard ? (
              <ScrollArea className="h-[140px] rounded-md border p-3">
                <div className="space-y-2">
                  {selectedBoard.columns.map((col) => (
                    <div key={col.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-${col.id}`}
                        checked={visibleColumns.includes(col.id)}
                        onCheckedChange={() => handleVisibleColumnToggle(col.id)}
                      />
                      <label
                        htmlFor={`edit-${col.id}`}
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
            ) : (
              <p className="text-sm text-muted-foreground">
                Current: {visibleColumns.length > 0 ? `${visibleColumns.length} selected` : "All columns"}
              </p>
            )}
          </div>

          {/* Member Mappings Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Member Mappings</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px]">
                    <p>Set the filter value for each member to determine which rows they can see.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {mappableMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No team members to configure. Invite members first.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {isPersonColumn
                    ? "Select which person each member represents"
                    : "Enter the exact text value to filter by for each member"}
                </p>
                {isPersonColumn && usersLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading users...
                  </div>
                )}
                <ScrollArea className="h-[180px] rounded-md border p-3">
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
                                {memberMappings[member.id] || "Select user..."}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
