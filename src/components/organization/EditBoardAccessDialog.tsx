import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

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

import type { OrganizationMember, BoardConfig, MemberBoardAccess } from "@/types";

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
  filterColumnName: string | null;
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

  const displayName = member?.display_name || member?.email?.split("@")[0] || "Member";

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
        // Fetch all active board configs for the organization
        const { data: boardConfigs, error: configError } = await supabase
          .from("board_configs")
          .select("id, board_name, filter_column_id, filter_column_name")
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
            filterColumnName: config.filter_column_name,
            filterValue: existing?.filterValue || "",
            existingAccessId: existing?.id || null,
          };
        });

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
                      <Input
                        id={`filter-${access.boardConfigId}`}
                        placeholder={`e.g., ${displayName}`}
                        value={access.filterValue}
                        onChange={(e) =>
                          handleFilterValueChange(access.boardConfigId, e.target.value)
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty to remove access to this board
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
