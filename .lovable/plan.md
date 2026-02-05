

# Bug Fixes: Settings Page and Sidebar Improvements

## Overview

This plan fixes four issues: avatar persistence after navigation, the broken "Change Photo" button, sidebar footer redesign, and making settings fields editable.

---

## Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/contexts/AuthContext.tsx` | UPDATE | Add `refreshProfile` function |
| `src/types/index.ts` | UPDATE | Add `refreshProfile` to AuthContextType |
| `src/pages/Settings.tsx` | UPDATE | Fix button ID mismatch + add edit functionality |
| `src/components/layout/AppSidebar.tsx` | UPDATE | Redesign footer with Settings & Sign Out |

---

## 1. Add refreshProfile to AuthContext

### File: `src/types/index.ts`

Add `refreshProfile` to the interface (line 57):

```typescript
export interface AuthContextType {
  // ... existing properties ...
  refreshOrganization: () => Promise<void>;
  refreshProfile: () => Promise<void>;  // NEW
}
```

### File: `src/contexts/AuthContext.tsx`

Add the function after `refreshOrganization` (around line 118):

```typescript
// Refresh profile data
const refreshProfile = useCallback(async () => {
  if (user) {
    const userProfile = await fetchProfile(user.id);
    setProfile(userProfile);
  }
}, [user, fetchProfile]);
```

Add to the context value (line 281):

```typescript
<AuthContext.Provider
  value={{
    // ... existing values ...
    refreshOrganization,
    refreshProfile,  // NEW
  }}
>
```

---

## 2. Fix "Change Photo" Button

### File: `src/pages/Settings.tsx`

**Issue:** The Label has `htmlFor="avatar-upload-btn"` but Input has `id="avatar-upload"` - they don't match!

**Fix (line 124):** Change the htmlFor to match the input ID:

From:
```tsx
<Label htmlFor="avatar-upload-btn" className="cursor-pointer">
```

To:
```tsx
<Label htmlFor="avatar-upload" className="cursor-pointer">
```

**Also update to call refreshProfile (line 80):**

From:
```tsx
await refreshOrganization();
```

To:
```tsx
await refreshProfile();
```

---

## 3. Make Settings Fields Editable

### File: `src/pages/Settings.tsx`

Add state and handler for editing the full name:

```typescript
// Add imports
import { Pencil } from "lucide-react";

// Add state
const [isEditing, setIsEditing] = useState(false);
const [editName, setEditName] = useState(profile?.full_name || "");
const [isSaving, setIsSaving] = useState(false);

// Sync editName when profile changes
useEffect(() => {
  setEditName(profile?.full_name || "");
}, [profile?.full_name]);

// Handler function
const handleSaveProfile = async () => {
  if (!user) return;
  
  setIsSaving(true);
  try {
    const { error } = await supabase
      .from("user_profiles")
      .update({ full_name: editName.trim() })
      .eq("id", user.id);
    
    if (error) throw error;
    
    await refreshProfile();
    setIsEditing(false);
    toast({ title: "Profile updated!" });
  } catch (err) {
    toast({ title: "Failed to save", variant: "destructive" });
  } finally {
    setIsSaving(false);
  }
};
```

**Updated Profile Info UI (replace lines 146-156):**

```tsx
{/* Profile Info */}
<div className="space-y-4 pt-4 border-t">
  <div className="space-y-1">
    <Label>Full Name</Label>
    {isEditing ? (
      <div className="flex gap-2">
        <Input 
          value={editName} 
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Your full name"
        />
        <Button onClick={handleSaveProfile} disabled={isSaving} size="sm">
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            setIsEditing(false);
            setEditName(profile?.full_name || "");
          }}
        >
          Cancel
        </Button>
      </div>
    ) : (
      <div className="flex items-center justify-between">
        <p className="text-sm">{profile?.full_name || "Not set"}</p>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            setEditName(profile?.full_name || "");
            setIsEditing(true);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    )}
  </div>
  <div className="space-y-1">
    <Label>Email</Label>
    <p className="text-sm text-muted-foreground">{profile?.email}</p>
    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
  </div>
</div>
```

---

## 4. Redesign Sidebar Footer

### File: `src/components/layout/AppSidebar.tsx`

**Add imports:**
```typescript
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
```

**Add signOut from useAuth:**
```typescript
const { profile, memberRole, organization, signOut } = useAuth();
const navigate = useNavigate();
```

**Add sign out handler:**
```typescript
const handleSignOut = async () => {
  await signOut();
  navigate("/auth");
};
```

**Replace entire SidebarFooter (lines 222-260):**

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

**Note:** Settings is already in the main nav items for both owners and members, so we don't need to duplicate it in the footer.

---

## Visual Summary

### Before (Sidebar Footer)
```text
┌─────────────────────────────┐
│ [<<]                        │
├─────────────────────────────┤
│ [Avatar] John Smith         │
│          Acme Corp          │
└─────────────────────────────┘
```

### After (Sidebar Footer)
```text
┌─────────────────────────────┐
│ [<<] Collapse               │
│ [→] Sign Out  (red)         │
└─────────────────────────────┘
```

### Settings Page - Profile Section
```text
┌─────────────────────────────────────┐
│ Profile                             │
│ Manage your profile information     │
├─────────────────────────────────────┤
│                                     │
│  [Avatar]   [Upload Photo]          │
│             JPG, PNG or WebP. Max   │
│             2MB.                    │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Full Name                          │
│  John Smith              [✏️ Edit]  │
│                                     │
│  Email                              │
│  john@example.com                   │
│  Email cannot be changed            │
│                                     │
└─────────────────────────────────────┘
```

---

## Files Summary

| File | Lines Changed | Description |
|------|---------------|-------------|
| `src/types/index.ts` | +1 line | Add refreshProfile to interface |
| `src/contexts/AuthContext.tsx` | +10 lines | Add refreshProfile function |
| `src/pages/Settings.tsx` | ~50 lines | Fix button ID + add edit mode |
| `src/components/layout/AppSidebar.tsx` | ~30 lines | Redesign footer |

