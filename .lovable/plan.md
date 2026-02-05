
# Move Sidebar Collapse Toggle to Header + Add Org Logo

## Overview

This plan relocates the collapse/expand toggle from the sidebar footer to the header (next to the MondayEase logo) following standard UX patterns, and adds the organization logo next to the organization name.

---

## Changes Summary

| Location | Action | Description |
|----------|--------|-------------|
| SidebarHeader (lines 77-91) | UPDATE | Add collapse toggle button next to logo |
| Organization section (lines 94-104) | UPDATE | Add org logo avatar before org name |
| SidebarFooter (lines 213-258) | UPDATE | Remove collapse toggle, keep only Settings + Sign Out |
| Imports | UPDATE | Add `ChevronLeft`, `ChevronRight` icons and `Button` component |

---

## 1. Update Imports

Add the missing imports:

```tsx
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
```

Note: `ChevronsLeft` and `ChevronsRight` can be removed since we'll use the single chevron variants instead.

---

## 2. Update SidebarHeader with Collapse Toggle

**Replace lines 77-91 with:**

```tsx
<SidebarHeader className="border-b border-sidebar-border p-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      {isCollapsed ? (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          M
        </div>
      ) : (
        <img
          src={mondayeaseLogo}
          alt="MondayEase"
          className="h-10 w-auto"
        />
      )}
    </div>
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
    >
      {isCollapsed ? (
        <ChevronRight className="h-4 w-4" />
      ) : (
        <ChevronLeft className="h-4 w-4" />
      )}
    </Button>
  </div>
</SidebarHeader>
```

**Key changes:**
- Wrapped logo in flex container with `justify-between`
- Added toggle button on the right side
- Uses `ChevronLeft`/`ChevronRight` (single arrow) instead of double chevrons
- Toggle button has subtle styling that fits the dark sidebar

---

## 3. Add Organization Logo to Org Name Section

**Replace lines 94-104 with:**

```tsx
{/* Organization name header with logo (visible when expanded) */}
{!isCollapsed && organization && (
  <div className="px-4 pt-4 pb-2">
    <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 mb-2">
      Organization
    </p>
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6">
        {organization.logo_url ? (
          <AvatarImage 
            src={`${supabase.storage.from('org-logos').getPublicUrl(organization.logo_url).data.publicUrl}?t=${Date.now()}`}
            alt={organization.name}
          />
        ) : null}
        <AvatarFallback className="bg-primary/20 text-primary text-xs">
          {organization.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <p className="text-sm font-semibold text-sidebar-accent-foreground truncate">
        {organization.name}
      </p>
    </div>
  </div>
)}
```

**Key changes:**
- Added small Avatar (24x24) before org name
- Shows org logo if available, fallback to first letter
- Uses cache-busting URL for logo freshness

---

## 4. Simplify SidebarFooter

**Replace lines 213-258 with:**

```tsx
<SidebarFooter className="border-t border-sidebar-border p-2">
  <SidebarMenu>
    {/* Settings */}
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip="Settings">
        <NavLink
          to="/settings"
          className="flex items-center gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeClassName="bg-sidebar-accent text-primary font-medium"
        >
          <Settings className="h-4 w-4" />
          {!isCollapsed && <span>Settings</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>

    {/* Sign Out */}
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleSignOut}
        tooltip="Sign Out"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4 w-4" />
        {!isCollapsed && <span>Sign Out</span>}
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarFooter>
```

**Key changes:**
- Removed the Collapse toggle menu item (lines 215-231)
- Footer now only contains Settings and Sign Out

---

## Visual Summary

### Before
```text
┌─────────────────────────────┐
│       [MondayEase Logo]     │  <- Header (no toggle)
├─────────────────────────────┤
│ ORGANIZATION                │
│ Acme Corp                   │
│ ...nav items...             │
├─────────────────────────────┤
│ [<<] Collapse               │  <- Toggle in footer
│ [⚙] Settings                │
│ [→] Sign Out                │
└─────────────────────────────┘
```

### After
```text
┌─────────────────────────────┐
│ [Logo]                 [<]  │  <- Toggle in header
├─────────────────────────────┤
│ ORGANIZATION                │
│ [🏢] Acme Corp              │  <- Org logo added
│ ...nav items...             │
├─────────────────────────────┤
│ [⚙] Settings                │  <- Cleaner footer
│ [→] Sign Out                │
└─────────────────────────────┘
```

---

## Files Summary

| File | Lines Changed | Description |
|------|---------------|-------------|
| `src/components/layout/AppSidebar.tsx` | ~35 lines | Move toggle to header, add org logo, simplify footer |
