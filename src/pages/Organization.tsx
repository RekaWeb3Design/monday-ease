import { useState, useEffect } from "react";
import { Pencil, Plus, Trash2, Loader2, AlertCircle, Users, Eye, Settings, Camera } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/hooks/useAuth";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { MemberViewSheet } from "@/components/organization/MemberViewSheet";
import { EditBoardAccessDialog } from "@/components/organization/EditBoardAccessDialog";

import type { OrganizationMember, MemberRole } from "@/types";

// Validation schemas
const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
});

const editMemberSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  role: z.enum(["admin", "member"]),
});

const editOrgSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
});

type InviteFormData = z.infer<typeof inviteSchema>;
type EditMemberFormData = z.infer<typeof editMemberSchema>;
type EditOrgFormData = z.infer<typeof editOrgSchema>;

// Badge styling helpers
const getRoleBadgeClasses = (role: string) => {
  switch (role) {
    case "owner":
      return "bg-[hsl(var(--primary))] text-primary-foreground";
    case "admin":
      return "bg-blue-500 text-white";
    case "member":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";
    case "pending":
      return "bg-[hsl(var(--warning))] text-gray-900";
    case "disabled":
      return "bg-[hsl(var(--destructive))] text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function Organization() {
  const { organization, memberRole, user, refreshOrganization } = useAuth();
  const { members, isLoading, inviteMember, updateMember, removeMember } = useOrganizationMembers();
  const { toast } = useToast();

  // Dialog states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editOrgDialogOpen, setEditOrgDialogOpen] = useState(false);
  const [editMemberDialogOpen, setEditMemberDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Member view/edit states
  const [selectedMemberForView, setSelectedMemberForView] = useState<OrganizationMember | null>(null);
  const [selectedMemberForBoardEdit, setSelectedMemberForBoardEdit] = useState<OrganizationMember | null>(null);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [isEditBoardDialogOpen, setIsEditBoardDialogOpen] = useState(false);
  const [memberBoardCounts, setMemberBoardCounts] = useState<Record<string, number>>({});

  // Logo upload states
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Sync logoUrl when organization changes
  useEffect(() => {
    setLogoUrl(organization?.logo_url || null);
  }, [organization?.logo_url]);

  // Forms
  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", displayName: "" },
  });

  const editMemberForm = useForm<EditMemberFormData>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: { displayName: "", role: "member" },
  });

  const editOrgForm = useForm<EditOrgFormData>({
    resolver: zodResolver(editOrgSchema),
    defaultValues: { name: organization?.name || "" },
  });

  // Fetch board access counts for members
  useEffect(() => {
    const fetchBoardCounts = async () => {
      if (!organization?.id || members.length === 0) return;

      try {
        const memberIds = members.map((m) => m.id);
        const { data, error } = await supabase
          .from("member_board_access")
          .select("member_id")
          .in("member_id", memberIds);

        if (error) throw error;

        // Count boards per member
        const counts: Record<string, number> = {};
        for (const access of data || []) {
          counts[access.member_id] = (counts[access.member_id] || 0) + 1;
        }
        setMemberBoardCounts(counts);
      } catch (err) {
        console.error("Error fetching board counts:", err);
      }
    };

    fetchBoardCounts();
  }, [organization?.id, members]);

  // Handlers
  const handleInvite = async (data: InviteFormData) => {
    setIsSubmitting(true);
    try {
      await inviteMember(data.email, data.displayName);
      inviteForm.reset();
      setInviteDialogOpen(false);
    } catch {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMember = async (data: EditMemberFormData) => {
    if (!selectedMember) return;
    setIsSubmitting(true);
    try {
      await updateMember(selectedMember.id, {
        displayName: data.displayName,
        role: data.role as MemberRole,
      });
      setEditMemberDialogOpen(false);
      setSelectedMember(null);
    } catch {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (member: OrganizationMember) => {
    try {
      await removeMember(member.id);
    } catch {
      // Error handled in hook
    }
  };

  const handleEditOrg = async (data: EditOrgFormData) => {
    if (!organization) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ name: data.name.trim() })
        .eq("id", organization.id);

      if (error) throw error;

      await refreshOrganization();
      toast({
        title: "Organization Updated",
        description: "Organization name has been updated successfully.",
      });
      setEditOrgDialogOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update organization name.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditMemberDialog = (member: OrganizationMember) => {
    setSelectedMember(member);
    editMemberForm.reset({
      displayName: member.display_name || "",
      role: member.role === "owner" ? "member" : (member.role as "admin" | "member"),
    });
    setEditMemberDialogOpen(true);
  };

  // Member view handlers
  const handleViewMember = (member: OrganizationMember) => {
    setSelectedMemberForView(member);
    setIsViewSheetOpen(true);
  };

  const handleEditBoardAccess = (member: OrganizationMember) => {
    setSelectedMemberForBoardEdit(member);
    setIsEditBoardDialogOpen(true);
  };

  const handleBoardAccessSaved = async () => {
    // Refetch board counts
    if (!organization?.id || members.length === 0) return;

    try {
      const memberIds = members.map((m) => m.id);
      const { data, error } = await supabase
        .from("member_board_access")
        .select("member_id")
        .in("member_id", memberIds);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const access of data || []) {
        counts[access.member_id] = (counts[access.member_id] || 0) + 1;
      }
      setMemberBoardCounts(counts);
    } catch (err) {
      console.error("Error refetching board counts:", err);
    }
  };

  // Logo upload handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 2MB",
        variant: "destructive",
      });
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${organization.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("org-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("org-logos")
        .getPublicUrl(filePath);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: urlWithCacheBust })
        .eq("id", organization.id);

      if (updateError) throw updateError;

      setLogoUrl(urlWithCacheBust);
      await refreshOrganization();
      toast({ title: "Organization logo updated!" });
    } catch (err) {
      console.error("Logo upload error:", err);
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Owner-only protection
  if (memberRole !== "owner") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Only organization owners can manage team members.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxMembers = organization.max_members || 10;
  const memberCount = members.length;
  const progressValue = (memberCount / maxMembers) * 100;

  return (
    <div className="space-y-6">
      {/* Organization Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo Upload */}
              <div className="relative group">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={logoUrl || undefined} alt={organization.name} />
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                    {organization.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Label 
                  htmlFor="logo-upload" 
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isUploadingLogo ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo}
                />
              </div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{organization.name}</CardTitle>
              <Dialog open={editOrgDialogOpen} onOpenChange={setEditOrgDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editOrgForm.reset({ name: organization.name })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Organization</DialogTitle>
                    <DialogDescription>
                      Update your organization's name.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...editOrgForm}>
                    <form onSubmit={editOrgForm.handleSubmit(handleEditOrg)} className="space-y-4">
                      <FormField
                        control={editOrgForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter organization name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditOrgDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">
                  {memberCount} / {maxMembers} members
                </span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Members</CardTitle>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => inviteForm.reset()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your organization.
                  </DialogDescription>
                </DialogHeader>
                <Form {...inviteForm}>
                  <form onSubmit={inviteForm.handleSubmit(handleInvite)} className="space-y-4">
                    <FormField
                      control={inviteForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="colleague@company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={inviteForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setInviteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Invitation
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No team members yet</h3>
              <p className="text-muted-foreground">
                Invite your first team member to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Boards</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const isCurrentUser = member.user_id === user?.id;
                    const isOwner = member.role === "owner";
                    const displayName = member.display_name || member.email.split("@")[0];
                    const boardCount = memberBoardCounts[member.id] || 0;

                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{displayName}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeClasses(member.role)}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeClasses(member.status)}>
                            {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{boardCount}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isCurrentUser && isOwner ? (
                            <span className="text-sm text-muted-foreground">You</span>
                          ) : (
                            <TooltipProvider>
                              <div className="flex items-center justify-end gap-1">
                                {/* View Member Tasks */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewMember(member)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Tasks</TooltipContent>
                                </Tooltip>

                                {/* Edit Board Access */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditBoardAccess(member)}
                                    >
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit Boards</TooltipContent>
                                </Tooltip>

                                {/* Edit Member */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditMemberDialog(member)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit Member</TooltipContent>
                                </Tooltip>

                                {/* Remove Member */}
                                <AlertDialog>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>Remove</TooltipContent>
                                  </Tooltip>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to remove {displayName} from the
                                        organization? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => handleRemoveMember(member)}
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TooltipProvider>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Member Dialog */}
      <Dialog open={editMemberDialogOpen} onOpenChange={setEditMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update team member details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editMemberForm}>
            <form onSubmit={editMemberForm.handleSubmit(handleEditMember)} className="space-y-4">
              <FormField
                control={editMemberForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter display name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editMemberForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditMemberDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Member View Sheet */}
      <MemberViewSheet
        isOpen={isViewSheetOpen}
        onClose={() => {
          setIsViewSheetOpen(false);
          setSelectedMemberForView(null);
        }}
        member={selectedMemberForView}
        onEditBoardAccess={(member) => {
          handleEditBoardAccess(member);
        }}
      />

      {/* Edit Board Access Dialog */}
      <EditBoardAccessDialog
        isOpen={isEditBoardDialogOpen}
        onClose={() => {
          setIsEditBoardDialogOpen(false);
          setSelectedMemberForBoardEdit(null);
        }}
        member={selectedMemberForBoardEdit}
        organizationId={organization.id}
        onSaved={handleBoardAccessSaved}
      />
    </div>
  );
}
