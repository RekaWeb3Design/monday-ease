
# Javítási Terv: Színes Státusz Badge-ek a Member Dashboard-on

## Összefoglaló

A member dashboard task kártyáin a státusz badge-ek jelenleg szürke vagy szöveg alapján kitalált színűek. A Monday.com API valójában visszaküldi a pontos színkódot a `column_values[].value.label_style.color` mezőben. Ezt a színt fogjuk használni, ahogy a Client Dashboard már csinálja.

## Jelenlegi vs. Célállapot

**Jelenleg:**
- A `TaskCard.tsx` a `getStatusColor()` függvényt használja, ami a státusz szöveg alapján próbálja kitalálni a színt
- Ha nem talál illeszkedést ("done", "stuck", "progress"), szürke badge-et jelenít meg

**Cél:**
- A badge háttérszíne a Monday.com-ból kapott `label_style.color` legyen
- Fehér szöveg a jobb kontraszthoz
- Ha nincs `label_style.color`, akkor fallback a jelenlegi szöveg-alapú logikára

## Fájl Módosítás

### `src/components/member/TaskCard.tsx`

**Változás 1:** Új helper függvény a label_style.color kinyeréséhez

```typescript
// Extract color from column value's label_style
function getColumnColor(col: MondayColumnValue): string | null {
  if (typeof col.value === "object" && col.value?.label_style?.color) {
    return col.value.label_style.color;
  }
  return null;
}
```

**Változás 2:** A badge renderelésénél inline style használata a dinamikus színhez

```typescript
{statusCol && statusText && (
  <Badge 
    className="text-xs"
    style={
      getColumnColor(statusCol)
        ? {
            backgroundColor: getColumnColor(statusCol)!,
            color: 'white',
            border: 'none',
          }
        : undefined
    }
    // Ha nincs label_style.color, fallback a className-re
    {...(!getColumnColor(statusCol) && {
      className: `text-xs ${getStatusColor(statusText)}`
    })}
  >
    {statusText}
  </Badge>
)}
```

**Teljes kód változás (~64-67 sor körül):**

Előtte:
```typescript
{statusText && (
  <Badge className={`text-xs ${getStatusColor(statusText)}`}>
    {statusText}
  </Badge>
)}
```

Utána:
```typescript
{statusCol && statusText && (() => {
  const labelColor = getColumnColor(statusCol);
  return (
    <Badge 
      className={`text-xs ${!labelColor ? getStatusColor(statusText) : ''}`}
      style={labelColor ? {
        backgroundColor: labelColor,
        color: 'white',
        border: 'none',
      } : undefined}
    >
      {statusText}
    </Badge>
  );
})()}
```

## Összehasonlítás a Client Dashboard-dal

| Aspektus | Client Dashboard | Member Dashboard (javítás után) |
|----------|------------------|--------------------------------|
| Szín forrása | `value?.label_style?.color` | `value?.label_style?.color` |
| Fallback | Előre definiált `STATUS_COLORS` map | Szöveg alapú `getStatusColor()` |
| Stílus | Soft badge (12% opacity háttér) | Solid badge (teljes háttérszín) |

Megjegyzés: A Client Dashboard "soft" stílust használ (átlátszó háttér, színes szöveg), míg a Member Dashboard "solid" stílust (teljes háttérszín, fehér szöveg). Ez konzisztens a kártya-alapú UI-val szemben a táblázatos UI-val.

## Technikai Részletek

A `MondayColumnValue` típus (types/index.ts) már támogatja ezt a struktúrát:
```typescript
export interface MondayColumnValue {
  id: string;
  title: string;
  type: string;
  text: string | null;
  value: any;  // <- Ez tartalmazza a label_style-t
}
```

Az edge function (`get-member-tasks`) már visszaküldi a teljes `value` objektumot a Monday.com API-ból.

## Elvárt Eredmény

A javítás után:
- A státusz badge-ek a Monday.com-ban beállított pontos színnel jelennek meg
- A színek megegyeznek azzal, amit a felhasználó a Monday.com-ban lát
- Ha valamilyen okból nincs szín adat, a jelenlegi szöveg-alapú fallback működik
