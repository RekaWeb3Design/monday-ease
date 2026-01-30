import {
  Zap,
  Calendar,
  Mail,
  Clipboard,
  FileText,
  Users,
  Bell,
  Check,
  Send,
  Settings,
  RefreshCw,
  Database,
  Folder,
  Clock,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkflowTemplate } from "@/types";

const iconMap: Record<string, LucideIcon> = {
  zap: Zap,
  calendar: Calendar,
  mail: Mail,
  clipboard: Clipboard,
  "file-text": FileText,
  users: Users,
  bell: Bell,
  check: Check,
  send: Send,
  settings: Settings,
  "refresh-cw": RefreshCw,
  database: Database,
  folder: Folder,
  clock: Clock,
};

function getIcon(iconName: string | null): LucideIcon {
  if (!iconName) return Zap;
  return iconMap[iconName.toLowerCase()] || Zap;
}

interface TemplateCardProps {
  template: WorkflowTemplate;
  onRun: (template: WorkflowTemplate) => void;
}

export function TemplateCard({ template, onRun }: TemplateCardProps) {
  const IconComponent = getIcon(template.icon);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <IconComponent className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base">{template.name}</CardTitle>
              {template.is_premium && (
                <Badge className="bg-[#ffcd03] text-black text-xs">
                  Premium
                </Badge>
              )}
            </div>
          </div>
        </div>
        <CardDescription className="mt-2 line-clamp-2">
          {template.description || "No description available"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {template.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {template.execution_count || 0} runs
            </span>
          </div>
          <Button size="sm" onClick={() => onRun(template)}>
            Run
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
