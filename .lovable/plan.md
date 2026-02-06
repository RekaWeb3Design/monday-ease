

# Board Wizard Part 2: Smart Filter Value Multi-Select

## Overview
Replace the plain text filter value inputs with a smart multi-select dropdown that fetches real values from Monday.com via the `get-column-values` Edge Function. This gives users a better UX by showing actual available values with color indicators for status columns.

---

## Files to Create

### 1. `src/components/boards/FilterValueMultiSelect.tsx` (NEW)

A reusable multi-select popover component for selecting filter values.

**Props Interface:**
```typescript
interface FilterValueMultiSelectProps {
  availableValues: { value: string; color?: string }[];
  loading: boolean;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}
```

**Component Features:**
- Popover-based dropdown with checkbox items
- Search/filter functionality for large value lists
- Color dots for status column values
- Selected values displayed as badges in the trigger button
- Loading state with spinner
- Empty state when no values found

**Component Structure:**
```text
+------------------------------------------+
| [Badge1] [Badge2] [Badge3]         [v]   |  <- Trigger button with selected badges
+------------------------------------------+
| [Search values...]                       |  <- Search input
+------------------------------------------+
| [x] Active          (green dot)          |
| [ ] Pending         (yellow dot)         |
| [x] Complete        (blue dot)           |
| [ ] Cancelled       (red dot)            |
+------------------------------------------+
```

---

## Files to Modify

### 2. `src/components/boards/AddBoardDialog.tsx`

#### A. Add Column Values State (after line 96)
```typescript
// Column values for filter dropdown (fetched once, shared across all instances)
const [columnValues, setColumnValues] = useState<{ value: string; color?: string }[]>([]);
const [columnValuesLoading, setColumnValuesLoading] = useState(false);
```

#### B. Add useEffect to Fetch Column Values (after line 175)
Fetches values from `get-column-values` edge function when filter column changes:
- Only fetch when a valid filter column is selected (not 'none')
- Uses POST request with board_id, column_id, column_type
- Sets columnValues on success, empty array on error
- Manages loading state

#### C. Change Filter Value State Types (lines 89, 95)
```typescript
// FROM:
const [memberFilterValues, setMemberFilterValues] = useState<Record<string, string>>({});
const [clientFilterValues, setClientFilterValues] = useState<Record<string, string>>({});

// TO:
const [memberFilterValues, setMemberFilterValues] = useState<Record<string, string[]>>({});
const [clientFilterValues, setClientFilterValues] = useState<Record<string, string[]>>({});
```

#### D. Update Filter Change Handlers (lines 216-217, 232-233)
```typescript
// FROM:
const handleMemberFilterChange = (memberId: string, value: string) => {...}
const handleClientFilterChange = (clientId: string, value: string) => {...}

// TO:
const handleMemberFilterChange = (memberId: string, values: string[]) => {...}
const handleClientFilterChange = (clientId: string, values: string[]) => {...}
```

#### E. Update handleSubmit to Join Array Values (lines 243-252)
```typescript
// Convert array to comma-separated string for storage
filter_value: (memberFilterValues[memberId] || []).join(',')
filter_value: (clientFilterValues[clientId] || []).join(',')
```

#### F. Update State Reset (add to lines 177-192)
Add reset for new state:
```typescript
setColumnValues([]);
setColumnValuesLoading(false);
```

#### G. Replace Non-Person Column Input in Team Members Step (lines 590-595)
Replace the `<Input>` component with `<FilterValueMultiSelect>`:
```tsx
// FROM:
<Input
  placeholder="Enter filter value..."
  value={memberFilterValues[member.id] || ""}
  onChange={(e) => handleMemberFilterChange(member.id, e.target.value)}
  className="h-9 text-sm"
/>

// TO:
<FilterValueMultiSelect
  availableValues={columnValues}
  loading={columnValuesLoading}
  selectedValues={memberFilterValues[member.id] || []}
  onChange={(values) => handleMemberFilterChange(member.id, values)}
  placeholder="Select filter values..."
/>
```

The person column Popover stays unchanged - only the else branch gets the new component.

#### H. Replace Input in Clients Step (lines 649-653)
Same replacement for the client filter input:
```tsx
<FilterValueMultiSelect
  availableValues={columnValues}
  loading={columnValuesLoading}
  selectedValues={clientFilterValues[client.id] || []}
  onChange={(values) => handleClientFilterChange(client.id, values)}
  placeholder="Select filter values..."
/>
```

---

### 3. `src/components/boards/BoardConfigCard.tsx`

#### Update Member Mapping Display (lines 168-170)
Replace plain text badge with split badges:
```tsx
// FROM:
<Badge variant="outline" className="font-mono text-xs">
  {access.filter_value}
</Badge>

// TO:
{access.filter_value ? (
  <div className="flex flex-wrap gap-1">
    {access.filter_value.split(',').map((v, i) => (
      <Badge key={i} variant="secondary" className="text-xs font-normal">
        {v.trim()}
      </Badge>
    ))}
  </div>
) : (
  <Badge variant="outline" className="text-xs">All rows</Badge>
)}
```

#### Update Client Mapping Display (lines 200-202)
Same change for client mappings display.

---

## Data Flow

```text
                    Filter Column Selected
                            |
                            v
    +-----------------------------------------------+
    |        useEffect: Fetch Column Values         |
    |                                               |
    |  POST /functions/v1/get-column-values         |
    |  { board_id, column_id, column_type }         |
    +-----------------------------------------------+
                            |
                            v
                    columnValues state
                    (shared across all rows)
                            |
            +---------------+---------------+
            |                               |
            v                               v
    FilterValueMultiSelect          FilterValueMultiSelect
    (Member 1)                      (Client 1)
            |                               |
            v                               v
    memberFilterValues['id']        clientFilterValues['id']
    = ['Active', 'Pending']         = ['Complete']
            |                               |
            +---------------+---------------+
                            |
                            v
                    handleSubmit
                            |
                            v
    filter_value: 'Active,Pending'   filter_value: 'Complete'
```

---

## Summary of Changes

| Area | Before | After |
|------|--------|-------|
| Filter input UI | Plain text input | Multi-select popover with checkboxes |
| Value source | Manual typing | Fetched from Monday.com |
| State type | `Record<string, string>` | `Record<string, string[]>` |
| Storage format | Single value | Comma-separated values |
| Display | Plain badge | Multiple badges per value |
| Status colors | Not shown | Colored dots from Monday.com |

---

## Technical Notes

- The `get-column-values` Edge Function is already deployed and returns `{ values: [{ value: string, color?: string }] }`
- For status columns, colors are returned (e.g., `#00CA72` for "Active")
- The person column Popover/Combobox remains unchanged - only non-person columns get the new FilterValueMultiSelect
- Filter values are stored comma-separated in the database (e.g., "Active,Sold,Under Contract")
- If the edge function fails, columnValues will be empty and the component shows "No values found" - this is acceptable fallback behavior
- Values are fetched once when the filter column changes, then shared across all member/client rows for efficiency

