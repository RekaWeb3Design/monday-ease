

# Redesign Add Board Configuration Dialog: 4-Step Wizard with Client Support

## Overview
Transform the current 3-step wizard into a 4-step wizard that supports configuring board access for both team members and external clients. This includes adding a new "target audience" selection step, updating the access assignment step to conditionally show member and/or client sections, and updating the board card display to show client mappings.

---

## Files to Modify

### 1. `src/types/index.ts`
Update the `BoardConfig.target_audience` type to include `'both'`:

```typescript
// Line 106 - Update type
target_audience: 'team' | 'clients' | 'both' | null;
```

---

### 2. `src/components/boards/AddBoardDialog.tsx`

#### A. Update Step Type (line 56)
```typescript
type Step = 1 | 2 | 3 | 4;
```

#### B. Add New State Variables (after line 78)
```typescript
// Step 2: Target audience
const [targetAudience, setTargetAudience] = useState<'team' | 'clients' | 'both'>('both');

// Step 4: Client mappings
const [clients, setClients] = useState<{ id: string; company_name: string; contact_name: string }[]>([]);
const [clientMappings, setClientMappings] = useState<Record<string, string>>({});
const [clientsLoading, setClientsLoading] = useState(false);
```

#### C. Add Import for RadioGroup
```typescript
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
```

#### D. Add useAuth import and get organizationId
```typescript
import { useAuth } from "@/hooks/useAuth";
// Inside component:
const { organization } = useAuth();
```

#### E. Fetch Clients When Dialog Opens (new useEffect)
```typescript
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
```

#### F. Update Reset State on Dialog Close (modify existing useEffect)
Add resets for new state:
```typescript
setTargetAudience('both');
setClients([]);
setClientMappings({});
```

#### G. Add Client Mapping Handler
```typescript
const handleClientMappingChange = (clientId: string, value: string) => {
  setClientMappings((prev) => ({
    ...prev,
    [clientId]: value,
  }));
};
```

#### H. Update handleSubmit to Include New Fields
Pass `target_audience` and `clientMappings` to createConfig:
```typescript
const success = await createConfig({
  monday_board_id: selectedBoard.id,
  board_name: selectedBoard.name,
  filter_column_id: filterColumnId === 'none' ? null : filterColumnId || null,
  filter_column_name: filterColumn?.title || null,
  filter_column_type: filterColumn?.type || null,
  visible_columns: visibleColumns,
  target_audience: targetAudience,
  memberMappings: targetAudience === 'clients' ? [] : Object.entries(memberMappings)
    .filter(([_, value]) => value.trim() !== "")
    .map(([member_id, filter_value]) => ({ member_id, filter_value })),
  clientMappings: targetAudience === 'team' ? [] : Object.entries(clientMappings)
    .filter(([_, value]) => value.trim() !== "")
    .map(([client_id, filter_value]) => ({ client_id, filter_value })),
});
```

#### I. Update Step Navigation Conditionals
```typescript
const canProceedStep2 = !!targetAudience; // Audience selection is required
// step < 4 for Next button, step === 4 for Save button
```

#### J. Update Dialog Description (line 209-216)
```typescript
<DialogDescription>
  Step {step} of 4:{" "}
  {step === 1
    ? "Select a Monday.com board"
    : step === 2
    ? "Who is this board for?"
    : step === 3
    ? "Configure columns"
    : "Assign access"}
</DialogDescription>
```

#### K. Update Step Indicators (line 221)
```typescript
{[1, 2, 3, 4].map((s) => (
```

#### L. Add New Step 2 JSX (after Step 1, before current Step 2)
```tsx
{/* Step 2: Target Audience */}
{step === 2 && (
  <div className="space-y-4">
    <Label className="text-sm font-medium">Who should see this board?</Label>
    <RadioGroup value={targetAudience} onValueChange={(v) => setTargetAudience(v as 'team' | 'clients' | 'both')}>
      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
        <RadioGroupItem value="team" id="team" />
        <Label htmlFor="team" className="cursor-pointer flex-1">
          <div className="font-medium">Team Members</div>
          <div className="text-sm text-gray-500">Your invited colleagues who have MondayEase accounts</div>
        </Label>
      </div>
      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
        <RadioGroupItem value="clients" id="clients" />
        <Label htmlFor="clients" className="cursor-pointer flex-1">
          <div className="font-medium">External Clients</div>
          <div className="text-sm text-gray-500">Clients who access via password-protected dashboard URLs</div>
        </Label>
      </div>
      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
        <RadioGroupItem value="both" id="both" />
        <Label htmlFor="both" className="cursor-pointer flex-1">
          <div className="font-medium">Both</div>
          <div className="text-sm text-gray-500">Available to both team members and external clients</div>
        </Label>
      </div>
    </RadioGroup>
  </div>
)}
```

