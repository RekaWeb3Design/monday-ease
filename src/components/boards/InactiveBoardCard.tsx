import { Filter, Columns, Users, Trash2, Unplug, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { BoardConfigWithAccess } from "@/types";

interface InactiveBoardCardProps {
  config: BoardConfigWithAccess;
  onDelete: () => void;
}

export function InactiveBoardCard({ config, onDelete }: InactiveBoardCardProps) {
  return (
    <Card className="overflow-hidden border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{config.board_name}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20">
                <Unplug className="mr-1 h-3 w-3" />
                Disconnected
              </Badge>
              {(config.workspace_name || config.monday_account_id) && (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-muted">
                  <MapPin className="mr-1 h-3 w-3" />
                  {config.workspace_name || config.monday_account_id}
                </Badge>
              )}
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-60 hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Board Configuration?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the "{config.board_name}" configuration.
                  This action cannot be undone.
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
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filter Column:</span>
            <span className="font-medium">
              {config.filter_column_name || "Not set"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Columns className="h-4 w-4" />
            <span>Visible Columns:</span>
            <span className="font-medium">
              {config.visible_columns.length > 0
                ? `${config.visible_columns.length} selected`
                : "All"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Members with Access:</span>
            <span className="font-medium">{config.memberAccess.length}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground italic">
          Reconnect this account to sync data.
        </p>
      </CardContent>
    </Card>
  );
}
