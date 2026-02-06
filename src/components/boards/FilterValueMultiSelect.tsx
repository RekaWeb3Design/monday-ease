import { useState, useMemo } from "react";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FilterValueMultiSelectProps {
  availableValues: { value: string; color?: string }[];
  loading: boolean;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function FilterValueMultiSelect({
  availableValues,
  loading,
  selectedValues,
  onChange,
  disabled,
  placeholder = "Select filter values...",
}: FilterValueMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredValues = useMemo(() => {
    if (!search) return availableValues;
    return availableValues.filter((v) =>
      v.value.toLowerCase().includes(search.toLowerCase())
    );
  }, [availableValues, search]);

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-[36px] text-sm font-normal"
          disabled={disabled}
        >
          {selectedValues.length > 0 ? (
            <div className="flex flex-wrap gap-1 py-0.5">
              {selectedValues.map((v) => (
                <Badge key={v} variant="secondary" className="text-xs">
                  {v}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        {/* Search input */}
        <div className="p-2 border-b">
          <Input
            placeholder="Search values..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            Loading values...
          </div>
        ) : filteredValues.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No values found
          </div>
        ) : (
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filteredValues.map((val) => (
              <div
                key={val.value}
                className="flex items-center gap-2 py-1.5 px-2 hover:bg-accent rounded cursor-pointer"
                onClick={() => toggleValue(val.value)}
              >
                <Checkbox
                  checked={selectedValues.includes(val.value)}
                  onCheckedChange={() => toggleValue(val.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                {val.color && (
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: val.color }}
                  />
                )}
                <span className="text-sm truncate">{val.value}</span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
