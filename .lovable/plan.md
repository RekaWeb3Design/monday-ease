

# Fix Board Config Filtering with JavaScript-Based Approach

## Problem

The Supabase `.or()` query filter is not working correctly, causing boards to appear in both active AND inactive sections simultaneously. This is a critical bug that breaks the account isolation feature.

## Solution

Replace the two separate Supabase queries with a single query that fetches ALL configs, then filter in JavaScript to correctly separate active vs inactive boards.

---

## Changes Summary

| File | Changes |
|------|---------|
| `src/hooks/useBoardConfigs.ts` | Rewrite fetchConfigs to fetch all and filter in JS |
| `src/pages/BoardConfig.tsx` | Add grouping of inactive configs by account ID |

---

## 1. Rewrite `useBoardConfigs.ts` - fetchConfigs Function

### Current Approach (Broken)
- Query 1: Uses `.or()` filter for active configs
- Query 2: Uses `.neq()` filter for inactive configs
- Both filters appear to malfunction with Supabase

### New Approach (Reliable)
- Single query: Fetch ALL configs for the organization
- JavaScript filter: Separate into active vs inactive arrays
- 100% reliable string comparison in JS

### Key Changes

```typescript
const fetchConfigs = useCallback(async () => {
  if (!organization) {
    setConfigs([]);
    setInactiveConfigs([]);
    setIsLoading(false);
    return;
  }

  setIsLoading(true);

  try {
    // Fetch ALL configs for this organization (no account filter in query)
    const { data: allConfigsData, error: configsError } = await supabase
      .from("board_configs")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });

    if (configsError) throw configsError;

    const allConfigs = allConfigsData || [];
    const currentAccountId = integration?.monday_account_id;

    // JavaScript filtering - 100% reliable
    // ACTIVE: monday_account_id is NULL (legacy) OR matches current account
    const activeConfigsRaw = allConfigs.filter(config => 
      config.monday_account_id === null || 
      config.monday_account_id === currentAccountId
    );

    // INACTIVE: monday_account_id is NOT NULL AND does NOT match current account
    const inactiveConfigsRaw = allConfigs.filter(config => 
      config.monday_account_id !== null && 
      config.monday_account_id !== currentAccountId
    );

    // Fetch member access for ACTIVE configs only
    const activeConfigIds = activeConfigsRaw.map(c => c.id);
    let accessData: MemberBoardAccess[] = [];
    
    if (activeConfigIds.length > 0) {
      const { data: accessResult, error: accessError } = await supabase
        .from("member_board_access")
        .select("*")
        .in("board_config_id", activeConfigIds);

      if (accessError) throw accessError;
      accessData = (accessResult || []) as MemberBoardAccess[];
    }

    // Map active configs with member access
    const activeConfigs: BoardConfigWithAccess[] = activeConfigsRaw.map(config => ({
      ...mapConfigFields(config),
      memberAccess: accessData.filter(a => a.board_config_id === config.id),
    }));

    // Map inactive configs (no member access needed - read-only)
    const inactiveConfigs: BoardConfigWithAccess[] = inactiveConfigsRaw.map(config => ({
      ...mapConfigFields(config),
      memberAccess: [],
    }));

    setConfigs(activeConfigs);
    setInactiveConfigs(inactiveConfigs);
  } catch (err) {
    // ... error handling
  } finally {
    setIsLoading(false);
  }
}, [organization, integration?.monday_account_id, toast]);
```

### Helper Function (Extract for DRY)

```typescript
// Helper to map raw config to typed config
const mapConfigFields = (config: any): Omit<BoardConfigWithAccess, 'memberAccess'> => ({
  id: config.id,
  organization_id: config.organization_id,
  monday_board_id: config.monday_board_id,
  board_name: config.board_name,
  filter_column_id: config.filter_column_id,
  filter_column_name: config.filter_column_name,
  filter_column_type: config.filter_column_type,
  visible_columns: (config.visible_columns as string[]) || [],
  is_active: config.is_active ?? true,
  monday_account_id: config.monday_account_id,
  created_at: config.created_at,
  updated_at: config.updated_at,
});
```

---

## 2. Update `BoardConfig.tsx` - Group Inactive by Account

### Add useMemo Import and Grouping Logic

```typescript
import { useState, useMemo } from "react";
import { Building2 } from "lucide-react";

// Group inactive configs by monday_account_id
const groupedInactiveConfigs = useMemo(() => {
  const groups: Record<string, BoardConfigWithAccess[]> = {};
  inactiveConfigs.forEach(config => {
    const accountId = config.monday_account_id || 'unknown';
    if (!groups[accountId]) {
      groups[accountId] = [];
    }
    groups[accountId].push(config);
  });
  return groups;
}, [inactiveConfigs]);
```

### Update Collapsible Content Rendering

```typescript
<CollapsibleContent>
  <div className="space-y-6 mt-4">
    {Object.entries(groupedInactiveConfigs).map(([accountId, configsGroup]) => (
      <div key={accountId} className="space-y-3">
        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Account: {accountId}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
          {configsGroup.map(config => (
            <InactiveBoardCard key={config.id} config={config} />
          ))}
        </div>
      </div>
    ))}
  </div>
</CollapsibleContent>
```

---

## Data Flow Diagram

```text
                    FETCH ALL CONFIGS
                           │
    supabase.from("board_configs")
    .eq("organization_id", org.id)
    .order("created_at", desc)
                           │
                           ▼
                    allConfigs[]
                           │
        ┌──────────────────┴──────────────────┐
        │                                      │
        ▼                                      ▼
  JS Filter: ACTIVE                    JS Filter: INACTIVE
  monday_account_id = null             monday_account_id != null
  OR = current                         AND != current
        │                                      │
        ▼                                      ▼
  activeConfigsRaw[]                   inactiveConfigsRaw[]
        │                                      │
        │                                      ▼
        │                              Group by account_id
        ▼                                      │
  Fetch memberAccess[]                         │
        │                                      │
        ▼                                      ▼
  setConfigs()                         setInactiveConfigs()
```

---

## Why This Works

1. **Single Source of Truth**: One query returns ALL configs - no chance of overlap
2. **Reliable JS Filtering**: JavaScript `===` comparison is 100% reliable for strings
3. **Mutually Exclusive**: The filter conditions are logically exclusive:
   - Active: `null OR matches`
   - Inactive: `NOT null AND NOT matches`
4. **Clear Account Grouping**: Users can see which boards belong to which account

---

## File Changes Summary

### `src/hooks/useBoardConfigs.ts`
- Remove `.or()` and `.neq()` Supabase filters
- Fetch all configs in single query
- Add `mapConfigFields` helper function
- Filter active/inactive in JavaScript
- Only fetch member access for active configs

### `src/pages/BoardConfig.tsx`
- Add `useMemo` import
- Add `Building2` icon import
- Add `groupedInactiveConfigs` memo
- Update CollapsibleContent to render grouped accounts

