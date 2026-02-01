import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnCell } from "./ColumnCell";
import type { ViewDataItem, ViewColumn, ViewSettings } from "@/types";

interface CardViewProps {
  items: ViewDataItem[];
  columns: ViewColumn[];
  settings: ViewSettings;
  isLoading: boolean;
}

export function CardView({ items, columns, settings, isLoading }: CardViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card 
          key={item.id} 
          className="overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <CardHeader className="pb-2">
            {settings.show_item_name && (
              <CardTitle className="text-base font-semibold leading-tight line-clamp-2">
                {item.name}
              </CardTitle>
            )}
            {/* Status badges */}
            {statusColumns.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
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
          <CardContent className="pt-0">
            <dl className="space-y-2">
              {otherColumns.slice(0, 4).map((col) => {
                const cellValue = item.column_values[col.id];
                if (!cellValue?.text && !cellValue?.value) return null;
                return (
                  <div key={col.id} className="flex items-start gap-2">
                    <dt className="text-xs text-muted-foreground shrink-0 min-w-[60px]">
                      {col.title}:
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
