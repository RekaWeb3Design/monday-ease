

# Fix Custom Board Views - Data Corruption Resolution

## Confirmed Issue

The database check confirms the bug:

| Field | Expected Type | Actual Type |
|-------|---------------|-------------|
| `selected_columns` | array | string |
| `settings` | object | string |

This causes `selectedColumns.map is not a function` in the edge function because it receives a string instead of an array.

---

## Fix Strategy

### Step 1: Fix Corrupted Database Records

Run a SQL migration to convert the double-encoded strings back to proper JSONB:

```sql
-- Fix selected_columns stored as strings
UPDATE public.custom_board_views 
SET selected_columns = (selected_columns #>> '{}')::jsonb
WHERE jsonb_typeof(selected_columns) = 'string';

-- Fix settings stored as strings
UPDATE public.custom_board_views 
SET settings = (settings #>> '{}')::jsonb
WHERE jsonb_typeof(settings) = 'string';
```

### Step 2: Fix the Hook to Prevent Future Corruption

**File:** `src/hooks/useCustomBoardViews.ts`

Remove `JSON.stringify()` calls that cause double-encoding:

```typescript
// Line 126-127 in createView function
// BEFORE:
selected_columns: JSON.stringify(data.selected_columns),
settings: JSON.stringify(data.settings),

// AFTER:
selected_columns: data.selected_columns,
settings: data.settings,
```

### Step 3: Add Defensive Parsing in Edge Function

**File:** `supabase/functions/get-board-view-data/index.ts`

Add type checking to handle both formats (for backward compatibility):

```typescript
// Parse selected_columns - handle both string and array
let selectedColumns: ViewColumn[] = [];
if (typeof view.selected_columns === 'string') {
  try {
    selectedColumns = JSON.parse(view.selected_columns);
  } catch {
    console.error('[get-board-view-data] Failed to parse selected_columns');
    selectedColumns = [];
  }
} else {
  selectedColumns = view.selected_columns || [];
}

// Parse settings - handle both string and object
const defaultSettings: ViewSettings = {
  show_item_name: true,
  row_height: 'default',
  enable_search: true,
  enable_filters: true,
  default_sort_column: null,
  default_sort_order: 'asc',
};

let settings: ViewSettings = { ...defaultSettings };
if (typeof view.settings === 'string') {
  try {
    settings = { ...defaultSettings, ...JSON.parse(view.settings) };
  } catch {
    console.error('[get-board-view-data] Failed to parse settings');
  }
} else if (view.settings) {
  settings = { ...defaultSettings, ...view.settings };
}
```

### Step 4: Redeploy Edge Function

Deploy the updated `get-board-view-data` function to apply the fixes.

---

## Files to Modify

| File | Change |
|------|--------|
| Database | Migration to fix corrupted JSONB data |
| `src/hooks/useCustomBoardViews.ts` | Remove `JSON.stringify()` on lines 126-127 |
| `supabase/functions/get-board-view-data/index.ts` | Add robust JSONB parsing (lines ~186-200) |

---

## Verification After Fix

1. Check database: `jsonb_typeof(selected_columns)` should return `'array'`
2. Navigate to `/board-views/teszt-client-error`
3. Verify data loads from Monday.com without errors
4. Create a new view to confirm hook fix works
5. Check edge function logs for successful execution

