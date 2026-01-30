import { useState } from "react";
import { MoreHorizontal, Eye, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getIconByName } from "./IconPicker";
import type { CustomBoardView } from "@/types";

interface ViewCardProps {
  view: CustomBoardView;
  onToggleActive: (id: string, isActive: boolean) => void;
  onEdit: (view: CustomBoardView) => void;
  onDelete: (id: string) => void;
}

export function ViewCard({ view, onToggleActive, onEdit, onDelete }: ViewCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const IconComponent = getIconByName(view.icon);

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">{view.name}</CardTitle>
                {view.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                    {view.description}
                  </p>
                )}
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/board-views/${view.slug}`} className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Open View
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(view)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {view.monday_board_name || "Board"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {view.selected_columns.length} columns
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {view.is_active ? "Active" : "Inactive"}
              </span>
              <Switch
                checked={view.is_active}
                onCheckedChange={(checked) => onToggleActive(view.id, checked)}
                aria-label="Toggle view active state"
              />
            </div>
          </div>

          <div className="mt-4">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to={`/board-views/${view.slug}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open View
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete View</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{view.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(view.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
