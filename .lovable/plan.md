
# Edit Board Configuration Feature

## Overview

Implement an Edit Board dialog that allows users to modify existing board configurations, including filter column, visible columns, and member mappings.

---

## Changes Summary

| File | Changes |
|------|---------|
| `src/components/boards/EditBoardDialog.tsx` | NEW: Create edit dialog component with pre-populated values |
| `src/hooks/useBoardConfigs.ts` | Enhance `updateConfig` to support member mappings |
| `src/pages/BoardConfig.tsx` | Wire up EditBoardDialog with state management |

---

## 1. Create EditBoardDialog Component

### `src/components/boards/EditBoardDialog.tsx` (NEW FILE)

A dialog component similar to AddBoardDialog but for editing existing configurations. Since the user may want to quickly tweak settings, I'll use a simplified single-form approach rather than a 3-step wizard.

**Props:**
```tsx
interface EditBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: BoardConfigWithAccess;
  onSuccess: () => void;
}
```

**Key Features:**
- Fetches fresh columns from Monday.com API for the specific board
- Pre-populates filter column dropdown with current selection
- Pre-populates visible columns checkboxes with current selection
- Pre-populates member mappings with current values from `config.memberAccess`
- Detects person-type columns for smart user picker vs text input
- Uses the same member mapping UI as AddBoardDialog (combobox for person columns, text input otherwise)

**Layout:**
```text
┌─────────────────────────────────────────────────┐
│  Edit Board Configuration                        │
│  [Board Name]                                    │
├─────────────────────────────────────────────────┤
│                                                  │
│  Filter Column (Optional)                        │
│  [Dropdown: current selection ▼]                 │
│                                                  │
│  Visible Columns (Optional)                      │
│  ┌────────────────────────────────────────────┐ │
│  │ ☑ Name                                      │ │
│  │ ☐ Status                                    │ │
│  │ ☑ Person                                    │ │
│  │ ☐ Date                                      │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  Member Mappings                                 │
│  ┌────────────────────────────────────────────┐ │
│  │ Member 1: [current value    ▼]              │ │
│  │ Member 2: [current value    ▼]              │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
├─────────────────────────────────────────────────┤
│               [Cancel]  [Save Changes]           │
└─────────────────────────────────────────────────┘
```

---

## 2. Enhance useBoardConfigs Hook

### `src/hooks/useBoardConfigs.ts`

Enhance the `updateConfig` function to support member mappings updates.

**Changes:**
1. Create new interface for update input with member mappings
2. Modify `updateConfig` to handle member mappings:
   - Delete existing member_board_access records for the config
   - Insert new member mappings

```tsx
interface UpdateConfigInput {
  filter_column_id?: string | null;
  filter_column_name?: string | null;
  filter_column_type?: string | null;
  visible_columns?: string[];
  memberMappings?: { member_id: string; filter_value: string }[];
}

const updateConfig = async (id: string, updates: UpdateConfigInput): Promise<boolean> => {
  try {
    // 1. Update board_configs table (filter column, visible columns)
    const { error: configError } = await supabase
      .from("board_configs")
      .update({
        filter_column_id: updates.filter_column_id,
        filter_column_name: updates.filter_column_name,
        filter_column_type: updates.filter_column_type,
        visible_columns: updates.visible_columns,
      })
      .eq("id", id);

    if (configError) throw configError;

    // 2. If memberMappings provided, replace all existing mappings
    if (updates.memberMappings !== undefined) {
      // Delete existing mappings
      await supabase
        .from("member_board_access")
        .delete()
        .eq("board_config_id", id);

      // Insert new mappings
      if (updates.memberMappings.length > 0) {
        const mappings = updates.memberMappings
          .filter(m => m.filter_value.trim() !== "")
          .map(m => ({
            board_config_id: id,
            member_id: m.member_id,
            filter_value: m.filter_value.trim(),
          }));

        if (mappings.length > 0) {
          const { error: mappingError } = await supabase
            .from("member_board_access")
            .insert(mappings);

          if (mappingError) throw mappingError;
        }
      }
    }

    toast({ title: "Board Updated", description: "..." });
    await fetchConfigs();
    return true;
  } catch (err) {
    // error handling
  }
};
```

---

## 3. Wire Up EditBoardDialog in BoardConfig.tsx

### `src/pages/BoardConfig.tsx`

Add state and dialog rendering for the edit functionality.

**Changes:**
1. Add state for selected config to edit
2. Wire up `onEdit` callback to open dialog
3. Render EditBoardDialog

```tsx
// Add state
const [editingConfig, setEditingConfig] = useState<BoardConfigWithAccess | null>(null);

// Update BoardConfigCard
<BoardConfigCard
  key={config.id}
  config={config}
  members={members}
  onEdit={() => setEditingConfig(config)}
  onDelete={() => deleteConfig(config.id)}
/>

// Add EditBoardDialog
{editingConfig && (
  <EditBoardDialog
    open={!!editingConfig}
    onOpenChange={(open) => !open && setEditingConfig(null)}
    config={editingConfig}
    onSuccess={() => {
      setEditingConfig(null);
      refetch();
    }}
  />
)}
```

---

## Technical Implementation Details

### EditBoardDialog Internal State

```tsx
// Fetch board columns for dropdown
const { boards, fetchBoards } = useMondayBoards();
const selectedBoard = boards.find(b => b.id === config.monday_board_id);

// State initialized from config
const [filterColumnId, setFilterColumnId] = useState(config.filter_column_id || 'none');
const [visibleColumns, setVisibleColumns] = useState<string[]>(config.visible_columns);
const [memberMappings, setMemberMappings] = useState<Record<string, string>>(() => {
  // Initialize from config.memberAccess
  const initial: Record<string, string> = {};
  config.memberAccess.forEach(access => {
    initial[access.member_id] = access.filter_value;
  });
  return initial;
});
```

### Loading Board Columns

When dialog opens, fetch boards from Monday.com to get fresh column data:
```tsx
useEffect(() => {
  if (open && boards.length === 0) {
    fetchBoards();
  }
}, [open, boards.length]);
```

The columns are needed to:
- Populate the filter column dropdown with current options
- Show column type information
- Determine if person-type column for smart mapping UI

### Edge Case: Board No Longer Exists

If the board is no longer accessible in Monday.com:
- Show warning message
- Disable filter column and visible columns editing
- Still allow member mapping changes (since these are local)

---

## Files Summary

1. **`src/components/boards/EditBoardDialog.tsx`** - NEW
   - Single-form edit dialog (not wizard)
   - Pre-populates all fields from config
   - Fetches fresh board columns from Monday.com
   - Person column detection for smart user picker
   - Uses same patterns as AddBoardDialog

2. **`src/hooks/useBoardConfigs.ts`** - MODIFIED
   - Enhanced `updateConfig` to accept member mappings
   - Delete + insert pattern for atomic member mapping updates

3. **`src/pages/BoardConfig.tsx`** - MODIFIED
   - Add `editingConfig` state
   - Wire up onEdit callback
   - Render EditBoardDialog component
