

# Terv: Jelszó Visszaállítás Team Membereknek (Owner által)

## Összefoglaló

Az organization owner képes lesz jelszó visszaállítási emailt küldeni a team membereknek. Ez hasznos, ha egy tag elfelejtette a jelszavát, vagy ha a meghívó link lejárt és újra be kell állítania.

## Felhasználói Élmény

1. Az Organization oldalon minden member sorában megjelenik egy új "Reset Password" gomb (kulcs ikon)
2. Rákattintás után megerősítő dialógus jelenik meg
3. Megerősítés után email megy a tagnak a jelszó visszaállítási linkkel
4. Toast értesítés jelzi a sikeres küldést

## Technikai Megvalósítás

### 1. Új Edge Function: `reset-member-password`

**Fájl:** `supabase/functions/reset-member-password/index.ts`

**Működés:**
- Hitelesíti a hívót (owner ellenőrzés)
- Fogadja a `memberId` paramétert
- Lekérdezi a member email címét az `organization_members` táblából
- A Supabase Admin API `generateLink({ type: 'recovery' })` metódusával generál egy jelszó visszaállító linket
- Resend API-val küld egy szép formázott emailt a tagnak
- Visszaadja a sikeres státuszt

**Biztonsági ellenőrzések:**
- Csak owner hívhatja meg
- A member ugyanahhoz az organization-höz kell tartozzon
- A member-nek léteznie kell a rendszerben (van `user_id`)

```text
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────┐
│  Organization   │ ───► │ reset-member-password│ ───► │   Resend    │
│    Page (UI)    │      │   (Edge Function)    │      │  Email API  │
└─────────────────┘      └──────────────────────┘      └─────────────┘
         │                         │                          │
         │  memberId               │  1. Owner ellenőrzés     │
         │                         │  2. Member lekérdezés    │
         │                         │  3. generateLink()       │
         │                         │  4. Email küldés         ▼
         │                         │                   [Tag megkapja
         │◄────────────────────────┤                    a reset linket]
         │  success: true          │
```

### 2. Hook Bővítés: `useOrganizationMembers`

**Fájl:** `src/hooks/useOrganizationMembers.ts`

**Új metódus:** `resetMemberPassword(memberId: string)`
- Meghívja a `reset-member-password` edge function-t
- Kezeli a hibákat és toast értesítéseket
- Visszatérési típus bővítése

### 3. UI Módosítás: Organization Oldal

**Fájl:** `src/pages/Organization.tsx`

**Változások:**
- Új import: `KeyRound` ikon (lucide-react)
- Új state: `resetPasswordDialogOpen`, `memberToResetPassword`
- Új gomb minden member sorban (nem owner-eknél)
- Megerősítő `AlertDialog` a reset előtt
- Loading állapot kezelése

```text
┌────────────────────────────────────────────────────────────────┐
│ Team Members                                        [+ Invite] │
├────────────────────────────────────────────────────────────────┤
│ Name       │ Email        │ Role   │ Status │ Actions          │
├────────────┼──────────────┼────────┼────────┼──────────────────┤
│ John Doe   │ john@...     │ Member │ Active │ 👁️ ⚙️ ✏️ 🔑 🗑️    │
│                                                    ↑            │
│                                         [Új Reset Password gomb]│
└────────────────────────────────────────────────────────────────┘
```

### 4. Config Frissítés

**Fájl:** `supabase/config.toml`

- Új edge function hozzáadása: `reset-member-password` (verify_jwt = false, manuális auth)

---

## Fájlok és Részletes Változások

### Fájl 1: `supabase/functions/reset-member-password/index.ts` (ÚJ)

