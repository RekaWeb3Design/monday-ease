export interface Location {
  id: number;
  name: string;
  manager: string;
  color: string;
}

export interface MonthlyKPI {
  locationId: number;
  month: string;
  revenuePlan: number;
  revenueActual: number;
  childrenPlan: number;
  childrenActual: number;
  newMembersPlan: number;
  newMembersActual: number;
}

export interface YearlyGoal {
  id: number;
  name: string;
  progress: number;
  status: string;
  owner: string;
  tasks: number;
  tasksDone: number;
}

export const LOCATIONS: Location[] = [
  { id: 1, name: "Aqua Palace — Buda", manager: "Kovács Ildikó", color: "#0086C0" },
  { id: 2, name: "WavePool — Pest", manager: "Nagy Tamás", color: "#00CA72" },
  { id: 3, name: "Splash Center — Debrecen", manager: "Szabó Réka", color: "#FDAB3D" },
  { id: 4, name: "BlueLagoon — Győr", manager: "Tóth Gergő", color: "#A25DDC" },
  { id: 5, name: "AquaKids — Szeged", manager: "Varga Bence", color: "#E2445C" },
  { id: 6, name: "Neptun — Pécs", manager: "Horváth Lilla", color: "#7B68EE" },
  { id: 7, name: "OceanWave — Miskolc", manager: "Kiss Dániel", color: "#00C2D1" },
  { id: 8, name: "Crystal — Székesfehérvár", manager: "Fekete Anna", color: "#FF6B8A" },
];

export const YEARLY_GOALS: YearlyGoal[] = [
  { id: 1, name: "Hálózatbővítés — 2 új uszoda", progress: 25, status: "Folyamatban", owner: "Kovács Ildikó", tasks: 12, tasksDone: 3 },
  { id: 2, name: "Éves bevétel: 320M Ft", progress: 68, status: "Jó úton", owner: "Nagy Tamás", tasks: 8, tasksDone: 5 },
  { id: 3, name: "Gyerekszám növelés +15%", progress: 82, status: "Jó úton", owner: "Szabó Réka", tasks: 6, tasksDone: 5 },
  { id: 4, name: "Ügyfél elégedettség 4.5+", progress: 91, status: "Kész közel", owner: "Tóth Gergő", tasks: 4, tasksDone: 4 },
  { id: 5, name: "Online foglalás bevezetés", progress: 45, status: "Elakadt", owner: "Varga Bence", tasks: 15, tasksDone: 7 },
];

