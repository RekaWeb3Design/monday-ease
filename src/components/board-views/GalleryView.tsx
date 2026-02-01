import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ColumnCell } from "./ColumnCell";
import type { ViewDataItem, ViewColumn, ViewSettings } from "@/types";

interface GalleryViewProps {
  items: ViewDataItem[];
  columns: ViewColumn[];
  settings: ViewSettings;
  isLoading: boolean;
}

export function GalleryView({ items, columns, settings, isLoading }: GalleryViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-4/5" />
              <div className="flex gap-2 mt-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">No items found</p>
        <p className="text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  // Separate status columns from other columns
  const statusColumns = columns.filter(col => col.type === 'status' || col.type === 'color');
  const otherColumns = columns.filter(col => col.type !== 'status' && col.type !== 'color');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {items.map((item) => (
        <Card 
          key={item.id} 
          className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
        >
          <CardHeader className="pb-3">
            {settings.show_item_name && (
              <CardTitle className="text-lg font-semibold leading-tight line-clamp-2">
                {item.name}
              </CardTitle>
            )}
            {/* Status badges */}
            {statusColumns.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {statusColumns.map((col) => {
                  const cellValue = item.column_values[col.id];
                  if (!cellValue?.text && !cellValue?.label) return null;
                  return (
                    <ColumnCell
                      key={col.id}
                      type={col.type}
                      text={cellValue?.text || null}
                      value={cellValue?.value}
                      label={cellValue?.label}
                      labelStyle={cellValue?.label_style}
                    />
                  );
                })}
              </div>
            )}
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <dl className="space-y-2.5">
              {otherColumns.map((col) => {
                const cellValue = item.column_values[col.id];
                if (!cellValue?.text && !cellValue?.value) return null;
                return (
                  <div key={col.id} className="flex items-start gap-3">
                    <dt className="text-xs font-medium text-muted-foreground shrink-0 min-w-[80px] uppercase tracking-wide">
                      {col.title}
                    </dt>
                    <dd className="text-sm flex-1 min-w-0">
                      <ColumnCell
                        type={col.type}
                        text={cellValue?.text || null}
                        value={cellValue?.value}
                        label={cellValue?.label}
                        labelStyle={cellValue?.label_style}
                      />
                    </dd>
                  </div>
                );
              })}
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
