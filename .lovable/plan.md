
# Client Management System - Implementation

## Correction Acknowledged
The `create-client` edge function keeps `verify_jwt = true` (already configured correctly in Supabase). Only `client-auth` and `get-client-dashboard` have `verify_jwt = false`.

## Implementation Scope (Frontend Only)

Since the backend (edge functions + database) is already deployed, this implementation creates:

### Files to Create
| File | Purpose |
|------|---------|
| `src/pages/Clients.tsx` | Main clients management page for owners |
| `src/pages/ClientDashboard.tsx` | Public password-protected dashboard |
| `src/hooks/useClients.ts` | React Query hook for client CRUD |
| `src/components/clients/AddClientDialog.tsx` | 3-step wizard to create clients |
| `src/components/clients/EditClientDialog.tsx` | Edit client details and board access |

### Files to Modify
| File | Change |
|------|--------|
| `src/types/index.ts` | Add Client and ClientBoardAccess interfaces |
| `src/components/layout/AppSidebar.tsx` | Add "Clients" nav item (owner only) |
| `src/App.tsx` | Add `/clients` (protected) and `/c/:slug` (public) routes |

### Key Features

**Clients Page (Owner View)**
- Card-based layout showing company name, contact info, status badge
- Board count, last login date
- Actions: Copy URL, Edit, Delete
- Empty state with CTA

**Add Client Dialog (3 Steps)**
1. Client details form (company, contact, phone, type, notes)
2. Board access selection with optional filter values
3. Confirmation with generated URL and one-time password display

**Client Dashboard (Public)**
- Standalone page (no sidebar/navbar)
- Password entry state with authentication via `client-auth` edge function
- Dashboard state with tabs per board, data tables with status badges
- Session persistence via localStorage

### API Integration

```typescript
// Create client (owner authenticated)
await supabase.functions.invoke('create-client', { body: {...} })

// Client auth (public)
await fetch('.../functions/v1/client-auth', { method: 'POST', body: {...} })

// Get dashboard (client JWT)
await fetch('.../functions/v1/get-client-dashboard', { 
  headers: { Authorization: `Bearer ${clientToken}` }
})
```

### Technical Notes
- Uses existing shadcn/ui components (Card, Dialog, Tabs, Table, Badge)
- Status colors: Active=#00CA72, Working=#FDAB3D, Stuck=#E2445C
- Client JWT stored in localStorage: `mondayease_client_${slug}`
- React Query for caching and cache invalidation