// 48 records: 8 locations x 6 months (2025-09 to 2026-02)
export const MONTHLY_KPIS: MonthlyKPI[] = [
  // Aqua Palace — Buda (overperformer, 105-115%)
  { locationId: 1, month: "2025-09", revenuePlan: 4200, revenueActual: 4530, childrenPlan: 350, childrenActual: 375, newMembersPlan: 55, newMembersActual: 62 },
  { locationId: 1, month: "2025-10", revenuePlan: 4500, revenueActual: 4950, childrenPlan: 370, childrenActual: 400, newMembersPlan: 60, newMembersActual: 68 },
  { locationId: 1, month: "2025-11", revenuePlan: 4800, revenueActual: 5280, childrenPlan: 380, childrenActual: 395, newMembersPlan: 65, newMembersActual: 72 },
  { locationId: 1, month: "2025-12", revenuePlan: 5000, revenueActual: 5600, childrenPlan: 390, childrenActual: 410, newMembersPlan: 70, newMembersActual: 80 },
  { locationId: 1, month: "2026-01", revenuePlan: 3800, revenueActual: 4100, childrenPlan: 300, childrenActual: 320, newMembersPlan: 45, newMembersActual: 50 },
  { locationId: 1, month: "2026-02", revenuePlan: 4000, revenueActual: 4440, childrenPlan: 330, childrenActual: 358, newMembersPlan: 50, newMembersActual: 57 },

  // WavePool — Pest (overperformer, 108-112%)
  { locationId: 2, month: "2025-09", revenuePlan: 3800, revenueActual: 4100, childrenPlan: 320, childrenActual: 345, newMembersPlan: 50, newMembersActual: 56 },
  { locationId: 2, month: "2025-10", revenuePlan: 4100, revenueActual: 4510, childrenPlan: 340, childrenActual: 365, newMembersPlan: 55, newMembersActual: 61 },
  { locationId: 2, month: "2025-11", revenuePlan: 4300, revenueActual: 4730, childrenPlan: 350, childrenActual: 370, newMembersPlan: 58, newMembersActual: 65 },
  { locationId: 2, month: "2025-12", revenuePlan: 4600, revenueActual: 5060, childrenPlan: 360, childrenActual: 390, newMembersPlan: 62, newMembersActual: 70 },
  { locationId: 2, month: "2026-01", revenuePlan: 3500, revenueActual: 3780, childrenPlan: 280, childrenActual: 300, newMembersPlan: 40, newMembersActual: 44 },
  { locationId: 2, month: "2026-02", revenuePlan: 3700, revenueActual: 4070, childrenPlan: 310, childrenActual: 335, newMembersPlan: 48, newMembersActual: 53 },

  // Splash Center — Debrecen (on track, 97-103%)
  { locationId: 3, month: "2025-09", revenuePlan: 2800, revenueActual: 2770, childrenPlan: 250, childrenActual: 245, newMembersPlan: 35, newMembersActual: 34 },
  { locationId: 3, month: "2025-10", revenuePlan: 3100, revenueActual: 3150, childrenPlan: 270, childrenActual: 275, newMembersPlan: 40, newMembersActual: 41 },
  { locationId: 3, month: "2025-11", revenuePlan: 3200, revenueActual: 3250, childrenPlan: 280, childrenActual: 278, newMembersPlan: 42, newMembersActual: 43 },
  { locationId: 3, month: "2025-12", revenuePlan: 3500, revenueActual: 3570, childrenPlan: 300, childrenActual: 310, newMembersPlan: 48, newMembersActual: 50 },
  { locationId: 3, month: "2026-01", revenuePlan: 2500, revenueActual: 2450, childrenPlan: 200, childrenActual: 195, newMembersPlan: 28, newMembersActual: 27 },
  { locationId: 3, month: "2026-02", revenuePlan: 2700, revenueActual: 2730, childrenPlan: 230, childrenActual: 235, newMembersPlan: 32, newMembersActual: 33 },

  // BlueLagoon — Győr (on track, 95-102%)
  { locationId: 4, month: "2025-09", revenuePlan: 2600, revenueActual: 2550, childrenPlan: 220, childrenActual: 215, newMembersPlan: 30, newMembersActual: 29 },
  { locationId: 4, month: "2025-10", revenuePlan: 2900, revenueActual: 2930, childrenPlan: 240, childrenActual: 245, newMembersPlan: 35, newMembersActual: 36 },
  { locationId: 4, month: "2025-11", revenuePlan: 3000, revenueActual: 2940, childrenPlan: 250, childrenActual: 248, newMembersPlan: 38, newMembersActual: 37 },
  { locationId: 4, month: "2025-12", revenuePlan: 3300, revenueActual: 3360, childrenPlan: 270, childrenActual: 280, newMembersPlan: 42, newMembersActual: 43 },
  { locationId: 4, month: "2026-01", revenuePlan: 2300, revenueActual: 2250, childrenPlan: 180, childrenActual: 175, newMembersPlan: 25, newMembersActual: 24 },
  { locationId: 4, month: "2026-02", revenuePlan: 2500, revenueActual: 2475, childrenPlan: 210, childrenActual: 208, newMembersPlan: 30, newMembersActual: 30 },

  // AquaKids — Szeged (slightly under, 90-98%)
  { locationId: 5, month: "2025-09", revenuePlan: 2400, revenueActual: 2280, childrenPlan: 300, childrenActual: 285, newMembersPlan: 40, newMembersActual: 37 },
  { locationId: 5, month: "2025-10", revenuePlan: 2700, revenueActual: 2590, childrenPlan: 320, childrenActual: 310, newMembersPlan: 45, newMembersActual: 42 },
  { locationId: 5, month: "2025-11", revenuePlan: 2800, revenueActual: 2740, childrenPlan: 330, childrenActual: 325, newMembersPlan: 48, newMembersActual: 46 },
  { locationId: 5, month: "2025-12", revenuePlan: 3000, revenueActual: 2880, childrenPlan: 350, childrenActual: 340, newMembersPlan: 52, newMembersActual: 49 },
  { locationId: 5, month: "2026-01", revenuePlan: 2200, revenueActual: 2050, childrenPlan: 250, childrenActual: 230, newMembersPlan: 30, newMembersActual: 27 },
  { locationId: 5, month: "2026-02", revenuePlan: 2400, revenueActual: 2300, childrenPlan: 280, childrenActual: 268, newMembersPlan: 35, newMembersActual: 33 },

  // Neptun — Pécs (underperformer, 78-90%)
  { locationId: 6, month: "2025-09", revenuePlan: 2500, revenueActual: 2200, childrenPlan: 230, childrenActual: 195, newMembersPlan: 35, newMembersActual: 28 },
  { locationId: 6, month: "2025-10", revenuePlan: 2800, revenueActual: 2380, childrenPlan: 250, childrenActual: 210, newMembersPlan: 40, newMembersActual: 32 },
  { locationId: 6, month: "2025-11", revenuePlan: 2900, revenueActual: 2550, childrenPlan: 260, childrenActual: 225, newMembersPlan: 42, newMembersActual: 35 },
  { locationId: 6, month: "2025-12", revenuePlan: 3200, revenueActual: 2720, childrenPlan: 280, childrenActual: 240, newMembersPlan: 48, newMembersActual: 38 },
  { locationId: 6, month: "2026-01", revenuePlan: 2200, revenueActual: 1760, childrenPlan: 180, childrenActual: 145, newMembersPlan: 28, newMembersActual: 20 },
  { locationId: 6, month: "2026-02", revenuePlan: 2400, revenueActual: 2040, childrenPlan: 210, childrenActual: 178, newMembersPlan: 32, newMembersActual: 25 },

  // OceanWave — Miskolc (underperformer, 75-88%)
  { locationId: 7, month: "2025-09", revenuePlan: 2300, revenueActual: 1950, childrenPlan: 200, childrenActual: 165, newMembersPlan: 30, newMembersActual: 22 },
  { locationId: 7, month: "2025-10", revenuePlan: 2600, revenueActual: 2210, childrenPlan: 220, childrenActual: 185, newMembersPlan: 35, newMembersActual: 27 },
  { locationId: 7, month: "2025-11", revenuePlan: 2700, revenueActual: 2370, childrenPlan: 230, childrenActual: 198, newMembersPlan: 38, newMembersActual: 30 },
  { locationId: 7, month: "2025-12", revenuePlan: 3000, revenueActual: 2400, childrenPlan: 250, childrenActual: 205, newMembersPlan: 45, newMembersActual: 34 },
  { locationId: 7, month: "2026-01", revenuePlan: 2000, revenueActual: 1500, childrenPlan: 160, childrenActual: 120, newMembersPlan: 22, newMembersActual: 15 },
  { locationId: 7, month: "2026-02", revenuePlan: 2200, revenueActual: 1760, childrenPlan: 190, childrenActual: 155, newMembersPlan: 28, newMembersActual: 21 },

  // Crystal — Székesfehérvár (on track, 96-104%)
  { locationId: 8, month: "2025-09", revenuePlan: 2200, revenueActual: 2180, childrenPlan: 190, childrenActual: 188, newMembersPlan: 28, newMembersActual: 27 },
  { locationId: 8, month: "2025-10", revenuePlan: 2500, revenueActual: 2550, childrenPlan: 210, childrenActual: 218, newMembersPlan: 32, newMembersActual: 34 },
  { locationId: 8, month: "2025-11", revenuePlan: 2600, revenueActual: 2650, childrenPlan: 220, childrenActual: 225, newMembersPlan: 35, newMembersActual: 36 },
  { locationId: 8, month: "2025-12", revenuePlan: 2900, revenueActual: 3010, childrenPlan: 240, childrenActual: 250, newMembersPlan: 40, newMembersActual: 42 },
  { locationId: 8, month: "2026-01", revenuePlan: 2000, revenueActual: 1940, childrenPlan: 160, childrenActual: 155, newMembersPlan: 22, newMembersActual: 21 },
  { locationId: 8, month: "2026-02", revenuePlan: 2200, revenueActual: 2240, childrenPlan: 190, childrenActual: 195, newMembersPlan: 28, newMembersActual: 29 },
];

