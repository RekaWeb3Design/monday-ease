
# Fix Client Dashboard Crash - Implementation Plan

## Problem
The client dashboard at `/c/:slug` shows a blank white page with error "Cannot read properties of undefined (reading 'name')" because:

1. The page tries to access `board.name`, `board.columns`, or `board.items` before data is loaded
2. Insufficient null checks when accessing nested properties in API responses
3. Edge cases where API might return unexpected data structures

## Root Cause Analysis

Looking at the current code flow:

```text
Page Load
    ↓
Check localStorage for token
    ↓
If token exists → Try fetchDashboardData()
    ↓
If fetch succeeds → setIsAuthenticated(true)
    ↓
Render Dashboard View (but dashboardData might have unexpected structure)
```

The issue occurs when:
- `dashboardData?.boards?.length` is checked but `boards[0]` might still be undefined
- `BoardTable` component receives a `board` prop but doesn't null-check `board.columns` or `board.items` before mapping
- The API returns an unexpected structure (e.g., `null` values instead of empty arrays)

## Technical Changes

### File: `src/pages/ClientDashboard.tsx`

1. **Add safe extraction helper** for API responses:
```typescript
function extractBoards(data: unknown): ClientDashboardBoard[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  
  if (Array.isArray(d.boards)) return d.boards;
  if (Array.isArray(d)) return d;
  
  return [];
}
```

2. **Add null checks in the main render section** (lines 286-314):
   - Check `dashboardData?.boards` exists AND is an array
   - Verify `dashboardData.boards[0]` exists before accessing `.boardId`
   - Add fallback for missing board properties

3. **Update BoardTable component** with defensive coding:
   - Add null checks for `board`, `board.columns`, `board.items`
   - Provide fallback empty arrays: `board?.columns || []`
   - Check `board?.boardName` before rendering

4. **Improve error handling in fetchDashboardData**:
   - Validate response structure before setting state
   - Ensure `boards` is always an array

### Specific Code Changes

**Add defensive checks in dashboard render (around line 286-315):**
```typescript
// Safely extract boards with fallback
const boards = dashboardData?.boards ?? [];
const hasBoards = Array.isArray(boards) && boards.length > 0;

// In the render:
{loadingData ? (
  <LoadingSkeleton />
) : !hasBoards ? (
  <EmptyState />
) : boards.length === 1 ? (
  <BoardTable board={boards[0]} ... />
) : (
  <Tabs defaultValue={boards[0]?.boardId ?? 'default'}>
    ...
  </Tabs>
)}
```

**Update BoardTable component with null checks:**
```typescript
function BoardTable({ board, renderCellValue }: BoardTableProps) {
  // Early return if board is malformed
  if (!board) {
    return <EmptyCard message="Board data unavailable" />;
  }

  const columns = board.columns ?? [];
  const items = board.items ?? [];
  const boardName = board.boardName ?? 'Untitled Board';

  if (!items.length) {
    return <EmptyState />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{boardName}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              {columns.map((col) => (
                <TableHead key={col?.id ?? Math.random()}>
                  {col?.title ?? ''}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item?.id ?? Math.random()}>
                <TableCell>{item?.name ?? '-'}</TableCell>
                {columns.map((col) => (
                  <TableCell key={col?.id}>
                    {renderCellValue(
                      item?.column_values?.[col?.id],
                      col?.type ?? ''
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

**Improve renderCellValue to handle undefined:**
```typescript
const renderCellValue = (value: any, type: string) => {
  if (value === undefined || value === null) {
    return <span className="text-muted-foreground">-</span>;
  }
  // ... rest of logic
};
```

## Expected Behavior After Fix

1. Page loads → Shows loading spinner
2. No token in localStorage → Shows password entry screen immediately
3. Token exists but expired → Clears token, shows password entry screen
4. Valid token → Fetches dashboard data, shows dashboard with proper null handling
5. API returns unexpected data → Gracefully shows empty state instead of crashing

## Testing Checklist
- [ ] Visit `/c/test-slug` with no token → See password screen
- [ ] Enter wrong password → See error message
- [ ] Enter correct password → See dashboard or empty state
- [ ] Refresh page with valid token → Resume session
- [ ] API returns `boards: null` → Show "No boards" message (not crash)
- [ ] API returns empty `columns` array → Render table without column headers
