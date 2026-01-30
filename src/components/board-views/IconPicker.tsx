import { useState } from "react";
import {
  Table,
  LayoutGrid,
  List,
  Calendar,
  Users,
  FileText,
  CheckSquare,
  BarChart3,
  Clock,
  Star,
  Target,
  Briefcase,
  Inbox,
  Layers,
  Activity,
  TrendingUp,
  Folder,
  ClipboardList,
  Kanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ICONS = [
  { name: "table", Icon: Table },
  { name: "layout-grid", Icon: LayoutGrid },
  { name: "list", Icon: List },
  { name: "calendar", Icon: Calendar },
  { name: "users", Icon: Users },
  { name: "file-text", Icon: FileText },
  { name: "check-square", Icon: CheckSquare },
  { name: "bar-chart", Icon: BarChart3 },
  { name: "clock", Icon: Clock },
  { name: "star", Icon: Star },
  { name: "target", Icon: Target },
  { name: "briefcase", Icon: Briefcase },
  { name: "inbox", Icon: Inbox },
  { name: "layers", Icon: Layers },
  { name: "activity", Icon: Activity },
  { name: "trending-up", Icon: TrendingUp },
  { name: "folder", Icon: Folder },
  { name: "clipboard-list", Icon: ClipboardList },
  { name: "kanban", Icon: Kanban },
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredIcons = ICONS.filter((icon) =>
    icon.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedIcon = ICONS.find((i) => i.name === value) || ICONS[0];
  const SelectedIconComponent = selectedIcon.Icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <SelectedIconComponent className="h-4 w-4" />
          <span className="capitalize">{value.replace(/-/g, " ")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <Input
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />
        <div className="grid grid-cols-5 gap-1">
          {filteredIcons.map(({ name, Icon }) => (
            <Button
              key={name}
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9",
                value === name && "bg-primary text-primary-foreground"
              )}
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
        {filteredIcons.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-2">
            No icons found
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Helper to get icon component by name
export function getIconByName(name: string) {
  const found = ICONS.find((i) => i.name === name);
  return found?.Icon || Table;
}
