

# Add "Riportok" (Reports) Tab to Demo Dashboard

## Overview

Create a 5th tab on the Demo Dashboard showcasing a business intelligence / reporting view for a multi-location swimming pool business. This involves creating 2 new files and modifying 1 existing file.

## New Files

### 1. `src/data/demoReportData.ts`

Contains all report-specific demo data:

**LOCATIONS** -- 8 swimming pool facilities with id, name, manager, and color (as specified in the prompt).

**MonthlyKPI interface and data** -- 48 records (8 locations x 6 months: Sept 2025 - Feb 2026). Realistic revenue data:
- Revenue plans: 2000-5000 thousand HUF/month
- Buda and Pest overperform (105-115% of plan)
- Miskolc and Pecs underperform (75-95%)
- Q4 stronger, Jan dips, Feb recovering
- Children counts: 150-400/month, new members: 20-80/month

**YEARLY_GOALS** -- 5 company-level goals with progress, status, owner, and task counts (as specified).

Helper functions:
- `getLocationKPIs(locationId, month)` -- returns KPI for specific location and month
- `getLatestMonth()` -- returns "2026-02" 
- `getAllLocationsSummary(month)` -- returns summary table data for a month
- `getLocationTrend(locationId)` -- returns 6-month trend for a location

### 2. `src/components/demo-dashboard/ReportsTab.tsx`

The main reports tab component with 3 vertical sections and internal state for the selected location.

**SECTION 1: Celes celok (Company Goals)**

Title: "Eves celok -- 2026" with subtitle.

Grid of goal cards (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`). Each card:
- White card, rounded-xl, shadow-sm, border, p-5
- Goal name (font-bold text-sm)
- Owner with small colored avatar circle (lookup from TEAM_MEMBERS + LOCATIONS managers)
- ProgressBar component (h-3 variant via a wrapper or inline)
- Status badge: color-coded span ("Jo uton" = green, "Folyamatban" = blue, "Elakadt" = red, "Kesz kozel" = purple)
- "X/Y feladat kesz" text
- Amber `border-l-4 border-amber-400` if progress < 50% and status is not "Jo uton"

**SECTION 2: Helyszinek teljesitmenye (Location Performance)**

Title: "Uszodak teljesitmenye -- havi bontas"

**Location selector**: horizontal scrollable row of chips. "Osszesitett" + 8 location chips. Each shows a colored dot + name. Selected chip: `bg-primary/10 border-primary text-primary font-medium`. State: `selectedLocationId: number | null` (null = summary).

**When "Osszesitett" selected (default):**
- shadcn Table: columns Helyszin, Havi bevetel (terv), Havi bevetel (teny), Teljesites %, Gyerekszam, Uj tagok
- February 2026 data, sorted by teljesites % descending
- Teljesites column: green if >=100%, red if <90%, yellow if 90-99%
- Bold OSSZESEN total row at bottom
- Below table: horizontal stacked bar showing revenue contribution per location (colored by location color, proportional widths)

**When specific location selected:**
- Header: location name + manager
- 3 stat cards in a row (`grid-cols-3 gap-4`): each shows metric name, actual vs plan, percentage with green/red arrow icon
- **Trend bar chart** (pure CSS): flex container with 6 month columns. Each column has two vertical bars (plan = light color, actual = dark color) with heights proportional to max value. X-axis labels: Sze, Okt, Nov, Dec, Jan, Feb. Legend above.
- Collapsible "Havi reszletek" section (using Collapsible from shadcn/ui) with a monthly breakdown table

**SECTION 3: Szemely szintu attekintes (Person-level overview)**

Title: "Felelosok haladasa"

List of people who own goals or manage locations. For each person:
- Row with avatar circle + name + role
- Their goals with mini progress bars
- Their managed location with latest month performance percentage
- Overall indicator: green "Uren halad" or amber "Figyelmet igenyel" based on whether any of their goals/locations are underperforming

## Modified File

### 3. `src/pages/DemoDashboard.tsx`

- Import `ReportsTab` from `@/components/demo-dashboard/ReportsTab`
- Add 5th TabsTrigger after "Idovonal": `<TabsTrigger value="riportok">Riportok</TabsTrigger>`
- Add corresponding TabsContent: `<TabsContent value="riportok"><ReportsTab /></TabsContent>`

## Technical Notes

### CSS Bar Chart Implementation

The trend chart uses percentage-based heights inside a flex container:

```text
Container: flex items-end gap-3, h-[200px]
Each month column: flex-1, flex items-end gap-1
Plan bar: div with bg-[locationColor]/30, height = (value/maxValue)*100%
Actual bar: div with bg-[locationColor], height = (value/maxValue)*100%
Value labels: text-[10px] above each bar
```

No external charting library needed -- pure CSS with inline height styles.

### Revenue Contribution Stacked Bar

A single flex row where each segment's width is proportional to the location's revenue share:

```text
width: `${(locationRevenue / totalRevenue) * 100}%`
backgroundColor: location.color
```

With tooltips showing location name + amount on hover.

### Goal Status Badge Colors

```text
"Jo uton" -> #00CA72 (green)
"Folyamatban" -> #0086C0 (blue)  
"Elakadt" -> #E2445C (red)
"Kesz kozel" -> #A25DDC (purple)
```

### Person-level Data Merging

Combine TEAM_MEMBERS (from demoData.ts) with LOCATIONS managers. Some names overlap (Kovacs Ildiko, Nagy Tamas, etc.) -- these get both their task goals and location management displayed.

## File Summary

| File | Action |
|------|--------|
| `src/data/demoReportData.ts` | Create -- report demo data + helpers |
| `src/components/demo-dashboard/ReportsTab.tsx` | Create -- full reports tab component |
| `src/pages/DemoDashboard.tsx` | Modify -- add 5th tab trigger + content |

