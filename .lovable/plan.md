

## Update inviteMember to Use null for user_id

### Overview
A small but important data model fix: pending invitations should have `user_id: null` instead of a randomly generated UUID, since the invited person doesn't exist in the system yet.

---

### The Change

**File:** `src/hooks/useOrganizationMembers.ts`

**Current code (lines 75-82):**
```typescript
// Generate a placeholder UUID for the invited user
const placeholderUserId = crypto.randomUUID();

const { error: insertError } = await supabase
  .from("organization_members")
  .insert({
    organization_id: organization.id,
    user_id: placeholderUserId,
```

**Updated code:**
```typescript
const { error: insertError } = await supabase
  .from("organization_members")
  .insert({
    organization_id: organization.id,
    user_id: null,
```

---

### Why This Matters

1. **Data integrity** - A random UUID could accidentally match a real user in the future
2. **Clear state** - `null` explicitly indicates "no user yet"
3. **Invitation flow** - When the invited person signs up and accepts, their real `user_id` will be set at that point
4. **Database schema** - The `user_id` column in `organization_members` is already nullable, so this will work correctly

---

### Implementation
- Remove the `placeholderUserId` variable (no longer needed)
- Change `user_id: placeholderUserId` to `user_id: null`

