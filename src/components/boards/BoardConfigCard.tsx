import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2, Users, Columns, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { BoardConfigWithAccess, OrganizationMember } from "@/types";

interface BoardConfigCardProps {
  config: BoardConfigWithAccess;
  members: OrganizationMember[];
  onEdit: () => void;
  onDelete: () => void;
}

export function BoardConfigCard({ config, members, onEdit, onDelete }: BoardConfigCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getMemberName = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    return member?.display_name || member?.email || "Unknown";
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{config.board_name}</CardTitle>
            <Badge variant={config.is_active ? "default" : "secondary"}>
              {config.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Board Configuration</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{config.board_name}"? This will remove all
                    member access mappings. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={onDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filter Column:</span>
            <span className="font-medium text-foreground">
              {config.filter_column_name || "Not set"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Columns className="h-4 w-4" />
            <span>Visible Columns:</span>
            <span className="font-medium text-foreground">
              {config.visible_columns.length > 0
                ? `${config.visible_columns.length} selected`
                : "All"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Members with Access:</span>
            <span className="font-medium text-foreground">{config.memberAccess.length}</span>
          </div>
        </div>

        {config.memberAccess.length > 0 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between" size="sm">
                <span>Member Mappings</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                {config.memberAccess.map((access) => (
                  <div
                    key={access.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {getMemberName(access.member_id)}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {access.filter_value}
                    </Badge>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
