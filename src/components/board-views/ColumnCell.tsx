import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, parseISO, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

interface ColumnCellProps {
  type: string;
  text: string | null;
  value: any;
  label?: string;
  labelStyle?: { color?: string };
}

// Monday.com status colors
const STATUS_COLORS: Record<string, string> = {
  "Done": "#00CA72",
  "Working on it": "#FDAB3D",
  "Stuck": "#E2445C",
  "Pending": "#579BFC",
  "Not Started": "#C4C4C4",
};

export function ColumnCell({ type, text, value, label, labelStyle }: ColumnCellProps) {
  // Status column
  if (type === "status" || type === "color") {
    const displayLabel = label || text || "—";
    const bgColor = labelStyle?.color || STATUS_COLORS[displayLabel] || "#C4C4C4";

    return (
      <Badge
        className="text-white font-medium text-xs"
        style={{ backgroundColor: bgColor }}
      >
        {displayLabel}
      </Badge>
    );
  }

  // Date column
  if (type === "date") {
    if (!text) return <span className="text-muted-foreground">—</span>;

    try {
      const date = parseISO(text);
      const isOverdue = isPast(date) && !isToday(date);

      return (
        <span className={cn(isOverdue && "text-destructive font-medium")}>
          {format(date, "MMM d, yyyy")}
        </span>
      );
    } catch {
      return <span>{text}</span>;
    }
  }

  // Person/People column
  if (type === "people" || type === "person" || type === "multiple-person") {
    if (!text) return <span className="text-muted-foreground">—</span>;

    const names = text.split(",").map((n) => n.trim()).filter(Boolean);

    if (names.length === 0) {
      return <span className="text-muted-foreground">—</span>;
    }

    if (names.length === 1) {
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {names[0].charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate max-w-[120px]">{names[0]}</span>
        </div>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <div className="flex -space-x-2">
              {names.slice(0, 3).map((name, i) => (
                <Avatar key={i} className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {names.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{names.length - 3}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <ul className="text-sm">
            {names.map((name, i) => (
              <li key={i}>{name}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Number column
  if (type === "numbers" || type === "numeric") {
    return (
      <span className="font-mono text-right block">
        {text || "—"}
      </span>
    );
  }

  // Checkbox column
  if (type === "checkbox" || type === "boolean") {
    const checked = text === "v" || text === "true" || value === true;
    return (
      <span className={cn(checked ? "text-primary" : "text-muted-foreground")}>
        {checked ? "✓" : "—"}
      </span>
    );
  }

  // Link column
  if (type === "link") {
    if (!text) return <span className="text-muted-foreground">—</span>;

    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      const url = parsed?.url || text;
      const linkText = parsed?.text || text;

      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:no-underline truncate max-w-[150px] block"
        >
          {linkText}
        </a>
      );
    } catch {
      return <span className="truncate max-w-[150px] block">{text}</span>;
    }
  }

  // Long text - show truncated with tooltip
  if (type === "long-text" || type === "text") {
    if (!text) return <span className="text-muted-foreground">—</span>;

    if (text.length > 50) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="truncate max-w-[200px] block cursor-help">
              {text.slice(0, 50)}...
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-[300px]">
            <p className="whitespace-pre-wrap">{text}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return <span>{text}</span>;
  }

  // Default: show text or placeholder
  return <span>{text || "—"}</span>;
}
