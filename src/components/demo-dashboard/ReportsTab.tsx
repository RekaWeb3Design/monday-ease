import { useState, useMemo } from "react";
import { LOCATIONS, YEARLY_GOALS, MONTHLY_KPIS, LATEST_MONTH, MONTH_LABELS, getAllLocationsSummary, getLocationTrend, getGoalStatusColor } from "@/data/demoReportData";
import { TEAM_MEMBERS, getMember } from "@/data/demoData";
import { ProgressBar } from "./ProgressBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

// ─── Section 1: Company Goals ───

function GoalCard({ goal }: { goal: typeof YEARLY_GOALS[0] }) {
  const member = getMember(goal.owner);
  const statusColor = getGoalStatusColor(goal.status);
  const needsWarning = goal.progress < 50 && goal.status !== "Jó úton";

  return (
    <div className={`bg-card rounded-xl shadow-sm border p-5 ${needsWarning ? "border-l-4 border-l-amber-400" : ""}`}>
      <p className="font-bold text-sm text-foreground mb-2">{goal.name}</p>
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ backgroundColor: member?.color ?? "#C4C4C4" }}
        >
          {member?.initials ?? goal.owner.split(" ").map(n => n[0]).join("")}
        </div>
        <span className="text-xs text-muted-foreground">{goal.owner}</span>
      </div>
      <ProgressBar value={goal.progress} />
      <div className="flex items-center justify-between mt-3">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: statusColor }}
        >
          {goal.status}
        </span>
        <span className="text-xs text-muted-foreground">{goal.tasksDone}/{goal.tasks} feladat kész</span>
      </div>
    </div>
  );
}

function GoalsSection() {
  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-1">🎯 Éves célok — 2026</h2>
      <p className="text-sm text-muted-foreground mb-4">Céges szintű célkitűzések és haladás</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {YEARLY_GOALS.map((g) => <GoalCard key={g.id} goal={g} />)}
      </div>
    </div>
  );
}

// ─── Section 2: Location Performance ───

function PerfColor({ value }: { value: number }) {
  const color = value >= 100 ? "text-green-600" : value >= 90 ? "text-yellow-600" : "text-red-600";
  return <span className={`font-semibold ${color}`}>{value}%</span>;
}

