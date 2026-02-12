import { getStatusColor } from "@/data/demoData";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap"
      style={{ backgroundColor: getStatusColor(status) }}
    >
      {status}
    </span>
  );
}
