import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DemoDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Smart Dashboard — Demo
        </h1>
        <p className="text-muted-foreground mt-1">
          Ez a nézet mintaadatokkal mutatja, hogyan néz ki egy testreszabott MondayEase dashboard
        </p>
      </div>

      {/* Amber demo banner */}
      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
        ⚡ Demo mód — mintaadatokkal működik. Éles használatban a Monday.com boardjaid adatai jelennek meg itt.
      </div>

      {/* Workspace selector + Tabs row */}
      <div className="flex items-center justify-between gap-4">
        <Tabs defaultValue="attekintes" className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="attekintes">Áttekintés</TabsTrigger>
              <TabsTrigger value="feladatok">Feladatok</TabsTrigger>
              <TabsTrigger value="csapat">Csapat</TabsTrigger>
              <TabsTrigger value="idovonal">Idővonal</TabsTrigger>
            </TabsList>

            {/* Decorative workspace chip */}
            <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm font-medium text-foreground">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              📂 TechnoSolutions Kft.
            </div>
          </div>

          <TabsContent value="attekintes">
            <Card>
              <CardHeader>
                <CardTitle>Áttekintés</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Hamarosan...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feladatok">
            <Card>
              <CardHeader>
                <CardTitle>Feladatok</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Hamarosan...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="csapat">
            <Card>
              <CardHeader>
                <CardTitle>Csapat</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Hamarosan...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="idovonal">
            <Card>
              <CardHeader>
                <CardTitle>Idővonal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Hamarosan...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