```typescript
import { getAuthenticatedContext, AuthError } from "../_shared/auth.ts";
import { jsonResponse, corsPreflightResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  try {
    const { user, supabase, adminClient } = await getAuthenticatedContext(req);
    const callerId = user.id;

    const { memberId, organizationId } = await req.json();

    if (!memberId || !organizationId) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    // Verify caller is org owner
    const { data: callerMembership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", callerId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single();

    if (!callerMembership || callerMembership.role !== "owner") {
      return jsonResponse({ error: "Only owners can reset member passwords" }, 403);
    }

    // Fetch the member to reset
    const { data: member } = await adminClient
      .from("organization_members")
      .select("id, email, display_name, user_id, organization_id")
      .eq("id", memberId)
      .eq("organization_id", organizationId)
      .single();

    if (!member) {
      return jsonResponse({ error: "Member not found" }, 404);
    }

    if (!member.user_id) {
      return jsonResponse({ error: "Member has not activated their account yet" }, 400);
    }

    // Get organization name for email
    const { data: org } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    const orgName = org?.name || "your organization";

    // Generate password recovery link
    const siteUrl = Deno.env.get("SITE_URL") || "https://ease-hub-dash.lovable.app";

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: member.email,
      options: {
        redirectTo: `${siteUrl}/auth`,
      },
    });

    if (linkError) {
      console.error("Link generation error:", linkError);
      return jsonResponse({ error: "Failed to generate reset link" }, 500);
    }

    const recoveryLink = linkData.properties?.action_link;

    if (!recoveryLink) {
      return jsonResponse({ error: "Failed to generate recovery link" }, 500);
    }

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      return jsonResponse({ error: "Email service not configured" }, 500);
    }

    const displayName = member.display_name || member.email.split("@")[0];
    const logoUrl = "https://yqjugovqhvxoxvrceqqp.supabase.co/storage/v1/object/public/email-assets/mondayease-logo.png";

    // Send formatted email with recovery link
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MondayEase <noreply@mondayease.com>",
        to: member.email,
        subject: "Reset Your MondayEase Password",
        html: `<!-- Branded HTML email template with reset link -->`,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Email send error:", errorText);
      return jsonResponse({ error: "Failed to send reset email" }, 500);
    }

    return jsonResponse({ success: true });

  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    console.error("Unexpected error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
```

### Fájl 2: `supabase/config.toml`

Új bejegyzés hozzáadása:
```toml
[functions.reset-member-password]
verify_jwt = false
```

### Fájl 3: `src/hooks/useOrganizationMembers.ts`

Új interface és metódus:
```typescript
interface UseOrganizationMembersReturn {
  // ... meglévő mezők
  resetMemberPassword: (memberId: string) => Promise<void>;
}

const resetMemberPassword = useCallback(
  async (memberId: string) => {
    if (!organization) throw new Error("Organization not available");

    const { data, error } = await supabase.functions.invoke("reset-member-password", {
      body: { memberId, organizationId: organization.id },
    });

    if (error || !data?.success) {
      toast({
        title: "Error",
        description: data?.error || "Failed to send password reset email",
        variant: "destructive",
      });
      throw new Error(data?.error || "Reset failed");
    }

    toast({
      title: "Password Reset Sent",
      description: "A password reset email has been sent to the team member.",
    });
  },
  [organization, toast]
);
```

### Fájl 4: `src/pages/Organization.tsx`

UI változások:
1. Import: `KeyRound` ikon
2. Új state-ek: `resetPasswordMember`, `isResettingPassword`
3. Új gomb a member actions-ben (aktív, nem-owner memberekhez)
4. AlertDialog a megerősítéshez
5. Handler függvény a reset híváshoz

---

## Biztonsági Megfontolások

| Ellenőrzés | Leírás |
|------------|--------|
| Owner-only | Csak az organization owner-e hívhatja meg az edge function-t |
| Same-org | A member-nek ugyanahhoz az org-hoz kell tartoznia |
| Activated only | Csak aktivált (van user_id) membereknek küldhető reset |
| Rate limiting | A Supabase Auth beépített rate limiting-je érvényes |

## Email Sablon

A jelszó visszaállító email ugyanazt a branded designt használja mint a meghívó email:
- MondayEase logo fejléc
- Személyre szabott üdvözlés
- Világos "Reset Password" gomb
- Biztonsági figyelmeztetés

---

## Tesztelési Lépések

1. Nyisd meg az Organization oldalt owner-ként
2. Keress egy aktív (nem owner) team member-t
3. Kattints a kulcs ikonra (Reset Password)
4. Erősítsd meg a dialógusban
5. Ellenőrizd a sikeres toast üzenetet
6. A tag megkapja az emailt és be tud állítani új jelszót

