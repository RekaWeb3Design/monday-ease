import { useState, useEffect } from "react";
import { Check, Copy, Eye, EyeOff, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClients } from "@/hooks/useClients";
import { useBoardConfigs } from "@/hooks/useBoardConfigs";
import { toast } from "sonner";
import type { ClientWithAccessCount, ClientBoardAccess } from "@/types";

interface EditClientDialogProps {
  client: ClientWithAccessCount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CLIENT_TYPES = [
  "Real Estate",
  "Marketing Agency",
  "Construction",
  "IT Services",
  "Consulting",
  "Other",
];

interface BoardSelection {
  id: string;
  name: string;
  selected: boolean;
  filterValue: string;
}

export function EditClientDialog({
  client,
  open,
  onOpenChange,
}: EditClientDialogProps) {
  const {
    updateClient,
    isUpdating,
    regeneratePassword,
    isRegenerating,
    fetchClientBoardAccess,
    updateBoardAccess,
    isUpdatingAccess,
    getClientPassword,
  } = useClients();
  const { configs: boardConfigs } = useBoardConfigs();

  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    phone: "",
    clientType: "",
    notes: "",
    status: "active" as "active" | "inactive" | "archived",
  });
  const [boards, setBoards] = useState<BoardSelection[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [currentPassword, setCurrentPassword] = useState<string | null>(null);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  // Initialize form when client changes
  useEffect(() => {
    if (client && open) {
      setFormData({
        companyName: client.company_name,
        contactName: client.contact_name,
        contactEmail: client.contact_email,
        phone: client.phone || "",
        clientType: client.client_type || "",
        notes: client.notes || "",
        status: client.status,
      });

      // Load board access
      loadBoardAccess();
    }
  }, [client, open]);

  // Re-load boards when boardConfigs changes (handles async loading)
  useEffect(() => {
    if (open && boardConfigs.length > 0 && boards.length === 0 && !loadingAccess) {
      loadBoardAccess();
    }
  }, [boardConfigs, open]);

  const loadBoardAccess = async () => {
    if (!client) return;
    setLoadingAccess(true);

    try {
      const access = await fetchClientBoardAccess(client.id);
      const accessMap = new Map(
        access.map((a) => [a.board_config_id, a.filter_value || ""])
      );

      setBoards(
        boardConfigs.map((config) => ({
          id: config.id,
          name: config.board_name,
          selected: accessMap.has(config.id),
          filterValue: accessMap.get(config.id) || "",
        }))
      );
    } catch (error) {
      console.error("Error loading board access:", error);
      toast.error("Failed to load board access");
    } finally {
      setLoadingAccess(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!formData.companyName.trim() || !formData.contactName.trim() || !formData.contactEmail.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    await updateClient({
      id: client.id,
      updates: {
        companyName: formData.companyName.trim(),
        contactName: formData.contactName.trim(),
        contactEmail: formData.contactEmail.trim(),
        phone: formData.phone.trim() || null,
        clientType: formData.clientType || null,
        notes: formData.notes.trim() || null,
        status: formData.status,
      },
    });
  };

  const handleBoardToggle = (boardId: string) => {
    setBoards(
      boards.map((b) =>
        b.id === boardId ? { ...b, selected: !b.selected } : b
      )
    );
  };

  const handleFilterChange = (boardId: string, value: string) => {
    setBoards(
      boards.map((b) =>
        b.id === boardId ? { ...b, filterValue: value } : b
      )
    );
  };

  const handleSaveBoards = async () => {
    const selectedBoards = boards
      .filter((b) => b.selected)
      .map((b) => ({
        boardConfigId: b.id,
        filterValue: b.filterValue || null,
      }));

    await updateBoardAccess({
      clientId: client.id,
      boardConfigs: selectedBoards,
    });
  };

  const handleRegeneratePassword = async () => {
    try {
      const result = await regeneratePassword(client.id);
      setNewPassword(result.password);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const copyPassword = async () => {
    if (!newPassword) return;
    await navigator.clipboard.writeText(newPassword);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
    toast.success("Password copied to clipboard");
  };

  const handleViewPassword = async () => {
    try {
      setIsLoadingPassword(true);
      const result = await getClientPassword(client.id);
      setCurrentPassword(result.password);
      setShowPassword(true);
    } catch (error) {
      console.error("Error fetching password:", error);
      toast.error("Failed to fetch password");
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleHidePassword = () => {
    setCurrentPassword(null);
    setShowPassword(false);
  };

  const copyCurrentPassword = async () => {
    if (!currentPassword) return;
    await navigator.clipboard.writeText(currentPassword);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
    toast.success("Password copied to clipboard");
  };

  const copyUrl = async () => {
    const url = `${window.location.origin}/c/${client.slug}`;
    await navigator.clipboard.writeText(url);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
    toast.success("URL copied to clipboard");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setNewPassword(null);
      setPasswordCopied(false);
      setCurrentPassword(null);
      setShowPassword(false);
      setUrlCopied(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>
            Update client details and board access for {client.company_name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="boards">Boards</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name *</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) =>
                  setFormData({ ...formData, contactName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) =>
                  setFormData({ ...formData, contactEmail: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientType">Client Type</Label>
              <Select
                value={formData.clientType}
                onValueChange={(value) =>
                  setFormData({ ...formData, clientType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a type..." />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "active" | "inactive" | "archived") =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value.slice(0, 500) })
                }
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {formData.notes.length}/500 characters
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveDetails} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Details"
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Boards Tab */}
          <TabsContent value="boards" className="space-y-4 mt-4">
            {loadingAccess ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : boardConfigs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-muted-foreground">
                    No boards configured yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {boards.map((board) => (
                  <Card
                    key={board.id}
                    className={`cursor-pointer transition-colors ${
                      board.selected ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => handleBoardToggle(board.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={board.selected}
                          onCheckedChange={() => handleBoardToggle(board.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 space-y-2">
                          <p className="font-medium">{board.name}</p>
                          {board.selected && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Label
                                htmlFor={`filter-${board.id}`}
                                className="text-xs text-muted-foreground"
                              >
                                Filter Value (optional)
                              </Label>
                              <Input
                                id={`filter-${board.id}`}
                                value={board.filterValue}
                                onChange={(e) =>
                                  handleFilterChange(board.id, e.target.value)
                                }
                                placeholder="e.g., Client Name"
                                className="mt-1"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSaveBoards}
                disabled={isUpdatingAccess || loadingAccess}
              >
                {isUpdatingAccess ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Board Access"
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4 mt-4">
            {/* Dashboard URL Section */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Dashboard URL</h4>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${window.location.origin}/c/${client.slug}`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyUrl}>
                    {urlCopied ? (
                      <Check className="h-4 w-4 text-[hsl(var(--monday-green))]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(`${window.location.origin}/c/${client.slug}`, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Password Section */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Current Password</h4>
                {showPassword && currentPassword ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={currentPassword}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button variant="outline" size="icon" onClick={copyCurrentPassword}>
                        {passwordCopied ? (
                          <Check className="h-4 w-4 text-[hsl(var(--monday-green))]" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="outline" size="icon" onClick={handleHidePassword}>
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleViewPassword}
                    disabled={isLoadingPassword}
                  >
                    {isLoadingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Show Password
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Regenerate Password Section */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Regenerate Password</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  This will create a new password. The current password will stop working immediately.
                </p>
                {newPassword ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={newPassword}
                        readOnly
                        className="font-mono text-sm bg-[hsl(var(--monday-yellow))]/20"
                      />
                      <Button variant="outline" size="icon" onClick={copyPassword}>
                        {passwordCopied ? (
                          <Check className="h-4 w-4 text-[hsl(var(--monday-green))]" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-destructive">
                      ⚠️ Save this password now. You won't be able to see it again.
                    </p>
                  </div>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" disabled={isRegenerating}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate Password
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Regenerate Password?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will create a new password for this client. Their
                          current password will stop working immediately. You'll
                          need to share the new password with them.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRegeneratePassword}>
                          {isRegenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Regenerating...
                            </>
                          ) : (
                            "Regenerate"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