#### M. Move Current Step 2 to Step 3
Change condition from `step === 2` to `step === 3`

#### N. Redesign Step 4 (Current Step 3)
Change condition from `step === 3` to `step === 4`. Restructure to show sections based on `targetAudience`:

```tsx
{/* Step 4: Assign Access */}
{step === 4 && (
  <div className="space-y-6">
    {/* Team Members Section */}
    {(targetAudience === 'team' || targetAudience === 'both') && (
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Users className="h-4 w-4" />
          <span className="font-medium">Team Members</span>
        </div>
        {mappableMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team members to configure. Invite members first.</p>
        ) : (
          <ScrollArea className="h-[140px] rounded-md border p-3">
            <div className="space-y-3">
              {/* Existing member mapping UI */}
              {mappableMembers.map((member) => (
                <div key={member.id} className="space-y-1.5">
                  {/* ... existing member mapping input ... */}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    )}

    {/* Clients Section */}
    {(targetAudience === 'clients' || targetAudience === 'both') && (
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Building2 className="h-4 w-4" />
          <span className="font-medium">External Clients</span>
        </div>
        {clientsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading clients...
          </div>
        ) : clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active clients. Create clients first.</p>
        ) : (
          <ScrollArea className="h-[140px] rounded-md border p-3">
            <div className="space-y-3">
              {clients.map((client) => (
                <div key={client.id} className="space-y-1.5">
                  <Label className="text-sm font-normal flex flex-col">
                    <span>{client.company_name}</span>
                    <span className="text-xs text-muted-foreground font-normal">{client.contact_name}</span>
                  </Label>
                  <Input
                    placeholder="Filter value (optional - leave empty for all rows)"
                    value={clientMappings[client.id] || ""}
                    onChange={(e) => handleClientMappingChange(client.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    )}
  </div>
)}
```

#### O. Add Building2 Icon Import
```typescript
import { Building2 } from "lucide-react";
```

#### P. Update Footer Navigation
Change `step < 3` to `step < 4` and `step === 3` check for save button

---

### 3. `src/hooks/useBoardConfigs.ts`

#### A. Update CreateConfigInput Interface (lines 9-17)
```typescript
interface CreateConfigInput {
  monday_board_id: string;
  board_name: string;
  filter_column_id: string | null;
  filter_column_name: string | null;
  filter_column_type: string | null;
  visible_columns: string[];
  target_audience?: 'team' | 'clients' | 'both';
  memberMappings: { member_id: string; filter_value: string }[];
  clientMappings?: { client_id: string; filter_value: string }[];
}
```

#### B. Update createConfig Function (lines 146-162)
Add `target_audience` to the insert and handle client mappings:

```typescript
// Insert board config with target_audience
const { data: configData, error: configError } = await supabase
  .from("board_configs")
  .insert({
    organization_id: organization.id,
    monday_board_id: input.monday_board_id,
    board_name: input.board_name,
    filter_column_id: input.filter_column_id,
    filter_column_name: input.filter_column_name,
    filter_column_type: input.filter_column_type,
    visible_columns: input.visible_columns,
    monday_account_id: integration?.monday_account_id || null,
    workspace_name: integration?.workspace_name || null,
    target_audience: input.target_audience || 'team',
    is_active: true,
  })
  .select()
  .single();

// ... existing member mappings code ...

// Insert client mappings
if (input.clientMappings && input.clientMappings.length > 0) {
  const clientMappingsToInsert = input.clientMappings
    .map((m) => ({
      board_config_id: configData.id,
      client_id: m.client_id,
      filter_value: m.filter_value.trim() || null,
    }));

  if (clientMappingsToInsert.length > 0) {
    const { error: clientMappingError } = await supabase
      .from("client_board_access")
      .insert(clientMappingsToInsert);

    if (clientMappingError) throw clientMappingError;
  }
}
```

#### C. Fetch Client Access for Configs
Update the query function to also fetch client_board_access:

```typescript
// After fetching member access, also fetch client access
let clientAccessData: any[] = [];
if (activeConfigIds.length > 0) {
  const { data: clientAccessResult, error: clientAccessError } = await supabase
    .from("client_board_access")
    .select("*, clients(company_name)")
    .in("board_config_id", activeConfigIds);

  if (clientAccessError) throw clientAccessError;
  clientAccessData = clientAccessResult || [];
}
```

#### D. Update BoardConfigWithAccess Type Usage
The type will need to include client access - this will be handled in types update.

