

# Bug Fixes: Sidebar Styling, Settings Position, and Org Logo RLS

## Overview

This plan addresses three issues: organization name visibility in the dark sidebar, Settings link positioning in the footer, and the RLS policy for org logo uploads.

---

## Changes Summary

| File/Resource | Action | Description |
|---------------|--------|-------------|
| `src/components/layout/AppSidebar.tsx` | UPDATE | Fix organization name text color to white |
| `src/components/layout/AppSidebar.tsx` | UPDATE | Add Settings link to footer above Sign Out |
| `src/components/layout/AppSidebar.tsx` | UPDATE | Remove Settings from main nav items |
| Supabase Migration | CREATE | Fix RLS policies for org-logos bucket with proper type casting |

---

## 1. Fix Organization Name Text Color

### File: `src/components/layout/AppSidebar.tsx`

**Issue:** The organization name uses `text-primary` (green) which can be hard to read against the dark sidebar background.

**Lines 99-104 - Change to:**
```tsx
{!isCollapsed && organization && (
  <div className="px-4 pt-4 pb-2">
    <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
      Organization
    </p>
    <p className="text-sm font-semibold text-white truncate">
      {organization.name}
    </p>
  </div>
)}
```

**Changes:**
- Line 99: Change `text-sidebar-foreground/50` to `text-gray-400`
- Line 102: Change `text-primary` to `text-white`

---

## 2. Move Settings to Sidebar Footer

### File: `src/components/layout/AppSidebar.tsx`

**Step A: Remove Settings from main nav arrays**

**Lines 38-46 (ownerNavItems):**
```tsx
const ownerNavItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Organization", url: "/organization", icon: Building2 },
  { title: "Integrations", url: "/integrations", icon: Plug },
  { title: "Boards", url: "/boards", icon: LayoutGrid },
  { title: "Templates", url: "/templates", icon: Zap },
  { title: "Activity", url: "/activity", icon: Activity },
  // Remove Settings from here
];
```

**Lines 49-52 (memberNavItems):**
```tsx
const memberNavItems: NavItem[] = [
  { title: "My Tasks", url: "/member", icon: ClipboardList },
  // Remove Settings from here
];
```

**Step B: Add Settings link to footer**

Add import for `Link`:
```tsx
import { Link } from "react-router-dom";
```

**Lines 215-246 - Replace footer with:**
```tsx
<SidebarFooter className="border-t border-sidebar-border p-2">
  <SidebarMenu>
    {/* Collapse toggle */}
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={toggleSidebar}
        tooltip={isCollapsed ? "Expand" : "Collapse"}
        className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        {isCollapsed ? (
          <ChevronsRight className="h-4 w-4" />
        ) : (
          <>
            <ChevronsLeft className="h-4 w-4" />
            <span>Collapse</span>
          </>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>

    {/* Settings */}
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip="Settings">
        <Link 
          to="/settings" 
          className="flex items-center gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Settings className="h-4 w-4" />
          {!isCollapsed && <span>Settings</span>}
        </Link>
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

---

## 3. Fix Org Logo Upload RLS Policy

### Database Migration

The current RLS policies for the `org-logos` bucket need proper type casting to match the organization ID correctly.

```sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Org owners can upload logo" ON storage.objects;
DROP POLICY IF EXISTS "Org owners can update logo" ON storage.objects;

-- Create corrected INSERT policy with explicit type casting
CREATE POLICY "Org owners can upload logo" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id::text = (storage.foldername(name))[1]::text
    AND owner_id = auth.uid()
  )
);

-- Create corrected UPDATE policy
CREATE POLICY "Org owners can update logo" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id::text = (storage.foldername(name))[1]::text
    AND owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id::text = (storage.foldername(name))[1]::text
    AND owner_id = auth.uid()
  )
);

-- Add DELETE policy so owners can replace logos
CREATE POLICY "Org owners can delete logo" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id::text = (storage.foldername(name))[1]::text
    AND owner_id = auth.uid()
  )
);
```

**Key Fix:** The explicit `::text` casting on both `id` and the folder name array element ensures proper comparison between the UUID and the extracted folder name string.

---

## Visual Changes

### Sidebar Footer (After)
```text
┌─────────────────────────────┐
│ [<<] Collapse               │
│ [⚙️] Settings               │
│ [→] Sign Out  (red)         │
└─────────────────────────────┘
```

### Organization Header (After)
```text
┌─────────────────────────────┐
│ ORGANIZATION     (gray)     │
│ Acme Corp        (white)    │
└─────────────────────────────┘
```

---

## Files Summary

| File | Lines Changed | Description |
|------|---------------|-------------|
| `src/components/layout/AppSidebar.tsx` | ~15 lines | Fix text colors + restructure footer |
| Supabase Migration | ~40 lines | Fix RLS policies with proper casting |

