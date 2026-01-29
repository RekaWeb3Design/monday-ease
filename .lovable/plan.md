

## MondayEase Foundation - Implementation Plan

### Overview
Setting up a clean, professional SaaS application shell with a dark sidebar layout, mock authentication, and placeholder pages ready for future feature development.

---

### 1. Design System Update
- Update `index.css` with the MondayEase color palette (blue primary #0073ea, dark sidebar)
- Configure both light and dark mode CSS variables
- Keep light mode as default for now

---

### 2. Layout Components

**AppLayout.tsx**
- Main wrapper that combines sidebar + content area
- Uses shadcn's SidebarProvider for state management
- Responsive: sidebar hidden on mobile with hamburger toggle

**AppSidebar.tsx**
- Dark themed sidebar (280px → 80px collapsed)
- Logo: "MondayEase" text with blue accent (collapses to "ME" icon)
- Navigation menu with icons:
  - Dashboard, Organization, Templates, Activity, Settings
- User section at bottom with avatar placeholder
- Collapse button that toggles to icon-only mode

**TopNavbar.tsx**
- Simple header bar above main content
- Left: Breadcrumb placeholder showing current page
- Right: Theme toggle button (visual only) + User avatar dropdown trigger

---

### 3. Authentication Setup

**AuthContext.tsx**
- Create context providing user state and auth methods
- Mock implementation (no persistence):
  - `signIn` → sets mock user in state
  - `signUp` → sets mock user in state
  - `signOut` → clears user state
- Loading state for future async operations

**useAuth.ts**
- Custom hook to consume AuthContext easily

---

### 4. Pages

**Auth.tsx**
- Centered card layout with MondayEase branding
- Tab interface: "Sign In" / "Sign Up"
- Form validation with error states
- Redirects to Dashboard on success

**Dashboard.tsx**
- Page title with welcome message
- 4-card grid showing placeholder stats
- Clean, minimal design ready for real data

**NotFound.tsx** (update existing)
- Friendly 404 page with link back to home

---

### 5. Routing & App Structure

```
/auth      → Auth page (sign in/up)
/          → Dashboard (wrapped in AppLayout)
/*         → NotFound page
```

- Protected route logic placeholder (for when real auth is added)

---

### 6. Type Definitions

**types/index.ts**
- User type
- Navigation item type
- Auth context types

---

### Visual Summary

```
┌─────────────────────────────────────────────────┐
│ ┌──────────┐ ┌────────────────────────────────┐ │
│ │          │ │ TopNavbar (breadcrumb + user)  │ │
│ │  App     │ ├────────────────────────────────┤ │
│ │  Sidebar │ │                                │ │
│ │  (dark)  │ │      Main Content Area         │ │
│ │          │ │      (Dashboard, etc.)         │ │
│ │  280px   │ │                                │ │
│ │    ↕     │ │                                │ │
│ │  80px    │ │                                │ │
│ └──────────┘ └────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

### What's NOT Included (as requested)
- ❌ Supabase integration (placeholder file only)
- ❌ Real authentication
- ❌ Database schemas
- ❌ Working dark mode (button only)
- ❌ Business logic

