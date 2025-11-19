import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Breakpoint, BreakpointDefinition } from "@/lib/types";

interface BreakpointTabsProps {
  current: Breakpoint;
  items: BreakpointDefinition[];
  onSelect: (value: Breakpoint) => void;
}

export function BreakpointTabs({
  current,
  items,
  onSelect,
}: BreakpointTabsProps) {
  return (
    <Tabs value={current} onValueChange={(val) => onSelect(val as Breakpoint)}>
      <TabsList>
        {items.map((bp) => (
          <TabsTrigger key={bp.value} value={bp.value}>
            <div className="flex flex-col p-1">
              <span className="text-xs text-muted-foreground">{bp.label}</span>
            </div>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
