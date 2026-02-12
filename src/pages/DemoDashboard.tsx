import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "@/components/demo-dashboard/OverviewTab";
import { TasksTab } from "@/components/demo-dashboard/TasksTab";
import { TeamTab } from "@/components/demo-dashboard/TeamTab";
import { TimelineTab } from "@/components/demo-dashboard/TimelineTab";
import { ReportsTab } from "@/components/demo-dashboard/ReportsTab";
import { DemoDashboardProvider, useDemoDashboard } from "@/components/demo-dashboard/DemoDashboardContext";
import { TaskDetailPanel } from "@/components/demo-dashboard/TaskDetailPanel";
import { GlobalFilters } from "@/components/demo-dashboard/GlobalFilters";

function DemoDashboardContent() {
  const { filteredTasks, allTasks } = useDemoDashboard();
  const isFiltered = filteredTasks.length !== allTasks.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Smart Dashboard — Demo
        </h1>
        <p className="text-muted-foreground mt-1">
          Ez a nézet mintaadatokkal mutatja, hogyan néz ki egy testreszabott MondayEase dashboard
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
        ⚡ Demo mód — mintaadatokkal működik. Éles használatban a Monday.com boardjaid adatai jelennek meg itt.
      </div>

      <GlobalFilters />

      <div className="flex items-center justify-between gap-4">
        <Tabs defaultValue="attekintes" className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="attekintes">Áttekintés</TabsTrigger>
              <TabsTrigger value="feladatok">
                Feladatok{isFiltered ? ` (${filteredTasks.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="csapat">Csapat</TabsTrigger>
              <TabsTrigger value="idovonal">Idővonal</TabsTrigger>
              <TabsTrigger value="riportok">Riportok</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm font-medium text-foreground">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              📂 TechnoSolutions Kft.
            </div>
          </div>

          <TabsContent value="attekintes"><OverviewTab /></TabsContent>
          <TabsContent value="feladatok"><TasksTab /></TabsContent>
          <TabsContent value="csapat"><TeamTab /></TabsContent>
          <TabsContent value="idovonal"><TimelineTab /></TabsContent>
          <TabsContent value="riportok"><ReportsTab /></TabsContent>
        </Tabs>
      </div>

      <p className="text-[10px] text-muted-foreground text-center pt-4">
        MondayEase Smart Dashboard — Powered by Monday.com adatok | Utolsó szinkron: 2026.02.12 15:30
      </p>
    </div>
  );
}

export default function DemoDashboard() {
  return (
    <DemoDashboardProvider>
      <DemoDashboardContent />
      <TaskDetailPanel />
    </DemoDashboardProvider>
  );
}
