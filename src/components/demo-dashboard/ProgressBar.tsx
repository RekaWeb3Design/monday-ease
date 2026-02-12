function getProgressColor(value: number): string {
  if (value >= 100) return "#00CA72";
  if (value >= 60) return "#0086C0";
  if (value >= 30) return "#FDAB3D";
  return "#E2445C";
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden min-w-[60px]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: getProgressColor(value) }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{value}%</span>
    </div>
  );
}