function SummaryView() {
  const data = useMemo(() => getAllLocationsSummary(LATEST_MONTH), []);
  const totals = useMemo(() => {
    const all = data.filter(d => d.kpi);
    return {
      revPlan: all.reduce((s, d) => s + (d.kpi?.revenuePlan ?? 0), 0),
      revActual: all.reduce((s, d) => s + (d.kpi?.revenueActual ?? 0), 0),
      children: all.reduce((s, d) => s + (d.kpi?.childrenActual ?? 0), 0),
      members: all.reduce((s, d) => s + (d.kpi?.newMembersActual ?? 0), 0),
    };
  }, [data]);
  const totalPerf = Math.round((totals.revActual / totals.revPlan) * 100);
  const totalRevenue = totals.revActual;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Helyszín</TableHead>
              <TableHead className="text-right">Bevétel (terv)</TableHead>
              <TableHead className="text-right">Bevétel (tény)</TableHead>
              <TableHead className="text-right">Teljesítés</TableHead>
              <TableHead className="text-right">Gyerekszám</TableHead>
              <TableHead className="text-right">Új tagok</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">
                  <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: d.color }} />
                  {d.name}
                </TableCell>
                <TableCell className="text-right">{d.kpi?.revenuePlan?.toLocaleString()} E Ft</TableCell>
                <TableCell className="text-right">{d.kpi?.revenueActual?.toLocaleString()} E Ft</TableCell>
                <TableCell className="text-right"><PerfColor value={d.performance} /></TableCell>
                <TableCell className="text-right">{d.kpi?.childrenActual}</TableCell>
                <TableCell className="text-right">{d.kpi?.newMembersActual}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/50">
              <TableCell>ÖSSZESEN</TableCell>
              <TableCell className="text-right">{totals.revPlan.toLocaleString()} E Ft</TableCell>
              <TableCell className="text-right">{totals.revActual.toLocaleString()} E Ft</TableCell>
              <TableCell className="text-right"><PerfColor value={totalPerf} /></TableCell>
              <TableCell className="text-right">{totals.children}</TableCell>
              <TableCell className="text-right">{totals.members}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Revenue contribution bar */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Bevételi hozzájárulás helyszínenként</p>
        <div className="flex h-5 rounded-full overflow-hidden">
          {data.map((d) => {
            const width = totalRevenue > 0 ? ((d.kpi?.revenueActual ?? 0) / totalRevenue) * 100 : 0;
            return (
              <div
                key={d.id}
                className="h-full relative group cursor-default"
                style={{ width: `${width}%`, backgroundColor: d.color }}
                title={`${d.name}: ${d.kpi?.revenueActual?.toLocaleString()} E Ft`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {data.map((d) => (
            <span key={d.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
              {d.name.split("—")[0].trim()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LocationDetailView({ locationId }: { locationId: number }) {
  const location = LOCATIONS.find((l) => l.id === locationId)!;
  const trend = useMemo(() => getLocationTrend(locationId), [locationId]);
  const latest = trend[trend.length - 1];
  const maxRevenue = Math.max(...trend.map((t) => Math.max(t.revenuePlan, t.revenueActual)));
  const [detailsOpen, setDetailsOpen] = useState(false);

  const stats = [
    { label: "Havi bevétel", plan: latest.revenuePlan, actual: latest.revenueActual, unit: "E Ft" },
    { label: "Gyerekszám", plan: latest.childrenPlan, actual: latest.childrenActual, unit: "fő" },
    { label: "Új tagok", plan: latest.newMembersPlan, actual: latest.newMembersActual, unit: "fő" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: location.color }} />
          {location.name}
        </h3>
        <p className="text-sm text-muted-foreground">Vezető: {location.manager}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => {
          const perf = Math.round((s.actual / s.plan) * 100);
          const isUp = perf >= 100;
          return (
            <div key={s.label} className="bg-card rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-foreground">{s.actual.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">/ {s.plan.toLocaleString()} {s.unit}</span>
              </div>
              <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${isUp ? "text-green-600" : "text-red-600"}`}>
                {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {perf}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend bar chart */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-foreground">Bevételi trend — utolsó 6 hónap</p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: location.color, opacity: 0.3 }} /> Terv</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: location.color }} /> Tény</span>
          </div>
        </div>
        <div className="flex items-end gap-2 h-[200px] border-b border-l pl-1 pb-1">
          {trend.map((t) => {
            const planH = maxRevenue > 0 ? (t.revenuePlan / maxRevenue) * 100 : 0;
            const actualH = maxRevenue > 0 ? (t.revenueActual / maxRevenue) * 100 : 0;
            const underperforms = t.revenueActual < t.revenuePlan;
            return (
              <div key={t.month} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="flex items-end gap-[2px] flex-1 w-full justify-center">
                  <div className="w-[40%] rounded-t" style={{ height: `${planH}%`, backgroundColor: location.color, opacity: 0.3 }} />
                  <div
                    className="w-[40%] rounded-t"
                    style={{
                      height: `${actualH}%`,
                      backgroundColor: underperforms ? "#E2445C" : location.color,
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">{MONTH_LABELS[t.month]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapsible monthly details */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-primary hover:underline cursor-pointer">
          <ChevronDown className={`w-4 h-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
          Havi részletek
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hónap</TableHead>
                  <TableHead className="text-right">Terv</TableHead>
                  <TableHead className="text-right">Tény</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Gyerek</TableHead>
                  <TableHead className="text-right">Új tag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trend.map((t) => {
                  const perf = Math.round((t.revenueActual / t.revenuePlan) * 100);
                  return (
                    <TableRow key={t.month}>
                      <TableCell>{MONTH_LABELS[t.month]}</TableCell>
                      <TableCell className="text-right">{t.revenuePlan.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{t.revenueActual.toLocaleString()}</TableCell>
                      <TableCell className="text-right"><PerfColor value={perf} /></TableCell>
                      <TableCell className="text-right">{t.childrenActual}</TableCell>
                      <TableCell className="text-right">{t.newMembersActual}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function LocationsSection() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-1">📊 Uszodák teljesítménye — havi bontás</h2>
      <p className="text-sm text-muted-foreground mb-4">Február 2026 adatok alapján</p>

      {/* Location selector */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
        <button
          onClick={() => setSelectedId(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            selectedId === null
              ? "bg-primary/10 border-primary text-primary"
              : "bg-muted border-border text-muted-foreground hover:bg-accent"
          }`}
        >
          Összesített
        </button>
        {LOCATIONS.map((loc) => (
          <button
            key={loc.id}
            onClick={() => setSelectedId(loc.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              selectedId === loc.id
                ? "bg-primary/10 border-primary text-primary"
                : "bg-muted border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: loc.color }} />
            {loc.name.split("—")[0].trim()}
          </button>
        ))}
      </div>

      {selectedId === null ? <SummaryView /> : <LocationDetailView locationId={selectedId} />}
    </div>
  );
}

// ─── Section 3: Person-level Overview ───

function PersonOverviewSection() {
  const latestSummary = useMemo(() => getAllLocationsSummary(LATEST_MONTH), []);

  // Collect unique people from goals + locations
  const people = useMemo(() => {
    const map = new Map<string, { name: string; roles: string[]; goals: typeof YEARLY_GOALS; locations: typeof latestSummary; initials: string; color: string }>();

    for (const goal of YEARLY_GOALS) {
      const existing = map.get(goal.owner) || { name: goal.owner, roles: [], goals: [], locations: [], initials: "", color: "#C4C4C4" };
      existing.goals.push(goal);
      const member = getMember(goal.owner);
      if (member) {
        existing.initials = member.initials;
        existing.color = member.color;
        if (!existing.roles.includes(member.role)) existing.roles.push(member.role);
      } else {
        existing.initials = goal.owner.split(" ").map(n => n[0]).join("");
      }
      map.set(goal.owner, existing);
    }

    for (const loc of latestSummary) {
      const existing = map.get(loc.manager) || { name: loc.manager, roles: [], goals: [], locations: [], initials: loc.manager.split(" ").map(n => n[0]).join(""), color: loc.color };
      existing.locations.push(loc);
      if (!existing.roles.includes("Helyszínvezető")) existing.roles.push("Helyszínvezető");
      map.set(loc.manager, existing);
    }

    return Array.from(map.values());
  }, [latestSummary]);

  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-1">👥 Felelősök haladása</h2>
      <p className="text-sm text-muted-foreground mb-4">Célok és helyszínek felelősei</p>
      <div className="space-y-3">
        {people.map((person) => {
          const hasIssue = person.goals.some(g => g.status === "Elakadt" || g.progress < 40) ||
            person.locations.some(l => l.performance < 90);
          return (
            <div key={person.name} className="bg-card rounded-xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: person.color }}
                  >
                    {person.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{person.name}</p>
                    <p className="text-[11px] text-muted-foreground">{person.roles.join(", ")}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${hasIssue ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                  {hasIssue ? "Figyelmet igényel" : "Ütemben halad"}
                </span>
              </div>

              {person.goals.length > 0 && (
                <div className="space-y-2 mb-2">
                  {person.goals.map((g) => (
                    <div key={g.id} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-[180px] truncate">{g.name}</span>
                      <div className="flex-1"><ProgressBar value={g.progress} /></div>
                    </div>
                  ))}
                </div>
              )}

              {person.locations.length > 0 && (
                <div className="space-y-1">
                  {person.locations.map((loc) => (
                    <div key={loc.id} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: loc.color }} />
                      <span className="text-muted-foreground">{loc.name}</span>
                      <PerfColor value={loc.performance} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ReportsTab ───

export function ReportsTab() {
  return (
    <div className="space-y-8">
      <GoalsSection />
      <LocationsSection />
      <PersonOverviewSection />
    </div>
  );
}
