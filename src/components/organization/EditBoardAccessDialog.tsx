import { useState, useEffect, useMemo } from "react";
import { Loader2, AlertCircle, Check, ChevronsUpDown, User } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMondayUsers } from "@/hooks/useMondayUsers";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import type { OrganizationMember } from "@/types";

interface EditBoardAccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: OrganizationMember | null;
  organizationId: string;
  onSaved: () => void;
}

interface BoardAccessState {
  boardConfigId: string;
  boardName: string;
  filterColumnId: string | null;
  filterColumnName: string | null;
  filterColumnType: string | null;
  filterValue: string;
  existingAccessId: string | null;
}

export function EditBoardAccessDialog({
  isOpen,
  onClose,
  member,
  organizationId,
  onSaved,
}: EditBoardAccessDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [boardAccessList, setBoardAccessList] = useState<BoardAccessState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

  // Monday users for person column dropdowns
  const { users: mondayUsers, isLoading: usersLoading, fetchUsers } = useMondayUsers();

  const displayName = member?.display_name || member?.email?.split("@")[0] || "Member";

  // Helper to detect person column type (more permissive)
  const isPersonColumnType = (type: string | null, columnId: string | null, columnName: string | null): boolean => {
    // Check explicit type
    if (type) {
      const lowerType = type.toLowerCase();
      if (lowerType.includes('person') || lowerType.includes('people')) return true;
    }
    // Infer from column ID (Monday.com often encodes type in ID)
    if (columnId) {
      const lowerId = columnId.toLowerCase();
      if (lowerId.includes('person') || lowerId.includes('people')) return true;
    }
    // Infer from column name as fallback
    if (columnName) {
      const lowerName = columnName.toLowerCase();
      if (lowerName.includes('assigned') || lowerName.includes('agent') || 
          lowerName.includes('owner') || lowerName.includes('person')) return true;
    }
    return false;
  };

  // Check if any board has a person filter column
  const hasPersonColumn = useMemo(() => {
    return boardAccessList.some((access) => 
      isPersonColumnType(access.filterColumnType, access.filterColumnId, access.filterColumnName)
    );
  }, [boardAccessList]);

  // Fetch Monday users if needed
  useEffect(() => {
    if (isOpen && hasPersonColumn && mondayUsers.length === 0 && !usersLoading) {
      fetchUsers();
    }
  }, [isOpen, hasPersonColumn, mondayUsers.length, usersLoading, fetchUsers]);

  // Fetch board configs and member's current access
  useEffect(() => {
    if (!isOpen || !member) {
      setBoardAccessList([]);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch all active board configs for the organization (including filter_column_type)
        const { data: boardConfigs, error: configError } = await supabase
          .from("board_configs")
          .select("id, board_name, filter_column_id, filter_column_name, filter_column_type")
          .eq("organization_id", organizationId)
          .eq("is_active", true);

        if (configError) throw configError;

        // Fetch member's current board access
        const { data: memberAccess, error: accessError } = await supabase
          .from("member_board_access")
          .select("id, board_config_id, filter_value")
          .eq("member_id", member.id);

        if (accessError) throw accessError;

        // Create access map for quick lookup
        const accessMap = new Map<string, { id: string; filterValue: string }>();
        for (const access of memberAccess || []) {
          accessMap.set(access.board_config_id, {
            id: access.id,
            filterValue: access.filter_value,
          });
        }

        // Build board access state
        const accessList: BoardAccessState[] = (boardConfigs || []).map((config) => {
          const existing = accessMap.get(config.id);
          return {
            boardConfigId: config.id,
            boardName: config.board_name,
            filterColumnId: config.filter_column_id,
            filterColumnName: config.filter_column_name,
            filterColumnType: config.filter_column_type,
            filterValue: existing?.filterValue || "",
            existingAccessId: existing?.id || null,
          };
        });

        console.log("[EditBoardAccess] Board access list:", accessList);
        console.log("[EditBoardAccess] Has person column:", accessList.some((a) => 
          isPersonColumnType(a.filterColumnType, a.filterColumnId, a.filterColumnName)
        ));

        setBoardAccessList(accessList);
      } catch (err) {
        console.error("Error fetching board access data:", err);
        setError("Failed to load board configurations");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, member, organizationId]);

  // Handle filter value change
  const handleFilterValueChange = (boardConfigId: string, value: string) => {
    setBoardAccessList((prev) =>
      prev.map((item) =>
        item.boardConfigId === boardConfigId
          ? { ...item, filterValue: value }
          : item
      )
    );
  };

  // Toggle popover open state
  const togglePopover = (boardConfigId: string, open: boolean) => {
    setOpenPopovers((prev) => ({ ...prev, [boardConfigId]: open }));
  };

  // Save changes
  const handleSave = async () => {
    if (!member) return;

    setIsSaving(true);

    try {
      // Process each board access
      for (const access of boardAccessList) {
        const trimmedValue = access.filterValue.trim();

        if (access.existingAccessId) {
          // Update existing or delete if empty
          if (trimmedValue) {
            const { error } = await supabase
              .from("member_board_access")
              .update({ filter_value: trimmedValue })
              .eq("id", access.existingAccessId);

            if (error) throw error;
          } else {
            // Delete if filter value is empty
            const { error } = await supabase
              .from("member_board_access")
              .delete()
              .eq("id", access.existingAccessId);

            if (error) throw error;
          }
        } else if (trimmedValue) {
          // Insert new access if filter value provided
          const { error } = await supabase
            .from("member_board_access")
            .insert({
              board_config_id: access.boardConfigId,
              member_id: member.id,
              filter_value: trimmedValue,
            });

          if (error) throw error;
        }
      }

      toast.success("Board access updated", {
        description: `Updated board access for ${displayName}`,
      });

      onSaved();
      onClose();
    } catch (err) {
      console.error("Error saving board access:", err);
      toast.error("Failed to save changes", {
        description: "Please try again",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Check if this access item uses a person column
  const isPersonAccess = (access: BoardAccessState) => 
    isPersonColumnType(access.filterColumnType, access.filterColumnId, access.filterColumnName);

  // Render filter value input based on column type
  const renderFilterInput = (access: BoardAccessState) => {
    const isPerson = isPersonColumnType(access.filterColumnType, access.filterColumnId, access.filterColumnName);
    console.log(`[EditBoardAccess] Board "${access.boardName}" isPerson:`, isPerson, 
      `type:${access.filterColumnType} id:${access.filterColumnId} name:${access.filterColumnName}`);
    
    if (isPerson) {
      // Render Combobox for person columns
      const selectedUser = mondayUsers.find((u) => u.name === access.filterValue);
      const isOpen = openPopovers[access.boardConfigId] || false;

      return (
        <Popover open={isOpen} onOpenChange={(open) => togglePopover(access.boardConfigId, open)}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isOpen}
              className="w-full justify-between font-normal"
              disabled={usersLoading}
            >
              {usersLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading users...
                </span>
              ) : access.filterValue ? (
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {selectedUser ? `${selectedUser.name} (${selectedUser.email})` : access.filterValue}
                </span>
              ) : (
                <span className="text-muted-foreground">Select a person...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search users..." />
              <CommandList>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                  {/* Option to clear */}
                  <CommandItem
                    value="__clear__"
                    onSelect={() => {
                      handleFilterValueChange(access.boardConfigId, "");
                      togglePopover(access.boardConfigId, false);
                    }}
                  >
                    <span className="text-muted-foreground">None (remove access)</span>
                  </CommandItem>
                  {/* User options */}
                  {mondayUsers.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={`${user.name} ${user.email}`}
                      onSelect={() => {
                        handleFilterValueChange(access.boardConfigId, user.name);
                        togglePopover(access.boardConfigId, false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          access.filterValue === user.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }

    // Default: text input for other column types
    return (
      <Input
        id={`filter-${access.boardConfigId}`}
        placeholder={`e.g., ${displayName}`}
        value={access.filterValue}
        onChange={(e) => handleFilterValueChange(access.boardConfigId, e.target.value)}
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Board Access</DialogTitle>
          <DialogDescription>
            Configure which tasks {displayName} can see by setting filter values for each board.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[400px] overflow-y-auto">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          {/* Empty state - no boards configured */}
          {!isLoading && !error && boardAccessList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <p className="text-sm text-muted-foreground">
                No boards configured for this organization.
              </p>
              <p className="text-sm text-muted-foreground">
                Add boards in the Boards section first.
              </p>
            </div>
          )}

          {/* Board access list */}
          {!isLoading && !error && boardAccessList.length > 0 && (
            <div className="space-y-4">
              {boardAccessList.map((access) => (
                <Card key={access.boardConfigId}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{access.boardName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor={`filter-${access.boardConfigId}`}>
                        Filter Value
                        {access.filterColumnName && (
                          <span className="text-muted-foreground font-normal ml-1">
                            (matches "{access.filterColumnName}" column)
                          </span>
                        )}
                      </Label>
                      {renderFilterInput(access)}
                      <p className="text-xs text-muted-foreground">
                        {isPersonAccess(access)
                          ? "Select a person or leave empty to remove access"
                          : "Leave empty to remove access to this board"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || isSaving || boardAccessList.length === 0}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
