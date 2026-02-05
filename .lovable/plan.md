

# UI Improvements: Organization Visibility and Menu Access Control

## Overview

This plan implements three UI improvements to enhance organization visibility and properly restrict Board Views access based on user role.

---

## Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/layout/TopNavbar.tsx` | UPDATE | Add organization name to profile dropdown |
| `src/components/layout/AppSidebar.tsx` | UPDATE | Add org name header above nav items + restrict Board Views to owners |

---

## 1. Show Organization Name in Profile Dropdown

### File: `src/components/layout/TopNavbar.tsx`

**Update auth hook destructuring (line 19):**

```typescript
const { profile, signOut, organization } = useAuth();
```

**Update the dropdown content (lines 60-66):**

Change:
```tsx
<DropdownMenuContent align="end" className="w-56">
  <div className="flex items-center justify-start gap-2 p-2">
    <div className="flex flex-col space-y-1 leading-none">
      <p className="font-medium">{displayName}</p>
      <p className="text-xs text-muted-foreground">{profile?.email}</p>
    </div>
  </div>
```

To:
```tsx
<DropdownMenuContent align="end" className="w-56">
  <div className="flex items-center justify-start gap-2 p-2">
    <div className="flex flex-col space-y-1 leading-none">
      <p className="font-medium">{displayName}</p>
      <p className="text-xs text-muted-foreground">{profile?.email}</p>
      {organization && (
        <p className="text-xs text-primary font-medium">{organization.name}</p>
      )}
    </div>
  </div>
```

---

## 2. Show Organization Name Above Navigation in Sidebar

### File: `src/components/layout/AppSidebar.tsx`

**Add organization header inside SidebarContent (before the first SidebarGroup at line 103):**

```tsx
<SidebarContent>
  {/* Organization name header (visible when expanded) */}
  {!isCollapsed && organization && (
    <div className="px-4 pt-4 pb-2">
      <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 mb-1">
        Organization
      </p>
      <p className="text-sm font-semibold text-primary truncate">
        {organization.name}
      </p>
    </div>
  )}

  <SidebarGroup>
    {/* ... existing nav items ... */}
  </SidebarGroup>
```

This displays the organization name prominently above all navigation items so members immediately know which organization they're in.

---

## 3. Hide Board Views from Non-Owners

### File: `src/components/layout/AppSidebar.tsx`

**Modify the Board Views section (lines 125-185):**

The current code shows Board Views to all authenticated users. We need to wrap it with an owner check.

Change (lines 125-126):
```tsx
{/* Board Views Section - shown for all authenticated users */}
{activeViews.length > 0 && (
```

To:
```tsx
{/* Board Views Section - shown only for owners */}
{isOwner && activeViews.length > 0 && (
```

The second Board Views block (lines 187-207) already has `isOwner &&` check, so that's correct.

**Result:**
- Members see: My Tasks, Settings (no Board Views)
- Owners see: Dashboard, Organization, Integrations, Boards, Templates, Activity, Settings, + Board Views section

---

## Visual Summary

### Profile Dropdown (Top Right)
```text
┌─────────────────────┐
│ John Smith          │
│ john@email.com      │
│ Acme Corp           │ ← NEW (primary color)
├─────────────────────┤
│ Profile             │
│ Settings            │
├─────────────────────┤
│ Sign out            │
└─────────────────────┘
```

### Sidebar (For Members)
```text
┌───────────────────────────┐
│      [MondayEase Logo]    │
├───────────────────────────┤
│ ORGANIZATION              │ ← NEW
│ Acme Corp                 │ ← NEW (primary color)
├───────────────────────────┤
│ 📋 My Tasks               │
│ ⚙️ Settings               │
│                           │
│ (No Board Views section)  │ ← HIDDEN for members
├───────────────────────────┤
│ [User avatar + info]      │
└───────────────────────────┘
```

### Sidebar (For Owners)
```text
┌───────────────────────────┐
│      [MondayEase Logo]    │
├───────────────────────────┤
│ ORGANIZATION              │
│ Acme Corp                 │
├───────────────────────────┤
│ 📊 Dashboard              │
│ 🏢 Organization           │
│ 🔌 Integrations           │
│ 📋 Boards                 │
│ ⚡ Templates              │
│ 📈 Activity               │
│ ⚙️ Settings               │
├───────────────────────────┤
│ BOARD VIEWS               │ ← VISIBLE for owners
│   📊 Sales Pipeline       │
│   📋 Project Status       │
│   ⚙️ Manage views         │
├───────────────────────────┤
│ [User avatar + info]      │
└───────────────────────────┘
```

---

## Files Summary

| File | Lines Changed | Description |
|------|---------------|-------------|
| `src/components/layout/TopNavbar.tsx` | ~5 lines | Add organization to profile dropdown |
| `src/components/layout/AppSidebar.tsx` | ~12 lines | Add org header + restrict Board Views |

