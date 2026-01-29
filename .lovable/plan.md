

## Integrations Page - Basic UI Implementation

### Overview
Create an Integrations page where organization owners can view their Monday.com connection status and see upcoming integrations. This lays the groundwork for the OAuth connection flow.

---

### Architecture

```text
Integrations Page Structure:
┌─────────────────────────────────────────────────────────────────┐
│  Page Header                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ "Integrations"                                           │   │
│  │ "Connect your tools to unlock automation features"       │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  Integration Cards                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │ [Monday Logo]       │  │ [Slack Logo]        │              │
│  │ Monday.com          │  │ Slack               │              │
│  │ [Status Badge]      │  │ [Coming Soon]       │              │
│  │ Workspace: Acme     │  │                     │              │
│  │ Connected: Jan 15   │  │ [Grayed Out]        │              │
│  │ [Connect Button]    │  │                     │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                 │
│  ┌─────────────────────┐                                       │
│  │ [Notion Logo]       │                                       │
│  │ Notion              │                                       │
│  │ [Coming Soon]       │                                       │
│  └─────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/types/index.ts` | Modify | Add UserIntegration interface |
| `src/hooks/useIntegration.ts` | Create | Hook for fetching Monday integration |
| `src/pages/Integrations.tsx` | Create | Main integrations page |
| `src/App.tsx` | Modify | Add `/integrations` route |
| `src/components/layout/AppSidebar.tsx` | Modify | Add Integrations nav item |

---

### Implementation Details

#### 1. Update Types (src/types/index.ts)

Add a new interface for user integrations:

```typescript
export interface UserIntegration {
  id: string;
  user_id: string;
  integration_type: string;
  status: 'connected' | 'disconnected' | 'expired';
  workspace_name: string | null;
  monday_account_id: string | null;
  monday_user_id: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string[] | null;
  connected_at: string | null;
  last_used_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}
```

---

#### 2. Create useIntegration Hook

**Location:** `src/hooks/useIntegration.ts`

**Purpose:** Fetch the user's Monday.com integration status

**Returns:**
- `integration: UserIntegration | null` - The integration data
- `isLoading: boolean` - Loading state
- `isConnected: boolean` - Computed boolean for connected status
- `refetch: () => Promise<void>` - Refresh integration data

**Implementation:**
- Uses `useAuth()` to get current user
- Fetches from `user_integrations` table filtered by `user_id` and `integration_type = 'monday'`
- Returns null if no integration found
- Computes `isConnected` from `status === 'connected'`

---

#### 3. Create Integrations Page

**Location:** `src/pages/Integrations.tsx`

**Structure:**

**A. Page Header**
- Title: "Integrations" (h1, 2xl font)
- Subtitle: "Connect your tools to unlock automation features" (muted text)

**B. Monday.com Integration Card**
- Card with icon placeholder (colored square representing Monday.com logo - orange/red gradient)
- Title: "Monday.com"
- Description: "Connect your Monday.com account to sync boards and automate workflows"

**If NOT connected:**
- Status badge: "Not Connected" (gray/outline variant)
- Button: "Connect Monday.com" (green primary button, disabled)
- Tooltip on button: "Coming soon"

**If connected:**
- Status badge: "Connected" (green)
- Workspace name: "Workspace: {workspace_name}" (if available)
- Connected date: "Connected: {formatted date}"
- Button: "Disconnect" (red outline/destructive variant, disabled)
- Tooltip on button: "Coming soon"

**C. Future Integrations Section**
- Title: "Coming Soon" (h2, muted)
- Grid of grayed-out cards for:
  - **Slack** - "Get notifications and updates in your Slack channels"
  - **Notion** - "Sync documentation and notes with Notion"
- Each card has:
  - Icon placeholder (gray square)
  - Name
  - Brief description
  - "Coming Soon" badge (gray)
  - Entire card has reduced opacity (opacity-60)

---

#### 4. Update App.tsx

Add new route for integrations page:

```typescript
<Route
  path="/integrations"
  element={
    <ProtectedRoute>
      <RequireOrganization>
        <AppLayout pageTitle="Integrations">
          <Integrations />
        </AppLayout>
      </RequireOrganization>
    </ProtectedRoute>
  }
/>
```

---

#### 5. Update AppSidebar.tsx

Add Integrations to the navigation items array:

```typescript
const navItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Organization", url: "/organization", icon: Building2 },
  { title: "Integrations", url: "/integrations", icon: Plug },  // NEW
  { title: "Templates", url: "/templates", icon: Zap },
  { title: "Activity", url: "/activity", icon: Activity },
  { title: "Settings", url: "/settings", icon: Settings },
];
```

Import `Plug` icon from lucide-react.

---

### Styling Details

**Monday.com Card Colors:**
- Icon placeholder: gradient from `#FF3D57` to `#FFCB00` (Monday.com brand colors) or simple orange background `bg-orange-500`
- Status badges follow existing pattern:
  - Connected: `bg-[#01cb72] text-white`
  - Not Connected: default outline variant

**Future Integration Cards:**
- Reduced opacity: `opacity-60`
- Gray icon placeholder: `bg-gray-400`
- "Coming Soon" badge: gray/outline variant

**Responsive Layout:**
- Cards in a responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Stack on mobile, side-by-side on larger screens

---

### Date Formatting

Use `date-fns` for formatting the connected date:

```typescript
import { format } from "date-fns";

const formattedDate = integration?.connected_at 
  ? format(new Date(integration.connected_at), "MMM d, yyyy")
  : null;
```

---

### Error Handling

- Show loading skeleton while fetching integration
- Handle case where user has no integration (show "Not Connected" state)
- Toast errors if fetch fails

---

### User Experience Flow

1. User navigates to /integrations from sidebar
2. Page loads, hook fetches integration status
3. Monday.com card shows current status (connected or not)
4. Buttons are disabled with tooltips indicating "Coming soon"
5. Future integrations section shows what's planned

