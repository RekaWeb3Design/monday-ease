

# Fix: Client Edit Dialog — Boards Tab Empty

## Root Cause

The "Boards" tab in the Edit Client dialog has two issues:

1. **No target_audience filter**: The `loadBoardAccess` function maps over ALL board configs (team, clients, both) instead of filtering to only show boards where `target_audience` is `'clients'` or `'both'`. If all boards are configured as `'team'`, the boards list shows irrelevant boards. More critically, even when client-targeted boards exist, they may not display correctly.

2. **Race condition on reload**: The `useEffect` on line 117 that re-triggers `loadBoardAccess` when `boardConfigs` loads has a fragile guard: `boards.length === 0 && !loadingAccess`. If `loadBoardAccess` already ran with an empty `boardConfigs` array (common on first render), `boards` gets set to an empty array, and `loadingAccess` becomes `false` -- but the guard `boards.length === 0` is true, so it should re-trigger. However, `boardConfigs` from `useBoardConfigs` depends on async data, and the effect dependency array `[boardConfigs, open]` may not always fire reliably when configs populate.

## Fix Plan

### File: `src/components/clients/EditClientDialog.tsx`

**Change 1 — Filter boards by target_audience:**

In the `loadBoardAccess` function (line 132), filter `boardConfigs` to only include boards where `target_audience` is `'clients'` or `'both'`:

```typescript
const clientBoards = boardConfigs.filter(
  (config) => config.target_audience === 'clients' || config.target_audience === 'both'
);
```

Then map over `clientBoards` instead of `boardConfigs`.

**Change 2 — Fix the empty state check:**

Update the empty state condition (line 411) to check against client-relevant boards, not all `boardConfigs`:

```typescript
// Before:
boardConfigs.length === 0

// After: compute clientRelevantBoards and check that
clientRelevantBoards.length === 0
```

With appropriate messaging: "No boards configured for client access yet. Configure a board with target audience 'Clients' or 'Both' first."

**Change 3 — Stabilize the reload effect:**

Replace the fragile `boards.length === 0` guard with a ref-based approach that tracks whether board access has been successfully loaded for the current client:

```typescript
const [boardsLoaded, setBoardsLoaded] = useState(false);

// Reset when dialog opens or client changes
useEffect(() => {
  if (open) setBoardsLoaded(false);
}, [client?.id, open]);

// Re-load when boardConfigs become available
useEffect(() => {
  if (open && boardConfigs.length > 0 && !boardsLoaded && !loadingAccess) {
    loadBoardAccess();
  }
}, [boardConfigs, open, boardsLoaded, loadingAccess]);
```

And set `setBoardsLoaded(true)` at the end of a successful `loadBoardAccess`.

**Change 4 — Add filter column info per board:**

For each board card, if the board has no `filter_column_id` configured, show "Client will see all items on this board" instead of the filter input. This uses the `filter_column_id` and `filter_column_name` fields already available on the board config:

```typescript
{board.selected && (
  board.hasFilterColumn ? (
    <div>
      <Label>Filter by {board.filterColumnName}</Label>
      <Input ... />
    </div>
  ) : (
    <p className="text-xs text-muted-foreground italic">
      Client will see all items on this board
    </p>
  )
)}
```

This requires extending the `BoardSelection` interface to include `hasFilterColumn` and `filterColumnName`.

## Files Modified

| File | Change |
|------|--------|
| `src/components/clients/EditClientDialog.tsx` | Filter by target_audience, fix reload race condition, add filter column info |

## What Does NOT Change

- Details tab, Security tab functionality
- useClients hook
- useBoardConfigs hook
- Client page layout
- Board config save logic