export const LATEST_MONTH = "2026-02";

export const MONTH_LABELS: Record<string, string> = {
  "2025-09": "Sze",
  "2025-10": "Okt",
  "2025-11": "Nov",
  "2025-12": "Dec",
  "2026-01": "Jan",
  "2026-02": "Feb",
};

export function getLocationKPIs(locationId: number, month: string): MonthlyKPI | undefined {
  return MONTHLY_KPIS.find((k) => k.locationId === locationId && k.month === month);
}

export function getAllLocationsSummary(month: string) {
  return LOCATIONS.map((loc) => {
    const kpi = getLocationKPIs(loc.id, month);
    const perf = kpi ? Math.round((kpi.revenueActual / kpi.revenuePlan) * 100) : 0;
    return {
      ...loc,
      kpi,
      performance: perf,
    };
  }).sort((a, b) => b.performance - a.performance);
}

export function getLocationTrend(locationId: number): MonthlyKPI[] {
  return MONTHLY_KPIS.filter((k) => k.locationId === locationId).sort((a, b) => a.month.localeCompare(b.month));
}

export function getGoalStatusColor(status: string): string {
  switch (status) {
    case "Jó úton": return "#00CA72";
    case "Folyamatban": return "#0086C0";
    case "Elakadt": return "#E2445C";
    case "Kész közel": return "#A25DDC";
    default: return "#C4C4C4";
  }
}
