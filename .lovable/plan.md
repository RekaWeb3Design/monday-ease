

# Profile Picture and Organization Logo Upload

## Overview

This plan implements profile picture upload for all users and organization logo upload for owners. Both features use Supabase Storage with proper RLS policies.

---

## Changes Summary

| File/Resource | Action | Description |
|---------------|--------|-------------|
| Supabase Migration | CREATE | Add `logo_url` column to organizations table |
| Supabase Migration | CREATE | Create `avatars` and `org-logos` storage buckets with RLS |
| `src/pages/Settings.tsx` | CREATE | New Settings page with profile picture upload |
| `src/App.tsx` | UPDATE | Add `/settings` route |
| `src/pages/Organization.tsx` | UPDATE | Add organization logo upload UI |
| `src/types/index.ts` | UPDATE | Add `logo_url` to Organization interface |
| `src/components/layout/AppSidebar.tsx` | UPDATE | Display user avatar and org logo |
| `src/components/layout/TopNavbar.tsx` | UPDATE | Display user avatar in dropdown |

---

## Database Changes

### 1. Add logo_url to organizations table

```sql
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS logo_url TEXT;
```

### 2. Create Storage Buckets with RLS Policies

```sql
-- Create avatars bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create org-logos bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload/update their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can read avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- RLS: Org owners can upload/update org logo
CREATE POLICY "Org owners can upload logo" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM organizations 
    WHERE id::text = (storage.foldername(name))[1] 
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Org owners can update logo" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM organizations 
    WHERE id::text = (storage.foldername(name))[1] 
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Anyone can read org logos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'org-logos');
```

---

## 1. Create Settings Page

### File: `src/pages/Settings.tsx` (NEW)

This page will contain:
- Profile section with avatar upload
- Account settings (name, email display)
- Future extensibility for other settings

```tsx
import { useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Settings() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);

  const displayName = profile?.full_name || "User";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 2MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/profile.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Add cache-busting parameter
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ avatar_url: urlWithCacheBust })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBust);
      toast({ title: "Profile photo updated!" });
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={isUploading}>
                  <span>
                    <Camera className="mr-2 h-4 w-4" />
                    {avatarUrl ? "Change Photo" : "Upload Photo"}
                  </span>
                </Button>
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={isUploading}
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG or WebP. Max 2MB.
              </p>
            </div>
          </div>

          {/* Profile Info */}
          <div className="space-y-4 pt-4 border-t">
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <p className="text-sm">{profile?.full_name || "Not set"}</p>
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 2. Add Settings Route

### File: `src/App.tsx`

Add import and route for Settings page:

```tsx
// Add import at top
import Settings from "./pages/Settings";

// Add route (after /activity, before /board-views)
<Route
  path="/settings"
  element={
    <ProtectedRoute>
      <RequireOrganization>
        <AppLayout pageTitle="Settings">
          <Settings />
        </AppLayout>
      </RequireOrganization>
    </ProtectedRoute>
  }
/>
```

---

## 3. Add Organization Logo Upload

### File: `src/pages/Organization.tsx`

Add logo upload UI to the Organization header card.

**Add state and handler at top of component:**

```tsx
const [isUploadingLogo, setIsUploadingLogo] = useState(false);
const [logoUrl, setLogoUrl] = useState(organization?.logo_url || null);

