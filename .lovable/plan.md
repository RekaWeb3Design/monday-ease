

## Board Configuration UI

### Overview
Create a Board Configuration page where organization owners can select Monday.com boards, configure filter columns, set visible columns, and map member access with filter values.

---

### Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         BoardConfig Page                            │
│  /boards (owner-only, protected)                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Header: "Board Configuration"          [+ Add Board]         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │ BoardConfigCard  │  │ BoardConfigCard  │  │ BoardConfigCard │   │
│  │                  │  │                  │  │                 │   │
│  │ - Board name     │  │ - Board name     │  │ - Board name    │   │
│  │ - Filter column  │  │ - Filter column  │  │ - Filter column │   │
│  │ - Member count   │  │ - Member count   │  │ - Member count  │   │
│  │ [Edit] [Delete]  │  │ [Edit] [Delete]  │  │ [Edit] [Delete] │   │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/BoardConfig.tsx` | Main page component |
| `src/components/boards/BoardConfigCard.tsx` | Card displaying board config |
| `src/components/boards/AddBoardDialog.tsx` | Multi-step dialog for adding boards |
| `src/hooks/useMondayBoards.ts` | Hook to fetch boards from edge function |
| `src/hooks/useBoardConfigs.ts` | Hook for CRUD operations on board configs |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Add "Boards" nav item (owner-only) |
| `src/App.tsx` | Add protected route for `/boards` |
| `src/types/index.ts` | Add BoardConfig and MemberBoardAccess types |

---

### Implementation Details

#### 1. Types (`src/types/index.ts`)

Add new interfaces:

```typescript
// Board config from database (board_configs table)
export interface BoardConfig {
  id: string;
  organization_id: string;
  monday_board_id: string;
  board_name: string;
  filter_column_id: string | null;
  filter_column_name: string | null;
  visible_columns: string[];
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

// Member board access from database (member_board_access table)
export interface MemberBoardAccess {
  id: string;
  board_config_id: string;
  member_id: string;
  filter_value: string;
  created_at: string | null;
  updated_at: string | null;
}

// Monday.com board from API
export interface MondayBoard {
  id: string;
  name: string;
  board_kind: string;
  columns: MondayColumn[];
}

// Monday.com column from API
export interface MondayColumn {
  id: string;
  title: string;
  type: string;
}
```

#### 2. useMondayBoards Hook (`src/hooks/useMondayBoards.ts`)

```typescript
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { MondayBoard } from "@/types";

interface UseMondayBoardsReturn {
  boards: MondayBoard[];
  isLoading: boolean;
  error: string | null;
  fetchBoards: () => Promise<void>;
}

export function useMondayBoards(): UseMondayBoardsReturn {
  const [boards, setBoards] = useState<MondayBoard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBoards = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        "https://yqjugovqhvxoxvrceqqp.supabase.co/functions/v1/get-monday-boards",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch boards");
      }

      const data = await response.json();
      setBoards(data.boards || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch boards";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { boards, isLoading, error, fetchBoards };
}
```

#### 3. useBoardConfigs Hook (`src/hooks/useBoardConfigs.ts`)

```typescript
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { BoardConfig, MemberBoardAccess } from "@/types";

interface BoardConfigWithAccess extends BoardConfig {
  memberAccess: MemberBoardAccess[];
}

interface CreateConfigInput {
  monday_board_id: string;
  board_name: string;
  filter_column_id: string | null;
  filter_column_name: string | null;
  visible_columns: string[];
  memberMappings: { member_id: string; filter_value: string }[];
}

interface UseBoardConfigsReturn {
  configs: BoardConfigWithAccess[];
  isLoading: boolean;
  createConfig: (input: CreateConfigInput) => Promise<void>;
  updateConfig: (id: string, updates: Partial<BoardConfig>) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useBoardConfigs(): UseBoardConfigsReturn {
  // Fetches board_configs for current organization
  // Includes member_board_access for each config
  // CRUD operations with toast notifications
  // ...implementation
}
```

#### 4. BoardConfigCard Component (`src/components/boards/BoardConfigCard.tsx`)

Features:
- Display board name, filter column, member count
- Edit and Delete buttons
- Collapsible section showing member mappings with filter values
- Uses existing Card, Badge, Button components
- Follows same styling patterns as Organization page

#### 5. AddBoardDialog Component (`src/components/boards/AddBoardDialog.tsx`)

Multi-step wizard:

**Step 1 - Select Board:**
- Dropdown fetching boards via useMondayBoards
- Shows board name and type
- Next button (disabled until board selected)

**Step 2 - Configure Columns:**
- Select "Filter Column" dropdown (columns from selected board)
- Checkboxes for "Visible Columns" multi-select
- Back and Next buttons

**Step 3 - Map Members:**
- List of organization members (from useOrganizationMembers)
- Text input for each member's filter value
- Back and Save buttons
- Calls createConfig on save

#### 6. BoardConfig Page (`src/pages/BoardConfig.tsx`)

Structure:
```tsx
export default function BoardConfig() {
  const { memberRole } = useAuth();
  const { configs, isLoading, deleteConfig, refetch } = useBoardConfigs();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Owner-only protection (same pattern as Organization page)
  if (memberRole !== "owner") {
    return <AccessRestrictedCard />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Board button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Board Configuration</h1>
          <p className="text-muted-foreground">
            Configure Monday.com boards and member access
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Board
        </Button>
      </div>

      {/* Empty state or grid of cards */}
      {configs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map((config) => (
            <BoardConfigCard 
              key={config.id} 
              config={config}
              onEdit={() => {/* open edit dialog */}}
              onDelete={() => deleteConfig(config.id)}
            />
          ))}
        </div>
      )}

      <AddBoardDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
```

#### 7. AppSidebar Update (`src/components/layout/AppSidebar.tsx`)

Add "Boards" navigation item visible only to owners:

```typescript
import { LayoutGrid } from "lucide-react";

// Add after Organization link in navItems
// Conditionally render based on profile.user_type === 'owner'

const ownerNavItems: NavItem[] = [
  { title: "Boards", url: "/boards", icon: LayoutGrid },
];

// In render, show ownerNavItems only when profile?.user_type === 'owner'
```

#### 8. App.tsx Update

Add protected route:

```tsx
import BoardConfig from "./pages/BoardConfig";

// Add before catch-all route:
<Route
  path="/boards"
  element={
    <ProtectedRoute>
      <RequireOrganization>
        <AppLayout pageTitle="Board Configuration">
          <BoardConfig />
        </AppLayout>
      </RequireOrganization>
    </ProtectedRoute>
  }
/>
```

---

### Technical Notes

**Edge Function Dependency:**
- The `get-monday-boards` edge function must be deployed in Supabase
- It should accept JWT in Authorization header
- Return format: `{ boards: MondayBoard[] }`

**Database Tables Used:**
- `board_configs` - Stores board configuration with RLS for owners
- `member_board_access` - Stores member filter value mappings
- `organization_members` - For listing members in step 3

**RLS Policies Already Configured:**
- Owners can CRUD board_configs for their organization
- Owners can CRUD member_board_access for their configs
- Members can view their own board access

**UI Consistency:**
- Follow existing patterns from Organization.tsx and Integrations.tsx
- Use same Badge styling for status indicators
- Use same Card patterns for content display
- Use Dialog pattern for multi-step wizard

