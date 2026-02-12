

# Add Demo Dashboard Page

## Overview

Add a new "/demo-dashboard" route with a showcase page for client demos, and a new sidebar section labeled "Ugyfél Demo" with a purple "DEMO" badge.

## Changes

### 1. New file: `src/pages/DemoDashboard.tsx`

A new page component with:
- Header: "Smart Dashboard -- Demo" title + Hungarian subtitle
- Amber demo-mode banner with the specified text and styling (`bg-amber-50 border-amber-200 text-amber-800`)
- Decorative workspace selector badge showing "TechnoSolutions Kft." with a green dot
- shadcn `Tabs` component with 4 tabs: Attekintes (default), Feladatok, Csapat, Idovonal
- Each tab shows a placeholder `Card` with the tab name and "Hamarosan..." text

### 2. Modified: `src/App.tsx`

Add a new protected route at `/demo-dashboard` wrapped in `ProtectedRoute > RequireOrganization > AppLayout`, following the exact same pattern as all other routes (e.g., `/boards`, `/templates`).

### 3. Modified: `src/components/layout/AppSidebar.tsx`

Add a new `SidebarGroup` after the Board Views section (before `SidebarFooter`) visible only for owners (`isOwner`):
- `SidebarGroupLabel`: "Ugyfél Demo"
- Single menu item: "Demo Dashboard" with `LayoutDashboard` icon, linking to `/demo-dashboard`
- A small purple badge (`bg-purple-100 text-purple-700 text-[10px] px-1.5 rounded-full`) showing "DEMO" next to the label text

## Technical Details

### DemoDashboard.tsx structure
```tsx
// Imports: Tabs/TabsList/TabsTrigger/TabsContent, Card/CardHeader/CardContent, Badge
// No data fetching needed -- purely static/decorative content

<div className="space-y-6">
  {/* Header */}
  <div>
    <h1>Smart Dashboard — Demo</h1>
    <p>Hungarian subtitle</p>
  </div>

  {/* Amber banner */}
  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3">...</div>

  {/* Workspace selector + Tabs */}
  <div className="flex items-center justify-between">
    <Tabs defaultValue="attekintes">
      <TabsList>4 triggers</TabsList>
    </Tabs>
    <Badge>TechnoSolutions Kft.</Badge>
  </div>

  {/* Tab content: 4 placeholder cards */}
</div>
```

### Sidebar addition (owner-only, after Board Views)
```tsx
{isOwner && (
  <SidebarGroup>
    <SidebarGroupLabel>Ugyfél Demo</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Demo Dashboard">
            <NavLink to="/demo-dashboard" ...>
              <LayoutDashboard />
              <span>Demo Dashboard</span>
              <span className="bg-purple-100 text-purple-700 ...">DEMO</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
)}
```

## Files

| File | Action |
|------|--------|
| `src/pages/DemoDashboard.tsx` | Create |
| `src/App.tsx` | Add route |
| `src/components/layout/AppSidebar.tsx` | Add sidebar section |

