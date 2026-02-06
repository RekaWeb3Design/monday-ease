import { useState, useEffect, useMemo } from "react";
import { Loader2, ChevronLeft, ChevronRight, Check, Info, ChevronsUpDown, User, Users, Building2, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMondayBoards } from "@/hooks/useMondayBoards";
import { useBoardConfigs } from "@/hooks/useBoardConfigs";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { useMondayUsers } from "@/hooks/useMondayUsers";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { FilterValueMultiSelect } from "./FilterValueMultiSelect";
import type { MondayBoard } from "@/types";

interface AddBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ClientOption {
  id: string;
  company_name: string;
  contact_name: string;
}

export function AddBoardDialog({ open, onOpenChange, onSuccess }: AddBoardDialogProps) {
  const { boards, isLoading: boardsLoading, fetchBoards } = useMondayBoards();
  const { createConfig } = useBoardConfigs();
  const { members } = useOrganizationMembers();
  const { users: mondayUsers, isLoading: usersLoading, fetchUsers } = useMondayUsers();
  const { organization } = useAuth();

  // Step state - index-based navigation
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Selected board
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [selectedBoard, setSelectedBoard] = useState<MondayBoard | null>(null);

  // Step 2: Target audience
  const [targetAudience, setTargetAudience] = useState<'team' | 'clients' | 'both'>('both');

  // Step 3: Column configuration
  const [filterColumnId, setFilterColumnId] = useState<string>("");
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  // Step 4/5: Checkbox-based member selection
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [memberFilterValues, setMemberFilterValues] = useState<Record<string, string[]>>({});
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

  // Step 4/5: Checkbox-based client selection
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [clientFilterValues, setClientFilterValues] = useState<Record<string, string[]>>({});
  const [clientsLoading, setClientsLoading] = useState(false);

  // Column values for filter dropdown (fetched once, shared across all instances)
  const [columnValues, setColumnValues] = useState<{ value: string; color?: string }[]>([]);
  const [columnValuesLoading, setColumnValuesLoading] = useState(false);

  // Dynamic steps based on audience selection
  const steps = useMemo(() => {
    const base: string[] = ['select-board', 'audience', 'columns'];
    if (targetAudience === 'team' || targetAudience === 'both') base.push('team-members');
    if (targetAudience === 'clients' || targetAudience === 'both') base.push('clients');
    return base;
  }, [targetAudience]);

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Step label helper
  const getStepLabel = (step: string) => {
    switch (step) {
      case 'select-board': return 'Select a Monday.com board';
      case 'audience': return 'Who is this board for?';
      case 'columns': return 'Configure columns';
      case 'team-members': return 'Select team members';
      case 'clients': return 'Select clients';
      default: return '';
    }
  };

  // Get the selected filter column to determine type
  const selectedFilterColumn = useMemo(() => {
    if (!selectedBoard || !filterColumnId || filterColumnId === 'none') return null;
    return selectedBoard.columns.find((c) => c.id === filterColumnId) || null;
  }, [selectedBoard, filterColumnId]);

  // More robust person column detection
  const isPersonColumn = useMemo(() => {
    if (!selectedFilterColumn) return false;
    const type = selectedFilterColumn.type?.toLowerCase() || '';
    const id = filterColumnId?.toLowerCase() || '';
    return type.includes('person') || type.includes('people') || 
           id.includes('person') || id.includes('people');
  }, [selectedFilterColumn, filterColumnId]);

  // Fetch boards when dialog opens
  useEffect(() => {
    if (open && boards.length === 0) {
      fetchBoards();
    }
  }, [open, boards.length, fetchBoards]);

  // Fetch clients when dialog opens
  useEffect(() => {
    if (open && organization?.id) {
      setClientsLoading(true);
      supabase
        .from('clients')
        .select('id, company_name, contact_name, status')
        .eq('organization_id', organization.id)
        .eq('status', 'active')
        .then(({ data }) => {
          setClients(data || []);
          setClientsLoading(false);
        });
    }
  }, [open, organization?.id]);

  // Update selected board when selection changes
  useEffect(() => {
    if (selectedBoardId) {
      const board = boards.find((b) => b.id === selectedBoardId);
      setSelectedBoard(board || null);
    } else {
      setSelectedBoard(null);
    }
  }, [selectedBoardId, boards]);

  // Fetch Monday users when entering team-members step with a person column
  useEffect(() => {
    if (currentStep === 'team-members' && isPersonColumn && mondayUsers.length === 0) {
      fetchUsers();
    }
  }, [currentStep, isPersonColumn, mondayUsers.length, fetchUsers]);

  // Fetch column values when filter column changes
  useEffect(() => {
    if (!selectedBoard?.id || !filterColumnId || filterColumnId === 'none') {
      setColumnValues([]);
      return;
    }
    
    const filterCol = selectedBoard.columns.find(c => c.id === filterColumnId);
    if (!filterCol) {
      setColumnValues([]);
      return;
    }

    setColumnValuesLoading(true);
    
    const fetchValues = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const res = await fetch(
          `https://yqjugovqhvxoxvrceqqp.supabase.co/functions/v1/get-column-values`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              board_id: selectedBoard.id,
              column_id: filterColumnId,
              column_type: filterCol.type || null,
            }),
          }
        );
        const data = await res.json();
        setColumnValues(data.values || []);
      } catch (error) {
        console.error('Failed to fetch column values:', error);
        setColumnValues([]);
      } finally {
        setColumnValuesLoading(false);
      }
    };
    
    fetchValues();
  }, [selectedBoard?.id, filterColumnId]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStepIndex(0);
      setSelectedBoardId("");
      setSelectedBoard(null);
      setTargetAudience('both');
      setFilterColumnId("");
      setVisibleColumns([]);
      setSelectedMembers(new Set());
      setMemberFilterValues({});
      setSelectedClients(new Set());
      setClientFilterValues({});
      setOpenPopovers({});
      setClients([]);
      setColumnValues([]);
      setColumnValuesLoading(false);
    }
  }, [open]);

  const handleVisibleColumnToggle = (columnId: string) => {
    setVisibleColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  // Toggle handlers for checkbox-based selection
  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleMemberFilterChange = (memberId: string, values: string[]) => {
    setMemberFilterValues(prev => ({ ...prev, [memberId]: values }));
  };

  // For person column, we still use single string value
  const handleMemberPersonChange = (memberId: string, value: string) => {
    setMemberFilterValues(prev => ({ ...prev, [memberId]: value ? [value] : [] }));
  };

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const handleClientFilterChange = (clientId: string, values: string[]) => {
    setClientFilterValues(prev => ({ ...prev, [clientId]: values }));
  };

  const handleSubmit = async () => {
    if (!selectedBoard) return;
    setIsSubmitting(true);

    const filterColumn = selectedBoard.columns.find((c) => c.id === filterColumnId);

    // Only include SELECTED members - join array to comma-separated string
    const memberMappingsList = Array.from(selectedMembers).map(memberId => ({
      member_id: memberId,
      filter_value: (memberFilterValues[memberId] || []).join(','),
    }));

    // Only include SELECTED clients - join array to comma-separated string
    const clientMappingsList = Array.from(selectedClients).map(clientId => ({
      client_id: clientId,
      filter_value: (clientFilterValues[clientId] || []).join(','),
    }));

    const success = await createConfig({
      monday_board_id: selectedBoard.id,
      board_name: selectedBoard.name,
      filter_column_id: filterColumnId === 'none' ? null : filterColumnId || null,
      filter_column_name: filterColumn?.title || null,
      filter_column_type: filterColumn?.type || null,
      visible_columns: visibleColumns,
      target_audience: targetAudience,
      memberMappings: targetAudience === 'clients' ? [] : memberMappingsList,
      clientMappings: targetAudience === 'team' ? [] : clientMappingsList,
    });

    setIsSubmitting(false);

    if (success) {
      onOpenChange(false);
      onSuccess();
    }
  };

  // Filter members to show (exclude owner for mapping since they have full access)
  // Also deduplicate by member id
  const mappableMembers = useMemo(() => {
    const seen = new Set<string>();
    return members.filter((m) => {
      if (m.role === "owner" || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [members]);

  const hasFilterColumn = filterColumnId && filterColumnId !== 'none';

  // Explicit close handler - only way to close the dialog
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        // Only allow opening, not auto-closing (prevents tab switch closing)
        if (isOpen) onOpenChange(isOpen);
      }}
      modal={false}
    >
      <DialogContent 
        className="max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        // Hide default close button since we provide our own
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-6 w-6 rounded-sm opacity-70 hover:opacity-100"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
          <DialogTitle>Add Board Configuration</DialogTitle>
          <DialogDescription>
            Step {currentStepIndex + 1} of {totalSteps}: {getStepLabel(currentStep)}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 py-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === currentStepIndex
                  ? "bg-primary"
                  : i < currentStepIndex
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="min-h-[300px]">
          {/* Step 1: Select Board */}
          {currentStep === 'select-board' && (
            <div className="space-y-4">
              {boardsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : boards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No boards found. Make sure Monday.com is connected.
                  </p>
                  <Button variant="outline" onClick={fetchBoards}>
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Select Board</Label>
                  <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a board..." />
                    </SelectTrigger>
                    <SelectContent>
                      {boards.map((board) => (
                        <SelectItem key={board.id} value={board.id}>
                          <div className="flex items-center gap-2">
                            <span>{board.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({board.board_kind})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBoard && (
                    <p className="text-sm text-muted-foreground">
                      {selectedBoard.columns.length} columns available
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Target Audience */}
          {currentStep === 'audience' && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Who should see this board?</Label>
              <RadioGroup value={targetAudience} onValueChange={(v) => setTargetAudience(v as 'team' | 'clients' | 'both')}>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="cursor-pointer flex-1">
                    <div className="font-medium">Team Members</div>
                    <div className="text-sm text-muted-foreground">Your invited colleagues who have MondayEase accounts</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="clients" id="clients" />
                  <Label htmlFor="clients" className="cursor-pointer flex-1">
                    <div className="font-medium">External Clients</div>
                    <div className="text-sm text-muted-foreground">Clients who access via password-protected dashboard URLs</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both" className="cursor-pointer flex-1">
                    <div className="font-medium">Both</div>
                    <div className="text-sm text-muted-foreground">Available to both team members and external clients</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 3: Configure Columns */}
          {currentStep === 'columns' && selectedBoard && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Filter Column (Optional)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px]">
                        <p>Choose which column determines what each member/client sees. For example, if you select 'Assigned Agent', users will only see rows where they are assigned. Leave as 'None' if all users should see all rows.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select value={filterColumnId} onValueChange={setFilterColumnId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (show all rows)</SelectItem>
                    {selectedBoard.columns.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.title} ({col.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Visible Columns (Optional)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px]">
                        <p>Select which columns users can see in their dashboard. Unselected columns will be hidden. Leave all unchecked to show every column.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <ScrollArea className="h-[180px] rounded-md border p-3">
                  <div className="space-y-2">
                    {selectedBoard.columns.map((col) => (
                      <div key={col.id} className="flex items-center gap-2">
                        <Checkbox
                          id={col.id}
                          checked={visibleColumns.includes(col.id)}
                          onCheckedChange={() => handleVisibleColumnToggle(col.id)}
                        />
                        <label
                          htmlFor={col.id}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {col.title}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({col.type})
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Team Members Step */}
          {currentStep === 'team-members' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Users className="h-4 w-4" />
                <span className="font-medium">Select Team Members</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Check the members who should have access to this board.
                {hasFilterColumn && ' Enter a filter value to limit which rows they see.'}
              </p>
              
              {mappableMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members to configure. Invite members first.</p>
              ) : (
                <ScrollArea className="h-[260px] rounded-md border p-3">
                  <div className="space-y-3">
                    {mappableMembers.map((member) => (
                      <div key={member.id} className="space-y-2">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`member-${member.id}`}
                            checked={selectedMembers.has(member.id)}
                            onCheckedChange={() => toggleMember(member.id)}
                            className="mt-0.5"
                          />
                          <label htmlFor={`member-${member.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium text-sm">{member.display_name || member.email}</div>
                            {member.display_name && (
                              <div className="text-xs text-muted-foreground">{member.email}</div>
                            )}
                          </label>
                        </div>
                        
                        {/* Only show filter input when member is selected AND filter column exists */}
                        {selectedMembers.has(member.id) && hasFilterColumn && (
                          <div className="ml-7">
                            {isPersonColumn ? (
                              <Popover
                                open={openPopovers[member.id] || false}
                                onOpenChange={(isOpen) =>
                                  setOpenPopovers((prev) => ({ ...prev, [member.id]: isOpen }))
                                }
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between font-normal h-9 text-sm"
                                    disabled={usersLoading}
                                  >
                                    {(memberFilterValues[member.id]?.[0]) || "Select Monday.com user..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[340px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search users..." />
                                    <CommandList>
                                      <CommandEmpty>No user found.</CommandEmpty>
                                      {mappableMembers.length > 0 && (
                                        <CommandGroup heading="Organization Members">
                                          {mappableMembers.map((orgMember) => (
                                            <CommandItem
                                              key={`org-${orgMember.id}`}
                                              value={`org ${orgMember.display_name || ''} ${orgMember.email}`}
                                              onSelect={() => {
                                                handleMemberPersonChange(member.id, orgMember.display_name || orgMember.email);
                                                setOpenPopovers((prev) => ({ ...prev, [member.id]: false }));
                                              }}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  (memberFilterValues[member.id]?.[0] || '') === (orgMember.display_name || orgMember.email)
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                                )}
                                              />
                                              <Users className="mr-2 h-4 w-4 text-primary" />
                                              <div className="flex flex-col">
                                                <span>{orgMember.display_name || orgMember.email}</span>
                                                <span className="text-xs text-muted-foreground">
                                                  {orgMember.email}
                                                </span>
                                              </div>
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      )}
                                      <CommandSeparator />
                                      {mondayUsers.length > 0 && (
                                        <CommandGroup heading="Monday.com Users">
                                          {mondayUsers.map((user) => (
                                            <CommandItem
                                              key={`monday-${user.id}`}
                                              value={`monday ${user.name} ${user.email || ''}`}
                                              onSelect={() => {
                                                handleMemberPersonChange(member.id, user.name);
                                                setOpenPopovers((prev) => ({ ...prev, [member.id]: false }));
                                              }}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  (memberFilterValues[member.id]?.[0] || '') === user.name
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                                )}
                                              />
                                              <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                              <div className="flex flex-col">
                                                <span>{user.name}</span>
                                                {user.email && (
                                                  <span className="text-xs text-muted-foreground">
                                                    {user.email}
                                                  </span>
                                                )}
                                              </div>
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      )}
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <FilterValueMultiSelect
                                availableValues={columnValues}
                                loading={columnValuesLoading}
                                selectedValues={memberFilterValues[member.id] || []}
                                onChange={(values) => handleMemberFilterChange(member.id, values)}
                                placeholder="Select filter values..."
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Clients Step */}
          {currentStep === 'clients' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">Select Clients</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Check the clients who should have access to this board.
                {hasFilterColumn 
                  ? ' Enter a filter value to limit which rows they see.' 
                  : ' They will see all rows on this board.'}
              </p>
              
              {clientsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading clients...
                </div>
              ) : clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active clients. Create clients first.</p>
              ) : (
                <ScrollArea className="h-[260px] rounded-md border p-3">
                  <div className="space-y-3">
                    {clients.map((client) => (
                      <div key={client.id} className="space-y-2">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`client-${client.id}`}
                            checked={selectedClients.has(client.id)}
                            onCheckedChange={() => toggleClient(client.id)}
                            className="mt-0.5"
                          />
                          <label htmlFor={`client-${client.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium text-sm">{client.company_name}</div>
                            <div className="text-xs text-muted-foreground">{client.contact_name}</div>
                          </label>
                        </div>
                        
                        {/* Only show filter input when client is selected AND filter column exists */}
                        {selectedClients.has(client.id) && hasFilterColumn && (
                          <div className="ml-7">
                            <FilterValueMultiSelect
                              availableValues={columnValues}
                              loading={columnValuesLoading}
                              selectedValues={clientFilterValues[client.id] || []}
                              onChange={(values) => handleClientFilterChange(client.id, values)}
                              placeholder="Select filter values..."
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {currentStepIndex > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStepIndex(i => Math.max(0, i - 1))}
                disabled={isSubmitting}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {isLastStep ? (
              <Button onClick={handleSubmit} disabled={!selectedBoard || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentStepIndex(i => i + 1)}
                disabled={
                  (currentStep === 'select-board' && !selectedBoardId) ||
                  (currentStep === 'audience' && !targetAudience)
                }
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
