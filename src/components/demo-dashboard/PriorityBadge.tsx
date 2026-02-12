import { getPriorityInfo } from "@/data/demoData";

export function PriorityBadge({ priority }: { priority: string }) {
  const info = getPriorityInfo(priority);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap"
      style={{ backgroundColor: info.color }}
    >
      {info.emoji} {info.label}
    </span>
  );
}
