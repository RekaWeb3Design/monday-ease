import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2, Users, Columns, Filter, Building2, MapPin } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { BoardConfigWithAccess, OrganizationMember } from "@/types";

interface BoardConfigCardProps {
  config: BoardConfigWithAccess;
  members: OrganizationMember[];
  onEdit: () => void;
  onDelete: () => void;
}

export function BoardConfigCard({ config, members, onEdit, onDelete }: BoardConfigCardProps) {
  const [isMemberExpanded, setIsMemberExpanded] = useState(false);
  const [isClientExpanded, setIsClientExpanded] = useState(false);

  const getMemberName = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    return member?.display_name || member?.email || "Unknown";
  };

  const getAudienceBadge = () => {
    if (!config.target_audience) return null;
    
    const audienceStyles: Record<string, { border: string; text: string }> = {
      team: { border: 'hsl(210, 90%, 50%)', text: 'hsl(210, 90%, 40%)' },
      clients: { border: 'hsl(142, 76%, 40%)', text: 'hsl(142, 76%, 35%)' },
      both: { border: 'hsl(270, 60%, 55%)', text: 'hsl(270, 60%, 45%)' },
    };
    
    const style = audienceStyles[config.target_audience];
    
    return (
      <Badge 
        variant="outline"
        style={{ borderColor: style?.border, color: style?.text }}
      >
        {config.target_audience === 'team' ? 'Team' : 
         config.target_audience === 'clients' ? 'Clients' : 'Both'}
      </Badge>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{config.board_name}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={config.is_active ? "default" : "secondary"}>
                {config.is_active ? "Active" : "Inactive"}
              </Badge>
              {getAudienceBadge()}
              {(config.workspace_name || config.monday_account_id) && (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-muted">
                  <MapPin className="mr-1 h-3 w-3" />
                  {config.workspace_name || config.monday_account_id}
                </Badge>
              )}
            </div>
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
                    member and client access mappings. This action cannot be undone.
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
          {(config.target_audience === 'team' || config.target_audience === 'both' || !config.target_audience) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Members with Access:</span>
              <span className="font-medium text-foreground">{config.memberAccess.length}</span>
            </div>
          )}
          {(config.target_audience === 'clients' || config.target_audience === 'both') && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Clients with Access:</span>
              <span className="font-medium text-foreground">{config.clientAccess?.length || 0}</span>
            </div>
          )}
        </div>

        {config.memberAccess.length > 0 && (
          <Collapsible open={isMemberExpanded} onOpenChange={setIsMemberExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between" size="sm">
                <span>Member Mappings</span>
                {isMemberExpanded ? (
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
                    className="flex items-center justify-between text-sm gap-2"
                  >
                    <span className="text-muted-foreground shrink-0">
                      {getMemberName(access.member_id)}
                    </span>
                    {access.filter_value ? (
                      <div className="flex flex-wrap gap-1 justify-end">
                        {access.filter_value.split(',').map((v, i) => (
                          <Badge key={i} variant="secondary" className="text-xs font-normal">
                            {v.trim()}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">All rows</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {config.clientAccess && config.clientAccess.length > 0 && (
          <Collapsible open={isClientExpanded} onOpenChange={setIsClientExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between" size="sm">
                <span>Client Mappings</span>
                {isClientExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                {config.clientAccess.map((access) => (
                  <div
                    key={access.id}
                    className="flex items-center justify-between text-sm gap-2"
                  >
                    <span className="text-muted-foreground shrink-0">
                      {access.clients?.company_name || "Unknown Client"}
                    </span>
                    {access.filter_value ? (
                      <div className="flex flex-wrap gap-1 justify-end">
                        {access.filter_value.split(',').map((v, i) => (
                          <Badge key={i} variant="secondary" className="text-xs font-normal">
                            {v.trim()}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">All rows</Badge>
                    )}
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
