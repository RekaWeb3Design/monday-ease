export interface StatusOption {
  label: string;
  color: string;
}

export interface PriorityOption {
  label: string;
  color: string;
  emoji: string;
}

export interface TeamMember {
  name: string;
  role: string;
  initials: string;
  color: string;
}

export interface DemoTask {
  name: string;
  status: string;
  priority: string;
  assignees: string[];
  due: string;
  progress: number;
  subtasksDone: number;
  subtasksTotal: number;
  category: string;
}

export interface TaskGroup {
  name: string;
  color: string;
  tasks: DemoTask[];
}

export const STATUS_OPTIONS: StatusOption[] = [
  { label: "Kész", color: "#00CA72" },
  { label: "Folyamatban", color: "#FDAB3D" },
  { label: "Elakadt", color: "#E2445C" },
  { label: "Várakozik", color: "#C4C4C4" },
  { label: "Felülvizsgálat", color: "#A25DDC" },
  { label: "Tervezés", color: "#0086C0" },
];

export const PRIORITY_OPTIONS: PriorityOption[] = [
  { label: "Kritikus", color: "#333333", emoji: "🔴" },
  { label: "Magas", color: "#E2445C", emoji: "🟠" },
  { label: "Közepes", color: "#FDAB3D", emoji: "🟡" },
  { label: "Alacsony", color: "#0086C0", emoji: "🔵" },
];

export const TEAM_MEMBERS: TeamMember[] = [
  { name: "Kovács Ildikó", role: "Projektmenedzser", initials: "KI", color: "#7B68EE" },
  { name: "Nagy Tamás", role: "Fejlesztő", initials: "NT", color: "#00CA72" },
  { name: "Szabó Réka", role: "Designer", initials: "SR", color: "#FDAB3D" },
  { name: "Tóth Gergő", role: "Backend Dev", initials: "TG", color: "#E2445C" },
  { name: "Varga Bence", role: "QA / Tesztelő", initials: "VB", color: "#0086C0" },
];

export const TASK_GROUPS: TaskGroup[] = [
  {
    name: "Sprint 12 — Aktív fejlesztés",
    color: "#0086C0",
    tasks: [
      { name: "API integráció — ügyféladatok szinkron", status: "Folyamatban", priority: "Kritikus", assignees: ["Nagy Tamás", "Tóth Gergő"], due: "2026-02-14", progress: 65, subtasksDone: 4, subtasksTotal: 6, category: "Backend" },
      { name: "Dashboard redesign — új layout", status: "Folyamatban", priority: "Magas", assignees: ["Szabó Réka"], due: "2026-02-15", progress: 40, subtasksDone: 2, subtasksTotal: 5, category: "Frontend" },
      { name: "Jogosultsági rendszer felülvizsgálat", status: "Felülvizsgálat", priority: "Magas", assignees: ["Tóth Gergő"], due: "2026-02-13", progress: 90, subtasksDone: 5, subtasksTotal: 6, category: "Backend" },
      { name: "Mobilnézet optimalizálás", status: "Várakozik", priority: "Közepes", assignees: ["Szabó Réka", "Nagy Tamás"], due: "2026-02-18", progress: 10, subtasksDone: 1, subtasksTotal: 4, category: "Frontend" },
    ],
  },
  {
    name: "Sprint 12 — Tesztelés & QA",
    color: "#A25DDC",
    tasks: [
      { name: "E2E teszt — bejelentkezési flow", status: "Kész", priority: "Magas", assignees: ["Varga Bence"], due: "2026-02-11", progress: 100, subtasksDone: 3, subtasksTotal: 3, category: "QA" },
      { name: "Teljesítmény audit — dashboard betöltés", status: "Folyamatban", priority: "Közepes", assignees: ["Varga Bence", "Tóth Gergő"], due: "2026-02-16", progress: 55, subtasksDone: 3, subtasksTotal: 5, category: "QA" },
      { name: "Regressziós teszt — v2.3 release", status: "Tervezés", priority: "Közepes", assignees: ["Varga Bence"], due: "2026-02-20", progress: 0, subtasksDone: 0, subtasksTotal: 8, category: "QA" },
    ],
  },
  {
    name: "Ügyfélprojektek",
    color: "#00CA72",
    tasks: [
      { name: "Webshop migráció — Techno Kft.", status: "Folyamatban", priority: "Kritikus", assignees: ["Kovács Ildikó", "Nagy Tamás"], due: "2026-02-17", progress: 30, subtasksDone: 3, subtasksTotal: 10, category: "Projekt" },
      { name: "CRM bevezetés — Marketing Pro Bt.", status: "Kész", priority: "Magas", assignees: ["Kovács Ildikó"], due: "2026-02-10", progress: 100, subtasksDone: 7, subtasksTotal: 7, category: "Projekt" },
      { name: "Automatizáció — HelloPack riporting", status: "Elakadt", priority: "Magas", assignees: ["Kovács Ildikó", "Tóth Gergő"], due: "2026-02-12", progress: 45, subtasksDone: 3, subtasksTotal: 6, category: "Projekt" },
      { name: "Landing page — Új Partnerek Kft.", status: "Várakozik", priority: "Alacsony", assignees: ["Szabó Réka"], due: "2026-02-25", progress: 0, subtasksDone: 0, subtasksTotal: 4, category: "Projekt" },
    ],
  },
  {
    name: "Belső fejlesztések",
    color: "#FDAB3D",
    tasks: [
      { name: "CI/CD pipeline frissítés", status: "Kész", priority: "Közepes", assignees: ["Tóth Gergő"], due: "2026-02-09", progress: 100, subtasksDone: 4, subtasksTotal: 4, category: "DevOps" },
      { name: "Dokumentáció — API endpoints", status: "Folyamatban", priority: "Alacsony", assignees: ["Nagy Tamás"], due: "2026-02-22", progress: 25, subtasksDone: 2, subtasksTotal: 8, category: "Docs" },
      { name: "Heti csapat standup sablon", status: "Kész", priority: "Alacsony", assignees: ["Kovács Ildikó"], due: "2026-02-08", progress: 100, subtasksDone: 2, subtasksTotal: 2, category: "Folyamat" },
    ],
  },
];

export function getStatusColor(status: string): string {
  return STATUS_OPTIONS.find((s) => s.label === status)?.color ?? "#C4C4C4";
}

export function getPriorityInfo(priority: string): PriorityOption {
  return PRIORITY_OPTIONS.find((p) => p.label === priority) ?? { label: priority, color: "#C4C4C4", emoji: "⚪" };
}

export function getMember(name: string): TeamMember | undefined {
  return TEAM_MEMBERS.find((m) => m.name === name);
}

export function getAllTasks(): DemoTask[] {
  return TASK_GROUPS.flatMap((g) => g.tasks);
}
