

# Add View Switcher Dropdown to CustomViewPage

## Overview

Add a dropdown in the CustomViewPage header that allows users to quickly switch between different board views without going back to the management page. The dropdown shows the current view with its icon and lists all active views from the organization.

---

## File to Modify

**`src/pages/CustomViewPage.tsx`**

---

## Implementation Details

### Current Header Structure (lines 258-282)

The header currently has:
- Back button (links to `/board-views`)
- Icon container with view icon
- Static view name as `<h1>`
- Badge with board name

### New Header Structure

Replace the static view name area with a Select dropdown:

```
[← Back] [Icon] [View Switcher Dropdown ▼]
                   └─ Board name badge | Updated time
```

---

### Changes Required

#### 1. Update Header Section (lines 266-281)

Replace the static view name display with a Select dropdown:

```tsx
<div className="flex items-center gap-3">
  <Button variant="ghost" size="icon" asChild>
    <Link to="/board-views">
      <ArrowLeft className="h-5 w-5" />
    </Link>
  </Button>
  
  {/* View Switcher Dropdown */}
  <Select 
    value={view.slug} 
    onValueChange={(slug) => navigate(`/board-views/${slug}`)}
  >
    <SelectTrigger className="w-[280px] h-10">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
          <IconComponent className="h-4 w-4" />
        </div>
        <span className="font-semibold truncate">{view.name}</span>
      </div>
    </SelectTrigger>
    <SelectContent>
      {views.filter(v => v.is_active).map((v) => {
        const VIcon = getIconByName(v.icon);
        return (
          <SelectItem key={v.id} value={v.slug}>
            <div className="flex items-center gap-2 w-full">
              <VIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{v.name}</span>
              <span className="text-xs text-muted-foreground ml-auto truncate max-w-[100px]">
                {v.monday_board_name}
              </span>
            </div>
          </SelectItem>
        );
      })}
    </SelectContent>
  </Select>
  
  {/* Board info badge */}
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Badge variant="secondary" className="text-xs">
      {view.monday_board_name}
    </Badge>
    {view.updated_at && (
      <span className="text-xs hidden sm:inline">
        Updated {format(new Date(view.updated_at), "MMM d, h:mm a")}
      </span>
    )}
  </div>
</div>
```

---

## Visual Layout

```text
+------------------------------------------------------------------+
| [←] [📊 Current View Name ▼]  [Board Badge] Updated Jan 30      |
|                                                                  |
|     Dropdown expanded:                                           |
|     ┌────────────────────────────────┐                          |
|     │ 📊 Current View    Board Name  │  ← Highlighted           |
|     │ 📋 Sales Pipeline  CRM Board   │                          |
|     │ 👥 Team Tasks      Projects    │                          |
|     │ 📅 Deadlines       Planning    │                          |
|     └────────────────────────────────┘                          |
+------------------------------------------------------------------+
```

---

## Behavior Summary

| Action | Result |
|--------|--------|
| Click dropdown | Shows all active views from organization |
| Select different view | Navigates to `/board-views/{slug}` |
| Current view | Automatically highlighted in dropdown |
| Click back arrow | Goes to `/board-views` management page |

---

## Styling Details

| Element | Style |
|---------|-------|
| Dropdown trigger | `w-[280px] h-10` for comfortable size |
| View icon in trigger | Wrapped in colored container matching sidebar |
| View name | Font-semibold, truncated if too long |
| Board name in options | `text-xs text-muted-foreground`, right-aligned |
| Current selection | Native Select highlighting |

---

## No New Imports Needed

All required components are already imported:
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` (line 17-23)
- `useNavigate` (line 2)
- `getIconByName` (line 26)
- `views` from `useCustomBoardViews` (line 41)

