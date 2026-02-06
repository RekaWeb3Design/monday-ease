import { useState } from "react";
import { Building2, Copy, Edit, Trash2, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useClients } from "@/hooks/useClients";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import type { ClientWithAccessCount } from "@/types";

export default function Clients() {
  const { clients, isLoading, deleteClient, isDeleting } = useClients();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithAccessCount | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientWithAccessCount | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-[hsl(var(--monday-green))] text-white hover:bg-[hsl(var(--monday-green))]">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "archived":
        return <Badge variant="destructive">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCopyUrl = (slug: string) => {
    const url = `${window.location.origin}/c/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Dashboard URL copied to clipboard");
  };

  const handleDelete = async () => {
    if (!deletingClient) return;
    await deleteClient(deletingClient.id);
    setDeletingClient(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground">
            Manage external client access to your boards
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Client List */}
      {clients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No clients yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Create your first client to share board data externally through
              password-protected dashboards.
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {client.company_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {client.contact_name} • {client.contact_email}
                    </p>
                  </div>
                  {getStatusBadge(client.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Boards:</span>
                  <span className="font-medium">{client.board_access_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Login:</span>
                  <span className="font-medium">
                    {client.last_login_at
                      ? format(new Date(client.last_login_at), "MMM d, yyyy")
                      : "Never"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleCopyUrl(client.slug)}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy URL
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(`${window.location.origin}/c/${client.slug}`, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingClient(client)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeletingClient(client)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Client Dialog */}
      <AddClientDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      {/* Edit Client Dialog */}
      {editingClient && (
        <EditClientDialog
          client={editingClient}
          open={!!editingClient}
          onOpenChange={(open) => !open && setEditingClient(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingClient} onOpenChange={(open) => !open && setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingClient?.company_name}? This
              will revoke their dashboard access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
