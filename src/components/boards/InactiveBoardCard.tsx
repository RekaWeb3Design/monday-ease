import { Info, Filter, Columns, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BoardConfigWithAccess } from "@/types";

interface InactiveBoardCardProps {
  config: BoardConfigWithAccess;
}

export function InactiveBoardCard({ config }: InactiveBoardCardProps) {
  return (
    <Card className="overflow-hidden border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{config.board_name}</CardTitle>
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              Other Account
            </Badge>
          </div>
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

        <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Connect to this Monday.com account to manage this board</span>
        </div>
      </CardContent>
    </Card>
  );
}
