

## Cél

A board konfiguráció dialógusokban a felhasználó dropdown ne csak Monday.com felhasználókat mutasson, hanem a saját szervezetünkben lévő tagokat is. Ezzel lehetővé válik, hogy a board-okat a szervezet tagjaival párosítsuk, nem csak Monday.com felhasználókkal.

---

## Jelenlegi állapot

### Hogyan működik most:
1. **AddBoardDialog (Step 3)**: Monday.com users dropdown a `useMondayUsers` hook-ból
2. **EditBoardAccessDialog**: Szintén Monday.com users dropdown
3. **Filter matching (get-member-tasks)**: A `filter_value` mezőt hasonlítja a Monday.com column értékhez

### Probléma:
- Ha a szervezeti tag neve nem egyezik pontosan a Monday.com user nevével, a szűrés nem működik
- Nincs lehetőség saját szervezeti tagok kiválasztására

---

## Megoldás

### Változtatás koncepciója

A "person" típusú oszlopoknál a dropdown **két szekciót** fog mutatni:

```text
+----------------------------------+
| Search users...                  |
+----------------------------------+
| 📁 Organization Members          |
|   ☐ Réka Vig (reka@company.hu)  |
|   ☐ John Doe (john@company.hu)  |
+----------------------------------+
| 📁 Monday.com Users              |
|   ☐ Réka Víg (reka@monday.com)  |
|   ☐ John Doe (john@monday.com)  |
+----------------------------------+
```

### Érintett fájlok

| Fájl | Változtatás |
|------|-------------|
| `src/components/boards/AddBoardDialog.tsx` | Kettős dropdown (org members + Monday users) |
| `src/components/organization/EditBoardAccessDialog.tsx` | Kettős dropdown (org members + Monday users) |
| `src/hooks/useOrganizationMembers.ts` | Már elérhető, nincs változás |
| `src/hooks/useMondayUsers.ts` | Már elérhető, nincs változás |

---

## Részletes implementáció

### 1. AddBoardDialog.tsx frissítése

**Step 3 - Member mapping szekció:**

```tsx
// Jelenlegi: csak Monday users
{isPersonColumn ? (
  <Popover>
    {mondayUsers.map(user => ...)}
  </Popover>
) : (
  <Input />
)}

// Új: Organization members + Monday users
{isPersonColumn ? (
  <Popover>
    <Command>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandGroup heading="Organization Members">
          {mappableMembers.map(member => (
            <CommandItem 
              key={`org-${member.id}`}
              value={`${member.display_name} ${member.email}`}
              onSelect={() => handleMemberMappingChange(memberId, member.display_name)}
            >
              {member.display_name}
              <span className="text-muted-foreground">{member.email}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Monday.com Users">
          {mondayUsers.map(user => (
            <CommandItem 
              key={`monday-${user.id}`}
              value={`${user.name} ${user.email}`}
              onSelect={() => handleMemberMappingChange(memberId, user.name)}
            >
              {user.name}
              <span className="text-muted-foreground">{user.email}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </Popover>
) : (
  <Input />
)}
```

### 2. EditBoardAccessDialog.tsx frissítése

**Filter value input szekció:**

Ugyanazt a logikát alkalmazzuk:
- Person column esetén: két csoportos Combobox
- Egyéb esetben: szöveges input

```tsx
// A renderFilterInput függvényben:
if (isPerson) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          {access.filterValue || "Select a person..."}
          <ChevronsUpDown />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            {/* Clear option */}
            <CommandItem onSelect={() => handleFilterValueChange(boardConfigId, "")}>
              None (remove access)
            </CommandItem>
            
            {/* Organization members */}
            <CommandGroup heading="Organization Members">
              {members.filter(m => m.role !== 'owner').map(member => (
                <CommandItem 
                  key={`org-${member.id}`}
                  onSelect={() => handleFilterValueChange(boardConfigId, member.display_name)}
                >
                  <Check className={cn(...)} />
                  {member.display_name}
                  <span className="text-muted-foreground">{member.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            
            {/* Monday.com users */}
            <CommandGroup heading="Monday.com Users">
              {mondayUsers.map(user => (
                <CommandItem 
                  key={`monday-${user.id}`}
                  onSelect={() => handleFilterValueChange(boardConfigId, user.name)}
                >
                  <Check className={cn(...)} />
                  {user.name}
                  <span className="text-muted-foreground">{user.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### 3. EditBoardAccessDialog - Hook integráció

A komponensbe be kell húzni a `useOrganizationMembers` hook-ot:

```tsx
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";

export function EditBoardAccessDialog({ ... }) {
  // Meglévő hooks
  const { users: mondayUsers, isLoading: usersLoading, fetchUsers } = useMondayUsers();
  
  // Új hook hozzáadása
  const { members, isLoading: membersLoading } = useOrganizationMembers();
  
  // Non-owner members szűrése
  const nonOwnerMembers = useMemo(() => 
    members.filter(m => m.role !== 'owner'), 
    [members]
  );
  
  // Loading state frissítése
  const isLoadingUsers = usersLoading || membersLoading;
  
  // ...
}
```

---

## UI/UX megfontolások

### Dropdown felépítése

```text
┌─────────────────────────────────────┐
│ 🔍 Search users...                  │
├─────────────────────────────────────┤
│ ✗ None (remove access)             │
├─────────────────────────────────────┤
│ Organization Members                │
│   ○ Réka Vig                       │
│     reka@company.hu                 │
│   ○ John Doe                       │
│     john@company.hu                 │
├─────────────────────────────────────┤
│ Monday.com Users                    │
│   ○ Réka Víg                       │
│     reka@monday.com                 │
│   ○ Jane Smith                     │
│     jane@monday.com                 │
└─────────────────────────────────────┘
```

### Loading állapotok

- Ha bármelyik lista töltődik: spinner megjelenítése
- Üres állapot kezelése mindkét csoportnál

### Szűrő logika

- A keresés mindkét csoportban működik (név és email alapján)
- Case-insensitive keresés

---

## Miért működik a szűrés?

A `get-member-tasks` edge function a `filter_value` mezőt hasonlítja össze a Monday.com oszlop értékével. A matching logika (`matchesFilter` függvény) case-insensitive és partial match-et is támogat:

```typescript
// Bármilyen nevet tárolunk a filter_value-ban (org member vagy Monday user)
// A Monday.com API text mezője lesz összehasonlítva vele
// Pl: filter_value = "Réka Vig" vagy "Réka Víg"
// Monday text = "Réka Víg"
// → partial match működik
```

---

## Implementációs lépések

1. **EditBoardAccessDialog.tsx**
   - `useOrganizationMembers` hook import
   - Non-owner members szűrése
   - Dropdown két csoporttal (org members + Monday users)
   - Loading state kezelése

2. **AddBoardDialog.tsx**
   - Step 3 dropdown frissítése két csoporttal
   - A `mappableMembers` már elérhető (saját szervezeti tagok)
   - Monday users hozzáadása második csoportként

---

## Technikai megjegyzések

- A `filter_value` mező továbbra is a **kiválasztott név** lesz (string)
- Nincs szükség adatbázis módosításra
- A matching logika változatlan marad a `get-member-tasks` edge function-ben
- A CommandGroup komponens biztosítja a csoportosított megjelenítést

