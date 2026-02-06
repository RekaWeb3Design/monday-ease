

# Fix Board Configuration Wizard — Part 1: Dynamic Steps + Checkbox Selection

## Overview
Replace the fixed 4-step wizard with a dynamic step system based on audience selection, and implement checkbox-based access selection for team members and clients.

---

## File to Modify

**`src/components/boards/AddBoardDialog.tsx`**

---

## Changes

### 1. Replace Fixed Step Type with Dynamic Steps System

**Remove (line 59):**
```typescript
type Step = 1 | 2 | 3 | 4;
```

**Add dynamic steps logic (after state declarations, ~line 95):**
```typescript
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
```

### 2. Replace Step State with Index-Based Navigation

**Replace (line 75):**
```typescript
const [step, setStep] = useState<Step>(1);
```

**With:**
```typescript
const [currentStepIndex, setCurrentStepIndex] = useState(0);
```

### 3. Replace Member/Client Mappings with Checkbox-Based State

**Replace (lines 90-91):**
```typescript
const [memberMappings, setMemberMappings] = useState<Record<string, string>>({});
```

**With:**
```typescript
// Checkbox-based member selection
const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
const [memberFilterValues, setMemberFilterValues] = useState<Record<string, string>>({});
```

**Replace (line 93):**
```typescript
const [clientMappings, setClientMappings] = useState<Record<string, string>>({});
```

**With:**
```typescript
// Checkbox-based client selection
const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
const [clientFilterValues, setClientFilterValues] = useState<Record<string, string>>({});
```

### 4. Add Toggle Handlers

**Replace handleMemberMappingChange (lines 190-195):**
```typescript
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

const handleMemberFilterChange = (memberId: string, value: string) => {
  setMemberFilterValues(prev => ({ ...prev, [memberId]: value }));
};
```

**Replace handleClientMappingChange (lines 197-202):**
```typescript
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

const handleClientFilterChange = (clientId: string, value: string) => {
  setClientFilterValues(prev => ({ ...prev, [clientId]: value }));
};
```

### 5. Update handleSubmit (lines 204-233)

Build mappings only from selected members/clients:

```typescript
const handleSubmit = async () => {
  if (!selectedBoard) return;
  setIsSubmitting(true);

  const filterColumn = selectedBoard.columns.find((c) => c.id === filterColumnId);

  // Only include SELECTED members
  const memberMappingsList = Array.from(selectedMembers).map(memberId => ({
    member_id: memberId,
    filter_value: memberFilterValues[memberId] || '',
  }));

  // Only include SELECTED clients
  const clientMappingsList = Array.from(selectedClients).map(clientId => ({
    client_id: clientId,
    filter_value: clientFilterValues[clientId] || '',
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
```

### 6. Update Monday Users Fetch Effect

**Replace (lines 145-149):**
```typescript
useEffect(() => {
  if (currentStep === 'team-members' && isPersonColumn && mondayUsers.length === 0) {
    fetchUsers();
  }
}, [currentStep, isPersonColumn, mondayUsers.length, fetchUsers]);
```

### 7. Remove Pre-fill Effect

**Remove lines 151-164** (the useEffect that pre-fills member mappings with display names) - no longer needed with checkbox approach.

### 8. Update State Reset (lines 167-180)

```typescript
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
  }
}, [open]);
```

### 9. Update Dialog Description (lines 256-265)

```tsx
<DialogDescription>
  Step {currentStepIndex + 1} of {totalSteps}: {getStepLabel(currentStep)}
</DialogDescription>
```

### 10. Update Step Indicators (lines 268-282)

```tsx
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
```

### 11. Update Step Content Conditionals

**Step 1 (line 286):**
```tsx
{currentStep === 'select-board' && (
```

**Step 2 (line 332):**
```tsx
{currentStep === 'audience' && (
```

**Step 3 (line 361):**
```tsx
{currentStep === 'columns' && selectedBoard && (
```

### 12. New Team Members Step (replace current Step 4 team section)

```tsx
{currentStep === 'team-members' && (
  <div className="space-y-4">
    <div className="flex items-center gap-2 pb-2 border-b">
      <Users className="h-4 w-4" />
      <span className="font-medium">Select Team Members</span>
    </div>
    <p className="text-sm text-muted-foreground">
      Check the members who should have access to this board.
      {filterColumnId && filterColumnId !== 'none' && ' Enter a filter value to limit which rows they see.'}
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
              {selectedMembers.has(member.id) && filterColumnId && filterColumnId !== 'none' && (
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
                          {memberFilterValues[member.id] || "Select Monday.com user..."}
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
                                      handleMemberFilterChange(member.id, orgMember.display_name || orgMember.email);
                                      setOpenPopovers((prev) => ({ ...prev, [member.id]: false }));
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        memberFilterValues[member.id] === orgMember.display_name
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
                                      handleMemberFilterChange(member.id, user.name);
                                      setOpenPopovers((prev) => ({ ...prev, [member.id]: false }));
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        memberFilterValues[member.id] === user.name
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
                    <Input
                      placeholder="Enter filter value..."
                      value={memberFilterValues[member.id] || ""}
                      onChange={(e) => handleMemberFilterChange(member.id, e.target.value)}
                      className="h-9 text-sm"
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
```

### 13. New Clients Step (replace current Step 4 clients section)

```tsx
{currentStep === 'clients' && (
  <div className="space-y-4">
    <div className="flex items-center gap-2 pb-2 border-b">
      <Building2 className="h-4 w-4" />
      <span className="font-medium">Select Clients</span>
    </div>
    <p className="text-sm text-muted-foreground">
      Check the clients who should have access to this board.
      {filterColumnId && filterColumnId !== 'none' 
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
              {selectedClients.has(client.id) && filterColumnId && filterColumnId !== 'none' && (
                <div className="ml-7">
                  <Input
                    placeholder="Enter filter value (optional - leave empty for all rows)..."
                    value={clientFilterValues[client.id] || ""}
                    onChange={(e) => handleClientFilterChange(client.id, e.target.value)}
                    className="h-9 text-sm"
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
```

### 14. Update Footer Navigation (lines 638-681)

```tsx
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
    <Button variant="outline" onClick={() => onOpenChange(false)}>
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
```

---

## Summary of Changes

| Area | Before | After |
|------|--------|-------|
| Step count | Fixed 4 steps | Dynamic 4-5 steps based on audience |
| Step type | `Step = 1 \| 2 \| 3 \| 4` | `string[]` array with index |
| Member selection | Everyone listed automatically | Checkbox to opt-in |
| Client selection | Everyone listed automatically | Checkbox to opt-in |
| Filter inputs | Always shown | Only when member/client is checked AND filter column exists |
| Access records | Created for everyone with non-empty value | Only created for checked members/clients |

---

## Step Flow Examples

**Audience = "Team":**
```
Select Board → Who is this for? → Configure Columns → Select Team Members
(4 steps total)
```

**Audience = "Clients":**
```
Select Board → Who is this for? → Configure Columns → Select Clients
(4 steps total)
```

**Audience = "Both":**
```
Select Board → Who is this for? → Configure Columns → Select Team Members → Select Clients
(5 steps total)
```

---

## Technical Notes

- The `useBoardConfigs.createConfig` function already handles the `memberMappings` and `clientMappings` arrays correctly - no changes needed there
- The `Set<string>` state for selections provides O(1) lookup and toggle performance
- Filter value inputs only appear when the checkbox is checked AND a filter column is configured
- If no filter column is selected, checked members/clients get access to all rows
- The person column Popover/Combobox is preserved for person-type filter columns

