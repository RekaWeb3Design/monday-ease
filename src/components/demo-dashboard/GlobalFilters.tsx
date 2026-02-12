import { TEAM_MEMBERS, PRIORITY_OPTIONS } from "@/data/demoData";
import { useDemoDashboard } from "./DemoDashboardContext";
import { X } from "lucide-react";

const DATE_RANGES = [
  { value: "today" as const, label: "Ma" },
  { value: "week" as const, label: "Ez a hét" },
  { value: "month" as const, label: "Ez a hónap" },
  { value: "all" as const, label: "Összes" },
];

export function GlobalFilters() {
  const {
    selectedMembers, toggleMember,
    selectedPriorities, togglePriority,
    dateRange, setDateRange,
    clearFilters, activeFilterCount,
  } = useDemoDashboard();

  return (
    <div className="bg-card rounded-lg border border-border px-4 py-3 flex items-center gap-4 flex-wrap">
      <span className="text-sm font-medium text-muted-foreground shrink-0">Szűrők:</span>

      {/* Member filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-muted-foreground mr-0.5">Felelős:</span>
        {TEAM_MEMBERS.map((m) => {
          const active = selectedMembers.includes(m.name);
          return (
            <button
              key={m.name}
              onClick={() => toggleMember(m.name)}
              className="flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-xs transition-all"
              style={{
                borderColor: active ? m.color : "hsl(var(--border))",
                backgroundColor: active ? "hsl(var(--card))" : "hsl(var(--muted))",
                color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                boxShadow: active ? `0 0 0 3px ${m.color}30` : "none",
              }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                style={{ backgroundColor: m.color }}
              >
                {m.initials}
              </span>
              {m.name.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border shrink-0" />

      {/* Priority filter */}
      <div className="flex items-center gap-1 flex-wrap">
        {PRIORITY_OPTIONS.map((p) => {
          const active = selectedPriorities.includes(p.label);
          return (
            <button
              key={p.label}
              onClick={() => togglePriority(p.label)}
              className="rounded px-2 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: active ? p.color : "hsl(var(--muted))",
                color: active ? "#fff" : "hsl(var(--muted-foreground))",
              }}
            >
              {p.emoji} {p.label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border shrink-0" />

      {/* Date range */}
      <div className="flex items-center gap-1 flex-wrap">
        {DATE_RANGES.map((d) => (
          <button
            key={d.value}
            onClick={() => setDateRange(d.value)}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              dateRange === d.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Active filter count + clear */}
      {activeFilterCount > 0 && (
        <>
          <div className="w-px h-6 bg-border shrink-0" />
          <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
            {activeFilterCount} szűrő aktív
          </span>
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={12} />
            Szűrők törlése
          </button>
        </>
      )}
    </div>
  );
}
