

# Add Monday Account Tracking & Filtering

## Overview

This plan extends the previous requirements with an additional filter in `fetchConfigs()` to only show board configs that belong to the currently connected Monday.com account (or legacy configs with null account ID).

---

## Complete Changes Summary

| File | Changes |
|------|---------|
| **Database** | Add `monday_account_id TEXT` column to `board_configs` |
| `src/types/index.ts` | Add `monday_account_id` to `BoardConfig` and `BoardConfigWithAccess` interfaces |
| `src/hooks/useBoardConfigs.ts` | 1. Import `useIntegration` hook 2. Filter `fetchConfigs()` by account ID 3. Save `monday_account_id` on create |
| `src/pages/Integrations.tsx` | Add warning dialog when switching accounts |

---

## Database Migration

```sql
ALTER TABLE public.board_configs 
ADD COLUMN monday_account_id TEXT;
```

---

## 1. Types Update (`src/types/index.ts`)

Add `monday_account_id` to both interfaces:

```typescript
export interface BoardConfig {
  id: string;
  organization_id: string;
  monday_board_id: string;
  board_name: string;
  filter_column_id: string | null;
  filter_column_name: string | null;
  filter_column_type: string | null;
  visible_columns: string[];
  is_active: boolean;
  monday_account_id: string | null; // NEW
  created_at: string | null;
  updated_at: string | null;
}

export interface BoardConfigWithAccess extends BoardConfig {
  memberAccess: MemberBoardAccess[];
}
```

---

## 2. Filter & Save in `useBoardConfigs.ts`

### Import `useIntegration`

```typescript
import { useIntegration } from "@/hooks/useIntegration";
```

### Add Integration to Hook

```typescript
export function useBoardConfigs(): UseBoardConfigsReturn {
  const { organization } = useAuth();
  const { toast } = useToast();
  const { integration } = useIntegration(); // NEW
  const [configs, setConfigs] = useState<BoardConfigWithAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
```

### Update `fetchConfigs()` Query (Lines 43-47)

Add `.or()` filter to only show configs matching the current account or legacy null values:

```typescript
const fetchConfigs = useCallback(async () => {
  if (!organization) {
    setConfigs([]);
    setIsLoading(false);
    return;
  }

  setIsLoading(true);

  try {
    // Build the query
    let query = supabase
      .from("board_configs")
      .select("*")
      .eq("organization_id", organization.id);
    
    // Filter by monday_account_id: match current account OR null (legacy)
    if (integration?.monday_account_id) {
      query = query.or(
        `monday_account_id.eq.${integration.monday_account_id},monday_account_id.is.null`
      );
    }
    
    const { data: configsData, error: configsError } = await query
      .order("created_at", { ascending: false });

    if (configsError) throw configsError;
    // ... rest of the function
```

### Update `createConfig()` to Save `monday_account_id` (Lines 111-122)

```typescript
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
    monday_account_id: integration?.monday_account_id || null, // NEW
    is_active: true,
  })
  .select()
  .single();
```

### Update `fetchConfigs` Dependencies

```typescript
}, [organization, integration?.monday_account_id, toast]);
```

### Update Mapping in `configsWithAccess` (Lines 66-79)

Add the new field to the mapped object:

```typescript
const configsWithAccess: BoardConfigWithAccess[] = (configsData || []).map((config) => ({
  // ... existing fields
  monday_account_id: config.monday_account_id || null, // NEW
  memberAccess: accessData.filter((a) => a.board_config_id === config.id),
}));
```

---

## 3. Warning Dialog in `Integrations.tsx`

### Add Imports

```typescript
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
import { useBoardConfigs } from "@/hooks/useBoardConfigs";
```

### Add State and Logic

```typescript
const { configs } = useBoardConfigs();
const [showSwitchWarning, setShowSwitchWarning] = useState(false);

// Count configs that will be hidden when switching accounts
const linkedConfigCount = configs.filter(
  (c) => c.monday_account_id === integration?.monday_account_id
).length;

const handleSwitchAccountClick = () => {
  if (linkedConfigCount > 0) {
    setShowSwitchWarning(true);
  } else {
    handleSwitchAccount();
  }
};

const confirmSwitchAccount = async () => {
  setShowSwitchWarning(false);
  await handleSwitchAccount();
};
```

### Update "Connect a different account" Link

Change from direct `handleSwitchAccount` to `handleSwitchAccountClick`:

```typescript
<button
  type="button"
  className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors w-full text-center"
  onClick={handleSwitchAccountClick}  // Changed from handleSwitchAccount
>
  Connect a different Monday.com account
</button>
```

### Add AlertDialog Component

```typescript
<AlertDialog open={showSwitchWarning} onOpenChange={setShowSwitchWarning}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Switch Monday.com Account?</AlertDialogTitle>
      <AlertDialogDescription>
        You have {linkedConfigCount} board configuration{linkedConfigCount !== 1 ? 's' : ''} linked 
        to the current Monday.com account.
        <br /><br />
        If you connect a different account, these boards will no longer be 
        accessible until you reconnect the original account.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={confirmSwitchAccount}>
        Switch Account
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Data Flow Diagram

```text
                     CREATING NEW CONFIG
                     
User creates board config
         │
         ▼
useBoardConfigs.createConfig()
         │
         ├── Gets integration.monday_account_id
         │
         ▼
Saves to board_configs table with monday_account_id
         

                     FETCHING CONFIGS
                     
useBoardConfigs.fetchConfigs()
         │
         ├── Gets integration.monday_account_id
         │
         ▼
Query with filter:
  monday_account_id = current_account_id
  OR monday_account_id IS NULL
         │
         ▼
Only shows relevant configs
         

                     SWITCHING ACCOUNTS
                     
User clicks "Connect different account"
         │
         ▼
Check linkedConfigCount > 0?
         │
    ┌────┴────┐
   YES       NO
    │         │
    ▼         ▼
Show      Direct
Warning   Disconnect
Dialog        │
    │         │
[Cancel] [Confirm]
    │         │
    └────┬────┘
         │
         ▼
Disconnect & Reset UI
```

---

## Technical Notes

1. **Backward Compatibility**: Configs without `monday_account_id` (null) will always be visible - they're treated as legacy configs
2. **Query Safety**: The `.or()` filter only applies when there's a valid `monday_account_id` from the integration
3. **Re-fetch Trigger**: When integration changes (connect/disconnect), configs will automatically re-fetch due to dependency on `integration?.monday_account_id`
4. **Future Migrations**: If needed, existing configs could be backfilled with account IDs via a migration script