const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !organization) return;

  if (file.size > 2 * 1024 * 1024) {
    toast({
      title: "File too large",
      description: "Please select an image under 2MB",
      variant: "destructive",
    });
    return;
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    toast({
      title: "Invalid file type",
      description: "Please upload a JPG, PNG, or WebP image",
      variant: "destructive",
    });
    return;
  }

  setIsUploadingLogo(true);
  try {
    const fileExt = file.name.split(".").pop();
    const filePath = `${organization.id}/logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("org-logos")
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("org-logos")
      .getPublicUrl(filePath);

    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ logo_url: urlWithCacheBust })
      .eq("id", organization.id);

    if (updateError) throw updateError;

    setLogoUrl(urlWithCacheBust);
    await refreshOrganization();
    toast({ title: "Organization logo updated!" });
  } catch (err) {
    toast({
      title: "Upload failed",
      variant: "destructive",
    });
  } finally {
    setIsUploadingLogo(false);
  }
};
```

**Update Organization Header Card UI:**

```tsx
<Card>
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Logo Upload */}
        <div className="relative group">
          <Avatar className="h-16 w-16">
            <AvatarImage src={logoUrl || undefined} alt={organization.name} />
            <AvatarFallback className="text-xl bg-primary text-primary-foreground">
              {organization.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Label 
            htmlFor="logo-upload" 
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {isUploadingLogo ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </Label>
          <Input
            id="logo-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleLogoUpload}
            disabled={isUploadingLogo}
          />
        </div>
        <div>
          <CardTitle className="text-2xl">{organization.name}</CardTitle>
          {/* Edit button */}
        </div>
      </div>
    </div>
  </CardHeader>
  {/* ... rest of card */}
</Card>
```

---

## 4. Update Types

### File: `src/types/index.ts`

Add `logo_url` to Organization interface:

```tsx
export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  monday_workspace_id: string | null;
  settings: Record<string, any> | null;
  max_members: number | null;
  logo_url: string | null;  // NEW
  created_at: string | null;
  updated_at: string | null;
}
```

---

## 5. Display Avatars Throughout App

### File: `src/components/layout/AppSidebar.tsx`

Update user section in footer to show avatar image:

```tsx
import { AvatarImage } from "@/components/ui/avatar";

// In footer user section:
<Avatar className="h-8 w-8 shrink-0">
  <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
    {avatarInitial}
  </AvatarFallback>
</Avatar>
```

Optionally add org logo next to org name in header section:

```tsx
{!isCollapsed && organization && (
  <div className="px-4 pt-4 pb-2 flex items-center gap-2">
    {organization.logo_url && (
      <Avatar className="h-6 w-6">
        <AvatarImage src={organization.logo_url} alt={organization.name} />
        <AvatarFallback className="text-xs">
          {organization.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
    )}
    <div>
      <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 mb-1">
        Organization
      </p>
      <p className="text-sm font-semibold text-primary truncate">
        {organization.name}
      </p>
    </div>
  </div>
)}
```

### File: `src/components/layout/TopNavbar.tsx`

Update avatar in dropdown to show image:

```tsx
import { AvatarImage } from "@/components/ui/avatar";

// In the Avatar component:
<Avatar className="h-8 w-8">
  <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
  <AvatarFallback className="bg-primary text-primary-foreground">
    {avatarInitial}
  </AvatarFallback>
</Avatar>
```

---

## Storage Structure

```text
avatars/
  └── {user_id}/
      └── profile.jpg  (or .png, .webp)

org-logos/
  └── {org_id}/
      └── logo.jpg  (or .png, .webp)
```

---

## User Flow

### Profile Picture Upload
1. User navigates to Settings page (sidebar link)
2. User sees current avatar (or fallback initial)
3. User clicks "Upload Photo" button
4. File picker opens (filtered to images)
5. User selects image (validated for size and type)
6. Image uploads to `avatars/{user_id}/profile.{ext}`
7. Profile updated with public URL
8. Avatar immediately updates in UI

### Organization Logo Upload (Owner Only)
1. Owner navigates to Organization page
2. Owner hovers over org avatar → camera icon appears
3. Owner clicks to upload
4. Image uploads to `org-logos/{org_id}/logo.{ext}`
5. Organization record updated
6. Logo displays in org header and sidebar

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| SQL Migration | CREATE | Add logo_url column + storage buckets with RLS |
| `src/pages/Settings.tsx` | CREATE | New page with profile picture upload |
| `src/App.tsx` | UPDATE | Add /settings route |
| `src/pages/Organization.tsx` | UPDATE | Add logo upload to header |
| `src/types/index.ts` | UPDATE | Add logo_url to Organization |
| `src/components/layout/AppSidebar.tsx` | UPDATE | Show avatar and org logo images |
| `src/components/layout/TopNavbar.tsx` | UPDATE | Show avatar image in dropdown |

