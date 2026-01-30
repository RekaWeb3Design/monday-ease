import { useState } from "react";
import { Zap, Crown, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkflowTemplates } from "@/hooks/useWorkflowTemplates";
import { ExecuteTemplateDialog } from "@/components/templates/ExecuteTemplateDialog";
import type { WorkflowTemplate } from "@/types";

export function QuickActions() {
  const { templates, isLoading } = useWorkflowTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleTemplateClick = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    // Dialog will show success state
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Quick Actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
            onClick={() => handleTemplateClick(template)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm truncate">
                      {template.name}
                    </h3>
                    {template.is_premium && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        <Crown className="h-3 w-3 mr-1" />
                        Pro
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {template.description || "Run this workflow"}
                  </p>
                </div>
              </div>
              <Button size="sm" className="w-full mt-3">
                Run
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <ExecuteTemplateDialog
        template={selectedTemplate}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
