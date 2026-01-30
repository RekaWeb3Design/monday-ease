import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Pencil,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViewDataTable } from "@/components/board-views/ViewDataTable";
import { CreateViewDialog } from "@/components/board-views/CreateViewDialog";
import { getIconByName } from "@/components/board-views/IconPicker";
import { useCustomBoardViews } from "@/hooks/useCustomBoardViews";
import { useBoardViewData } from "@/hooks/useBoardViewData";
import { useAuth } from "@/hooks/useAuth";
import type { CustomBoardView, ViewColumn, ViewSettings } from "@/types";
import { format, parseISO, isPast, isToday, isThisWeek } from "date-fns";

export default function CustomViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { memberRole } = useAuth();
  const isOwner = memberRole === "owner";

  const { views, getViewBySlug, updateView } = useCustomBoardViews();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Find the view by slug
  const view = useMemo(() => getViewBySlug(slug || ""), [slug, getViewBySlug, views]);

  // Search, filter, and pagination state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch view data
  const {
    view: viewData,
    items,
    totalCount,
    currentPage,
    isLoading,
    error,
    refetch,
  } = useBoardViewData({
    viewId: view?.id || null,
    page,
    search: debouncedSearch,
    sortColumn,
    sortOrder,
  });

  // Reset sort to defaults when view loads
  useEffect(() => {
    if (view?.settings) {
      setSortColumn(view.settings.default_sort_column);
      setSortOrder(view.settings.default_sort_order);
    }
  }, [view?.id]);

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnId);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleEditSubmit = async (data: {
    name: string;
    description?: string;
    icon: string;
    monday_board_id: string;
    monday_board_name: string;
    selected_columns: ViewColumn[];
    settings: ViewSettings;
  }) => {
    if (view) {
      await updateView(view.id, data);
      refetch();
    }
  };

  // Loading state while views are being fetched
  if (!view && views.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // View not found
  if (!view) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-semibold">View not found</h2>
        <p className="text-muted-foreground mt-1">
          The view you're looking for doesn't exist.
        </p>
        <Button asChild className="mt-4">
          <Link to="/board-views">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Views
          </Link>
        </Button>
      </div>
    );
  }

  const IconComponent = getIconByName(view.icon);
  const settings = viewData?.settings || view.settings;
  const columns = viewData?.columns || view.selected_columns;
  const totalPages = Math.ceil(totalCount / 50);

  // Extract unique filter options from items for each filterable column
  const filterOptions: Record<string, { value: string; label: string; color?: string }[]> = {};
  columns.forEach(col => {
    const uniqueValues = new Map<string, { label: string; color?: string }>();
    
    items.forEach(item => {
      const cellValue = item.column_values[col.id];
      if (cellValue?.text || cellValue?.label) {
        const key = cellValue.label || cellValue.text || '';
        if (key && !uniqueValues.has(key)) {
          uniqueValues.set(key, {
            label: key,
            color: cellValue.label_style?.color
          });
        }
      }
    });
    
    // Only show filter if <= 20 unique values (and at least 1)
    if (uniqueValues.size > 0 && uniqueValues.size <= 20) {
      filterOptions[col.id] = Array.from(uniqueValues.entries())
        .map(([value, meta]) => ({ value, ...meta }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
  });

  // Filter items client-side
  const filteredItems = Object.keys(filters).length === 0 
    ? items 
    : items.filter(item => {
        return Object.entries(filters).every(([columnId, filterValue]) => {
          if (!filterValue || filterValue === 'all') return true;
          
          const cellValue = item.column_values[columnId];
          const column = columns.find(c => c.id === columnId);
          
          // Date column special handling
          if (column?.type === 'date') {
            if (!cellValue?.text) return filterValue === 'none';
            try {
              const date = parseISO(cellValue.text);
              if (filterValue === 'overdue') return isPast(date) && !isToday(date);
              if (filterValue === 'today') return isToday(date);
              if (filterValue === 'this_week') return isThisWeek(date);
            } catch {
              return true;
            }
            return true;
          }
          
          // Status/dropdown - exact match
          const displayValue = cellValue?.label || cellValue?.text || '';
          return displayValue === filterValue;
        });
      });

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length;

  // Clear all filters
  const clearFilters = () => setFilters({});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/board-views">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{view.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {view.monday_board_name}
              </Badge>
              {view.updated_at && (
                <span className="text-xs">
                  Updated {format(new Date(view.updated_at), "MMM d, h:mm a")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter bar */}
      <div className="space-y-3">
        {/* Search bar */}
        {settings.enable_search && (
          <div className="flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearch("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Filter bar */}
        {settings.enable_filters && Object.keys(filterOptions).length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {columns.map(col => {
              const options = filterOptions[col.id];
              if (!options) return null;
              
              const isDateColumn = col.type === 'date';
              const isStatusColumn = col.type === 'status' || col.type === 'color';
              
              if (isDateColumn) {
                return (
                  <Select
                    key={col.id}
                    value={filters[col.id] || 'all'}
                    onValueChange={(v) => setFilters(prev => ({ ...prev, [col.id]: v }))}
                  >
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue placeholder={col.title} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All {col.title}</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                    </SelectContent>
                  </Select>
                );
              }
              
              return (
                <Select
                  key={col.id}
                  value={filters[col.id] || 'all'}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, [col.id]: v }))}
                >
                  <SelectTrigger className="h-8 min-w-[120px] max-w-[180px]">
                    <SelectValue placeholder={col.title} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {col.title}</SelectItem>
                    {options.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {isStatusColumn && opt.color ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: opt.color }}
                            />
                            <span className="truncate">{opt.label}</span>
                          </div>
                        ) : (
                          <span className="truncate">{opt.label}</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })}
            
            {/* Clear Filters Button */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={clearFilters}
              >
                Clear Filters
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {activeFilterCount}
                </Badge>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Data table */}
      <ViewDataTable
        columns={columns}
        items={filteredItems}
        settings={settings}
        isLoading={isLoading}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      {/* Footer with pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredItems.length} of {totalCount} items
          {activeFilterCount > 0 && ` (${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active)`}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      {isOwner && (
        <CreateViewDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSubmit={handleEditSubmit}
          editingView={view}
        />
      )}
    </div>
  );
}
