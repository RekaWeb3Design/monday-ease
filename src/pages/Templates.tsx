import { useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { useWorkflowTemplates } from "@/hooks/useWorkflowTemplates";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { ExecuteTemplateDialog } from "@/components/templates/ExecuteTemplateDialog";
import type { WorkflowTemplate } from "@/types";

export default function Templates() {
  const { templates, isLoading } = useWorkflowTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleRun = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Workflow Templates</h1>
        <p className="text-muted-foreground">
          Automate your Monday.com workflows with pre-built templates
        </p>
      </div>

      {/* Empty state or grid */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <div className="rounded-full bg-primary/10 p-3 mb-4">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">No templates available</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Check back soon for new automation templates to streamline your Monday.com workflows.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onRun={handleRun}
            />
          ))}
        </div>
      )}

      <ExecuteTemplateDialog
        template={selectedTemplate}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => setDialogOpen(false)}
      />
    </div>
  );
}