---

### 4. `src/types/index.ts` - Additional Updates

#### A. Update BoardConfigWithAccess (lines 143-146)
```typescript
export interface BoardConfigWithAccess extends BoardConfig {
  memberAccess: MemberBoardAccess[];
  clientAccess?: ClientBoardAccessWithClient[];
}
```

#### B. Add New Type for Client Access with Join
```typescript
export interface ClientBoardAccessWithClient extends ClientBoardAccess {
  clients?: { company_name: string };
}
```

---

### 5. `src/components/boards/BoardConfigCard.tsx`

#### A. Add Import for Building2 Icon
```typescript
import { Building2 } from "lucide-react";
```

#### B. Update Props Interface
```typescript
interface BoardConfigCardProps {
  config: BoardConfigWithAccess;
  members: OrganizationMember[];
  onEdit: () => void;
  onDelete: () => void;
}
```

#### C. Add Target Audience Badge (after Active/Inactive badge, around line 45-48)
```tsx
{config.target_audience && (
  <Badge 
    variant="outline"
    className={cn(
      config.target_audience === 'team' && "border-blue-500 text-blue-600",
      config.target_audience === 'clients' && "border-green-500 text-green-600",
      config.target_audience === 'both' && "border-purple-500 text-purple-600"
    )}
  >
    {config.target_audience === 'team' ? 'Team' : 
     config.target_audience === 'clients' ? 'Clients' : 'Both'}
  </Badge>
)}
```

#### D. Add Client Mappings Count (after members count, around line 103-108)
```tsx
{(config.target_audience === 'clients' || config.target_audience === 'both') && (
  <div className="flex items-center gap-2 text-muted-foreground">
    <Building2 className="h-4 w-4" />
    <span>Clients with Access:</span>
    <span className="font-medium text-foreground">{config.clientAccess?.length || 0}</span>
  </div>
)}
```

#### E. Add Client Mappings Collapsible Section (after member mappings, around line 140)
```tsx
{config.clientAccess && config.clientAccess.length > 0 && (
  <Collapsible>
    <CollapsibleTrigger asChild>
      <Button variant="ghost" className="w-full justify-between" size="sm">
        <span>Client Mappings</span>
        <ChevronDown className="h-4 w-4" />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent className="pt-2">
      <div className="space-y-2 rounded-md border bg-muted/30 p-3">
        {config.clientAccess.map((access) => (
          <div
            key={access.id}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground">
              {access.clients?.company_name || "Unknown Client"}
            </span>
            <Badge variant="outline" className="font-mono text-xs">
              {access.filter_value || "All rows"}
            </Badge>
          </div>
        ))}
      </div>
    </CollapsibleContent>
  </Collapsible>
)}
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/types/index.ts` | Update `target_audience` type to include `'both'`, add `ClientBoardAccessWithClient` type, update `BoardConfigWithAccess` |
| `src/components/boards/AddBoardDialog.tsx` | Convert to 4-step wizard, add Step 2 for audience selection, update Step 4 to show members/clients conditionally |
| `src/hooks/useBoardConfigs.ts` | Update `CreateConfigInput`, save `target_audience`, handle `clientMappings`, fetch client access |
| `src/components/boards/BoardConfigCard.tsx` | Add target audience badge, show client access count, add client mappings collapsible |

---

## Data Flow

```text
┌──────────────────────────────────────────────────────────────────┐
│                    ADD BOARD DIALOG (4 Steps)                     │
├──────────────────────────────────────────────────────────────────┤
│ Step 1: Select Board → Step 2: Target Audience →                 │
│ Step 3: Configure Columns → Step 4: Assign Access                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     useBoardConfigs.createConfig                  │
├──────────────────────────────────────────────────────────────────┤
│ 1. Insert board_configs with target_audience                     │
│ 2. Insert member_board_access (if team/both)                     │
│ 3. Insert client_board_access (if clients/both)                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BoardConfigCard                              │
├──────────────────────────────────────────────────────────────────┤
│ • Shows target audience badge (Team/Clients/Both)                │
│ • Shows member access count + collapsible mappings               │
│ • Shows client access count + collapsible mappings               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Technical Notes

- The `target_audience` field already exists in the database with values `'team'`, `'clients'`, `'both'` - needs to ensure the column can accept `'both'`
- Client mappings are optional - if no filter_value is provided, client sees all rows
- Uses existing `client_board_access` table for storing client-board relationships
- The RadioGroup component is already available from shadcn/ui
- Step 4 height is reduced (h-[140px] per section) to fit both sections when `targetAudience === 'both'`

