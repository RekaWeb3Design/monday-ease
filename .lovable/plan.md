

# Javítási Terv: Password Reset Betöltés Végtelen Ciklusban

## A Probléma Azonosítása

A konzolban látható hibák alapján a recovery detekció **működik** ("Recovery flow detected from sessionStorage"), de a `loading` állapot soha nem válik `false`-ra, mert az AuthContext végtelen ciklusban fut.

## Gyökér Ok

Az `AuthContext.tsx` 269. sorában a useEffect dependency array tartalmazza a `profile` és `organization` változókat:

```typescript
}, [authInitialized, user?.id, initialDataLoaded, profile, organization, ...]);
```

**Probléma menete:**
1. Felhasználó megérkezik a recovery link-kel
2. Supabase session létrejön, `authInitialized: true`, `user` beállítva
3. Az effect elindul, `setLoading(true)` meghívódik
4. A `fetchProfile()` hívás **hibázik** ("Failed to fetch" - valószínűleg a token még nincs teljesen kész)
5. A `profile` marad `null`
6. A `finally` block beállítja `setLoading(false)`
7. **DE** mivel `profile` változott (vagy nem változott de a dependency array-ban van), az effect **újra indul**
8. `setLoading(true)` megint...
9. Végtelen ciklus!

Ráadásul a jelenlegi logika:
```typescript
// Skip re-fetching if we already have data for this user (token refresh scenario)
if (initialDataLoaded && profile && organization) {
  setLoading(false);
  return;
}
```

Ez a feltétel SOHA nem lesz igaz ha `profile` `null` marad a fetch hiba miatt!

## Megoldás

### 1. Eltávolítani `profile` és `organization` a dependency array-ból

Ezek **nem kell** dependency-k legyenek, mert az effect feladata a beállításuk, nem a figyelésük.

### 2. Módosítani az Auth.tsx render logikát

A password reset formot **ne** az AuthContext `loading` állapotától függően mutassuk, hanem a **saját** `checkingRecovery` és `showPasswordSetup` állapotoktól.

---

## Fájlok és Változások

### Fájl 1: `src/contexts/AuthContext.tsx`

**Változás:** A 269. sorban a dependency array-ból eltávolítani a `profile` és `organization` változókat:

```typescript
// ELŐTTE (problémás):
}, [authInitialized, user?.id, initialDataLoaded, profile, organization, fetchProfile, fetchOrganization, activateInvitedMember]);

// UTÁNA (javított):
}, [authInitialized, user?.id, initialDataLoaded, fetchProfile, fetchOrganization, activateInvitedMember]);
```

Ez megakadályozza a végtelen ciklust, mivel az effect nem fog újra futni amikor a profile/organization változik.

### Fájl 2: `src/pages/Auth.tsx`

**Változás:** A render logikát módosítani, hogy a password setup form **ne** függjön az AuthContext loading-tól:

```typescript
// ELŐTTE (359-366 sor):
if (loading || checkingRecovery) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// UTÁNA:
// Ha recovery/password setup módban vagyunk, NEM várunk az AuthContext loading-ra
if (checkingRecovery) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// Ha password setup-ot mutatunk, NEM kell az AuthContext loading
// (a jelszó beállítás formja nem függ a profil/org adatoktól)
if (showPasswordSetup) {
  // Közvetlenül megjelenítjük a password setup cardot
  // (lásd alább a JSX-ben)
}

// Egyéb esetben várjuk az auth loading-ot
if (loading && !showPasswordSetup) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
```

---

## Összefoglaló

| Fájl | Változás | Cél |
|------|----------|-----|
| `src/contexts/AuthContext.tsx` | Eltávolítani `profile, organization` a dependency array-ból | Végtelen ciklus megakadályozása |
| `src/pages/Auth.tsx` | Módosítani a loading logikát hogy password setup ne függjön az AuthContext loading-tól | Password form megjelenítése a profil fetch hibától függetlenül |

## Elvárt Eredmény

A javítások után:
- A password reset link megnyitásakor megjelenik a jelszó beállító form
- A form nem függ az AuthContext adatbetöltésétől
- Ha a profil fetch hibázik, az nem blokkolja a password reset formot

