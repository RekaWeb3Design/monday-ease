import { useState, useEffect } from "react";
import { Check, Copy, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { useClients } from "@/hooks/useClients";
import { useBoardConfigs } from "@/hooks/useBoardConfigs";
import { toast } from "sonner";
import type { CreateClientResponse } from "@/types";

interface AddClientDialogProps {
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

export function AddClientDialog({ open, onOpenChange }: AddClientDialogProps) {
  const { createClient, isCreating } = useClients();
  const { configs: boardConfigs, isLoading: loadingBoards } = useBoardConfigs();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    phone: "",
    clientType: "",
    notes: "",
  });
  const [boards, setBoards] = useState<BoardSelection[]>([]);
  const [result, setResult] = useState<CreateClientResponse | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  // Initialize boards when dialog is open and boardConfigs are loaded
  useEffect(() => {
    if (open && !loadingBoards && boardConfigs.length > 0) {
      setBoards(
        boardConfigs.map((config) => ({
          id: config.id,
          name: config.board_name,
          selected: false,
          filterValue: "",
        }))
      );
    }
  }, [open, boardConfigs, loadingBoards]);

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep(1);
      setFormData({
        companyName: "",
        contactName: "",
        contactEmail: "",
        phone: "",
        clientType: "",
        notes: "",
      });
      setBoards([]);
      setResult(null);
      setPasswordCopied(false);
      setUrlCopied(false);
    }
    onOpenChange(newOpen);
  };

  const handleNext = () => {
    if (step === 1) {
      // Validate step 1
      if (!formData.companyName.trim() || !formData.contactName.trim() || !formData.contactEmail.trim()) {
        toast.error("Please fill in all required fields");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
        toast.error("Please enter a valid email address");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
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

  const handleCreate = async () => {
    try {
      const selectedBoards = boards
        .filter((b) => b.selected)
        .map((b) => ({
          boardConfigId: b.id,
          filterValue: b.filterValue || null,
        }));

      const response = await createClient({
        companyName: formData.companyName.trim(),
        contactName: formData.contactName.trim(),
        contactEmail: formData.contactEmail.trim(),
        phone: formData.phone.trim() || null,
        clientType: formData.clientType || null,
        notes: formData.notes.trim() || null,
        boardConfigs: selectedBoards,
      });

      setResult(response);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const copyToClipboard = async (text: string, type: "password" | "url") => {
    await navigator.clipboard.writeText(text);
    if (type === "password") {
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    } else {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    }
    toast.success(`${type === "password" ? "Password" : "URL"} copied to clipboard`);
  };

  const selectedBoardCount = boards.filter((b) => b.selected).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {result ? "Client Created!" : `Add Client - Step ${step} of 3`}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Enter the client's contact information"}
            {step === 2 && "Select which boards this client can access"}
            {step === 3 && !result && "Review and create the client"}
            {result && "Share these credentials with your client"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        {!result && (
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full transition-colors ${
                  s === step
                    ? "bg-primary"
                    : s < step
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        )}

        {/* Step 1: Client Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                placeholder="Acme Inc."
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
                placeholder="John Smith"
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
                placeholder="john@acme.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientType">Client Type (optional)</Label>
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
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value.slice(0, 500) })
                }
                placeholder="Any additional notes about this client..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {formData.notes.length}/500 characters
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Board Access */}
        {step === 2 && (
          <div className="space-y-4">
            {loadingBoards ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : boardConfigs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-muted-foreground mb-2">
                    No boards configured yet.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Go to the Boards page first to configure boards for client access.
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
                                Filter Value (optional - for row-level filtering)
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

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && !result && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company:</span>
                  <span className="font-medium">{formData.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact:</span>
                  <span className="font-medium">
                    {formData.contactName} ({formData.contactEmail})
                  </span>
                </div>
                {formData.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">{formData.phone}</span>
                  </div>
                )}
                {formData.clientType && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="secondary">{formData.clientType}</Badge>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Boards:</span>
                  <span className="font-medium">{selectedBoardCount} selected</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Client"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Success: Show credentials */}
        {result && (
          <div className="space-y-4">
            <Card className="border-[hsl(var(--monday-green))] bg-[hsl(var(--monday-green))]/5">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Dashboard URL
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input value={result.dashboardUrl} readOnly className="font-mono text-sm" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(result.dashboardUrl, "url")}
                    >
                      {urlCopied ? (
                        <Check className="h-4 w-4 text-[hsl(var(--monday-green))]" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Password (shown only once!)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={result.password}
                      readOnly
                      className="font-mono text-sm bg-[hsl(var(--monday-yellow))]/20"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(result.password, "password")}
                    >
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
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
