

## Fix AddBoardDialog Step 2 Select Error

### Problem
The Radix UI Select component does not allow empty string values for `SelectItem`. The "None (show all rows)" option has `value=""` which causes a runtime error.

### Solution
Change the empty string to a placeholder value "none" and update the submit handler to treat "none" as null.

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/boards/AddBoardDialog.tsx` | Two line changes |

---

### Changes

#### Line 224 - Change the SelectItem value

**Before:**
```tsx
<SelectItem value="">None (show all rows)</SelectItem>
```

**After:**
```tsx
<SelectItem value="none">None (show all rows)</SelectItem>
```

#### Line 110 - Update handleSubmit to handle "none" value

**Before:**
```tsx
filter_column_id: filterColumnId || null,
```

**After:**
```tsx
filter_column_id: filterColumnId === 'none' ? null : filterColumnId || null,
```

---

### Why This Works
- Radix UI Select requires non-empty string values for SelectItem
- Using "none" as a placeholder value satisfies the component requirement
- The submit handler converts "none" back to null for database storage
- This maintains the same behavior (null filter = show all rows)

