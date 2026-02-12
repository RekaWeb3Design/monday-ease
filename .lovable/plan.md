

# Owner Dashboard — Visual Upgrade

## Overview

Transform the current basic dashboard into a visually impressive, data-rich overview with gradient stat cards, team overview, board summary, client summary, improved quick actions, and better activity styling.

## Changes

All changes are in a single file: `src/pages/Dashboard.tsx`

No database changes, no new hooks, no new dependencies required. All data is already available from the existing hooks (`useBoardConfigs`, `useOrganizationMembers`, `useClients`, `useWorkflowTemplates`, `useWorkflowExecutions`).

---

### 1. Enhanced Stats Cards

Each of the 4 stat cards gets:
- A subtle gradient background (blue for Boards, green for Members, purple for Templates, orange for Executions)
- Colored icon to match the gradient theme
- Larger number display (`text-3xl font-bold`)
- A static trend indicator line (e.g., "Active this month")

Implementation: Update the `stats` array to include gradient classes and icon colors, then update the card rendering JSX.

### 2. New: Team Overview Section

A card showing up to 5 organization members with:
- Avatar with initials (using shadcn Avatar component)
- Display name or email
- Role badge (Owner/Member/Admin, color-coded)
- Status badge (Active/Pending)
- Board access count (query `member_board_access` -- already available via `useBoardConfigs` configs' `memberAccess`)
- "View all" link to `/organization`

Data source: `useOrganizationMembers` hook (already imported). Board counts derived from cross-referencing `member_board_access` data from `useBoardConfigs`.

For simplicity, board counts per member will be computed by counting how many `memberAccess` entries exist per member across all configs. This avoids a separate query.

### 3. New: Board Activity Summary

A card showing up to 4 active board configs with:
- Board name
- `target_audience` badge (Team/Clients/Both)
- Member count (from `memberAccess` array length on each config)
- Visible column count
- "View all" link to `/boards`

Data source: `useBoardConfigs` hook (already imported, `configs` includes `memberAccess`).

### 4. New: Client Summary Card

A card showing up to 3 clients with:
- Company name
- Board access count (from `board_access_count` on `ClientWithAccessCount`)
- "Manage" link to `/clients`

Data source: Add `useClients` hook import.

### 5. Improved Quick Actions

Transform the flat outline buttons into card-like action items:
- Each action gets its own mini-card with a colored icon circle background
- Hover effect: `hover:shadow-md hover:scale-[1.02] transition-all`
- Keep the same 4 actions and destinations

### 6. Improved Recent Activity

- Better empty state: "No recent activity. Start by configuring a board!" with a CTA button
- Status badges with explicit colors: pending = yellow/amber, success = green, failed = red
- Slightly improved card styling for each activity item

### Layout

Desktop: 2-column grid for the middle sections (Team Overview + Boards on one row, Clients + Quick Actions on the next row). Stats stay in 4-column grid. Recent Activity spans full width at the bottom.

Mobile: Single column, everything stacks.

```text
Stats (4-col grid)
Team Overview (left) | Your Boards (right)
Your Clients (left)  | Quick Actions (right)
Recent Activity (full width)
```

---

## Technical Details

### File: `src/pages/Dashboard.tsx`

**New imports:**
- `useClients` from `@/hooks/useClients`
- `Avatar, AvatarFallback` from `@/components/ui/avatar`
- `Eye, ArrowRight, Building2` from `lucide-react`

**New data:**
```typescript
const { clients, isLoading: clientsLoading } = useClients();
```

**Stat cards gradient config:**
```typescript
const stats = [
  { ..., gradient: "from-blue-500/10 to-blue-600/5", iconColor: "text-blue-600" },
  { ..., gradient: "from-green-500/10 to-green-600/5", iconColor: "text-green-600" },
  { ..., gradient: "from-purple-500/10 to-purple-600/5", iconColor: "text-purple-600" },
  { ..., gradient: "from-orange-500/10 to-orange-600/5", iconColor: "text-orange-600" },
];
```

**Member board count computation:**
```typescript
const memberBoardCounts = new Map<string, number>();
configs.forEach(config => {
  config.memberAccess?.forEach(access => {
    memberBoardCounts.set(access.member_id, (memberBoardCounts.get(access.member_id) || 0) + 1);
  });
});
```

**Section layout:**
```tsx
<div className="grid gap-4 md:grid-cols-2">
  {/* Team Overview card */}
  {/* Your Boards card */}
</div>
<div className="grid gap-4 md:grid-cols-2">
  {/* Your Clients card */}
  {/* Quick Actions card */}
</div>
```

Each new section card uses skeleton loaders during loading and shows a helpful empty state when no data exists.

## What Does NOT Change

- All existing hooks and their data fetching logic
- The Getting Started Checklist component
- The Integration Warning Banner
- The `formatRelativeTime` and status helper functions
- No new database queries or tables
- No new components (everything stays in Dashboard.tsx for simplicity)

