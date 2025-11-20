import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Breakpoint, GridItem, ItemLayout } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Copy, Trash2, Layers, ArrowLeft, ArrowRight, Grid } from "lucide-react";

interface ItemsPanelProps {
  items: GridItem[];
  breakpoint: Breakpoint;
  prevBreakpoint: Breakpoint | null;
  nextBreakpoint: Breakpoint | null;
  onUpdate: (itemId: number, field: keyof ItemLayout, value: string) => void;
  onRemove: (itemId: number) => void;
  onDuplicate: (itemId: number) => void;
  onCopyFrom: (direction: "prev" | "next") => void;
  onConvertToGrid: (itemId: number) => void;
  canCopyPrev: boolean;
  canCopyNext: boolean;
  selectedItemId: number | null;
  onSelect: (id: number | null) => void;
  parentItem?: GridItem | null;
  onNavigateUp?: () => void;
}

const fields: Array<{
  key: keyof ItemLayout;
  label: string;
  type?: "text" | "number";
  min?: number;
  max?: number;
}> = [
  { key: "colStart", label: "Col Start" },
  { key: "colEnd", label: "Col End" },
  { key: "rowStart", label: "Row Start" },
  { key: "rowEnd", label: "Row End" },
  { key: "colSpan", label: "Col Span", type: "number", min: 1, max: 12 },
  { key: "rowSpan", label: "Row Span", type: "number", min: 1, max: 12 },
  { key: "order", label: "Order" },
];

export function ItemsPanel({
  items,
  breakpoint,
  prevBreakpoint,
  nextBreakpoint,
  onUpdate,
  onDuplicate,
  onRemove,
  onCopyFrom,
  onConvertToGrid,
  canCopyPrev,
  canCopyNext,
  selectedItemId,
  onSelect,
  parentItem,
  onNavigateUp,
}: ItemsPanelProps) {
  return (
    <Card 
      className="border-0 shadow-xl shadow-indigo-500/5 ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden flex flex-col h-full"
      onClick={(e) => e.stopPropagation()}
    >
      <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {parentItem && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 -ml-2 mr-1" 
                onClick={onNavigateUp}
                title="Back to Parent Grid"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-200">
              <Layers className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              {parentItem ? `Subgrid ${parentItem.id}` : "Items"} 
              <span className="text-slate-400 dark:text-slate-500 font-normal">({items.length})</span>
            </CardTitle>
          </div>
          <span className="px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wide">
            {breakpoint}
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-indigo-600 dark:hover:text-indigo-400"
            disabled={!canCopyPrev}
            onClick={() => onCopyFrom("prev")}
          >
            <ArrowLeft className="w-3 h-3 mr-1.5" />
            Copy {prevBreakpoint?.toUpperCase()}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-indigo-600 dark:hover:text-indigo-400"
            disabled={!canCopyNext}
            onClick={() => onCopyFrom("next")}
          >
            Copy {nextBreakpoint?.toUpperCase()}
            <ArrowRight className="w-3 h-3 ml-1.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <Layers className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-200">No items yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
                  Add items from the settings panel to start building your grid.
                </p>
              </div>
            )}
            {items.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                index={index}
                breakpoint={breakpoint}
                onUpdate={onUpdate}
                onDuplicate={onDuplicate}
                onRemove={onRemove}
                onConvertToGrid={onConvertToGrid}
                selectedItemId={selectedItemId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ItemCard({
  item,
  index,
  breakpoint,
  onUpdate,
  onDuplicate,
  onRemove,
  onConvertToGrid,
  selectedItemId,
  onSelect,
}: {
  item: GridItem;
  index: number;
  breakpoint: Breakpoint;
  onUpdate: (itemId: number, field: keyof ItemLayout, value: string) => void;
  onDuplicate: (itemId: number) => void;
  onRemove: (itemId: number) => void;
  onConvertToGrid: (itemId: number) => void;
  selectedItemId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const layout = item.layout[breakpoint];

  return (
    <div
      className={cn(
        "group rounded-xl border p-4 shadow-sm transition-all hover:shadow-md",
        selectedItemId === item.id
          ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-indigo-200 dark:hover:border-indigo-800"
      )}
      onClick={() => onSelect(item.id)}
    >
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm transition-transform group-hover:scale-110",
              item.color
            )}
          >
            {index + 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                Item {index + 1}
              </p>
              {item.subGrid && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                  Grid
                </span>
              )}
            </div>
            <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">ID: {item.id}</p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!item.subGrid && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
              onClick={(e) => {
                e.stopPropagation();
                onConvertToGrid(item.id);
              }}
              title="Convert to Grid"
            >
              <Grid className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(item.id);
            }}
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {field.label}
            </Label>
            <Input
              type={field.type ?? "text"}
              min={field.min}
              max={field.max}
              value={layout[field.key] as string | number}
              onChange={(e) => onUpdate(item.id, field.key, e.target.value)}
              className="h-8 text-xs font-mono bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-500 dark:text-slate-200"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
