
# Fix: Client Edit Boards Tab — Pre-selection Bug + Enhancements

## Bug Fix: Pre-selected boards not checked

**Root Cause**: The `loadBoardAccess` function computes `clientRelevantBoards` outside the function body (line 124-126) as a component-level variable. This means it uses `boardConfigs` from the render cycle, which is correct. However, the `accessMap` lookup uses `config.id` which should match `a.board_config_id` from the access records. The actual issue is likely a **closure/timing problem**: `clientRelevantBoards` is computed at render time, but `loadBoardAccess` captures a stale reference. When `boardConfigs` loads asynchronously, the first call to `loadBoardAccess` may use an empty `clientRelevantBoards`.

**Fix**: Move the `clientRelevantBoards` computation inside `loadBoardAccess` so it always uses the latest `boardConfigs`. Add debug console logs as requested.

## Enhancement 1: Show "Other Boards (Team only)" section

Below the client-relevant boards list, show all other active boards (where `target_audience === 'team'`) with a "+ Make available for clients" button.

Clicking it will:
- Update the board's `target_audience` from `'team'` to `'both'` via a direct Supabase update
- Move the board into the "Available Boards" section
- Show a success toast

This requires extending `UpdateConfigInput` in `useBoardConfigs.ts` to support `target_audience`, and adding the corresponding logic in `updateConfig`.

## Enhancement 2: "Configure a new board" link

A simple text link at the bottom of the Boards tab pointing to `/boards`.

---

## Technical Details

### File: `src/hooks/useBoardConfigs.ts`

- Add `target_audience?: 'team' | 'clients' | 'both'` to `UpdateConfigInput` interface
- Add handling for `target_audience` in the `updateConfig` function's config update builder

### File: `src/components/clients/EditClientDialog.tsx`

**Bug fix:**
- Move `clientRelevantBoards` filtering inside `loadBoardAccess` so it uses the current `boardConfigs` at call time, not a stale closure
- Add debug console logs in `loadBoardAccess`

**Enhancement 1 — Team-only boards section:**
- Compute `teamOnlyBoards` from `boardConfigs` where `target_audience === 'team'` and `is_active === true`
- Render a "Other Boards (Team only)" section below the existing board list
- Each item shows board name + "+ Make available" button
- Button calls a new `handleMakeAvailable(boardId)` function that:
  1. Updates `board_configs` set `target_audience = 'both'` via direct Supabase call (simpler than going through the full `updateConfig` which also handles member mappings)
  2. Shows success toast
  3. Resets `boardsLoaded` to false to re-trigger `loadBoardAccess` (the board now appears in the client-relevant list)
  4. Invalidates the board configs query

**Enhancement 2 — Link to boards page:**
- Add a small text block below the boards sections: "Don't see the board you need?" with a link to `/boards`
- Import `Link` from `react-router-dom`

**Import additions:**
- `Link` from `react-router-dom`
- `ExternalLink` icon is already imported (can reuse, or use `Plus` for the button)

### Layout of Boards Tab (after changes)

```text
Available Boards for Clients
+------------------------------------------+
| [x] Tasks                                |
|     Filter by Name: [______________]     |
+------------------------------------------+
| (or "No boards configured for clients")  |

Other Boards (Team only)
+------------------------------------------+
| Deliverables - Luxe Perfume Co.          |
|                    [+ Make available]     |
| Deliverables - FitFlow Coaching          |
|                    [+ Make available]     |
+------------------------------------------+
(hidden if no team-only boards exist)

Don't see the board you need? Configure a new board ->

                            [Save Board Access]
```

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useBoardConfigs.ts` | Add `target_audience` to `UpdateConfigInput` and `updateConfig` handler |
| `src/components/clients/EditClientDialog.tsx` | Fix pre-selection bug, add team-only boards section, add link to /boards |

## What Does NOT Change

- Details tab, Security tab
- Save logic for client_board_access (already works)
- useClients hook
- Board config creation flow
- Member-related functionality
