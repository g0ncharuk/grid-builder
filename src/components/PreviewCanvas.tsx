import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { CELL_BASE_SIZE } from "@/lib/constants";
import type {
  Breakpoint,
  DragIndicator,
  GridItem,
  GridSetting,
  ItemLayout,
} from "@/lib/types";
import { clamp, getSpan, isAuto } from "@/lib/grid";
import { cn } from "@/lib/utils";
import { Eye, Code, Copy, Check, Grid, Move } from "lucide-react";

interface PreviewCanvasProps {
  items: GridItem[];
  breakpoint: Breakpoint;
  settings: GridSetting;
  showGrid: boolean;
  dragMode: boolean;
  onToggleShowGrid: (value: boolean) => void;
  onToggleDragMode: (value: boolean) => void;
  mutateLayout: (
    itemId: number,
    breakpoint: Breakpoint,
    cb: (layout: ItemLayout) => ItemLayout
  ) => void;
  code: string;
  onCopyCode: () => void;
  selectedItemId: number | null;
  onSelect: (id: number | null) => void;
  useClassName: boolean;
  onToggleUseClassName: (value: boolean) => void;
}

interface GridMetrics {
  colWidths: number[];
  rowHeights: number[];
  gapPx: number;
  gridRect: DOMRect;
}

interface DragSession {
  mode: "move" | "resize";
  itemId: number;
  breakpoint: Breakpoint;
  startCol: number;
  startRow: number;
  baseColSpan: number;
  baseRowSpan: number;
  startWidth: number;
  startHeight: number;
}

// Helper to parse computed grid template
const parseTrackSizes = (value: string): number[] => {
  return value.split(/\s+/).map((v) => parseFloat(v));
};

// Helper to get track string
const getTrackStyle = (tracks?: { value: number; unit: string }[]) => {
  if (!tracks) return undefined;
  return tracks
    .map((t) => {
      if (
        t.unit === "auto" ||
        t.unit === "min-content" ||
        t.unit === "max-content"
      )
        return t.unit;
      return `${t.value}${t.unit}`;
    })
    .join(" ");
};

// Helper to get pixel position of a track index
const getTrackPosition = (index: number, sizes: number[], gap: number) => {
  let pos = 0;
  for (let i = 0; i < index - 1; i++) {
    pos += sizes[i] + gap;
  }
  return pos;
};

const positionFromCoords = (
  x: number,
  y: number,
  metrics: GridMetrics,
  colSpan: number,
  rowSpan: number,
  totalCols: number,
  totalRows: number
) => {
  let colStart = 1;
  let currentX = 0;
  for (let i = 0; i < metrics.colWidths.length; i++) {
    const width = metrics.colWidths[i];
    if (x < currentX + width / 2) {
      break;
    }
    currentX += width + metrics.gapPx;
    colStart++;
  }
  
  let rowStart = 1;
  let currentY = 0;
  for (let i = 0; i < metrics.rowHeights.length; i++) {
    const height = metrics.rowHeights[i];
    if (y < currentY + height / 2) {
      break;
    }
    currentY += height + metrics.gapPx;
    rowStart++;
  }

  const maxCol = Math.max(1, totalCols - colSpan + 1);
  const maxRow = Math.max(1, totalRows - rowSpan + 1);

  return {
    colStart: clamp(colStart, 1, maxCol),
    rowStart: clamp(rowStart, 1, maxRow),
  };
};

const positionFromRect = (
  rect: { left: number; top: number; width: number; height: number },
  metrics: GridMetrics,
  colSpan: number,
  rowSpan: number,
  totalCols: number,
  totalRows: number
) => {
  const relativeX = rect.left - metrics.gridRect.left;
  const relativeY = rect.top - metrics.gridRect.top;
  return positionFromCoords(relativeX, relativeY, metrics, colSpan, rowSpan, totalCols, totalRows);
};

const spanFromSize = (
  size: number,
  startIndex: number,
  sizes: number[],
  gap: number,
  maxSpan: number
) => {
  let currentSize = 0;
  let span = 0;
  
  for (let i = startIndex - 1; i < sizes.length; i++) {
    currentSize += sizes[i];
    span++;
    if (currentSize >= size - gap / 2) { // Tolerance
      break;
    }
    currentSize += gap;
  }
  
  return clamp(span, 1, maxSpan);
};

const indicatorFrom = (
  colStart: number,
  rowStart: number,
  colSpan: number,
  rowSpan: number,
  metrics: GridMetrics
): DragIndicator => {
  const left = getTrackPosition(colStart, metrics.colWidths, metrics.gapPx);
  const top = getTrackPosition(rowStart, metrics.rowHeights, metrics.gapPx);
  
  let width = 0;
  for (let i = colStart - 1; i < colStart - 1 + colSpan; i++) {
    if (i < metrics.colWidths.length) width += metrics.colWidths[i];
  }
  width += metrics.gapPx * Math.max(colSpan - 1, 0);
  
  let height = 0;
  for (let i = rowStart - 1; i < rowStart - 1 + rowSpan; i++) {
    if (i < metrics.rowHeights.length) height += metrics.rowHeights[i];
  }
  height += metrics.gapPx * Math.max(rowSpan - 1, 0);

  return { left, top, width, height };
};

const setItemsForMove = (
  session: DragSession,
  coords: { colStart: number; rowStart: number },
  mutateLayout: PreviewCanvasProps["mutateLayout"]
) => {
  mutateLayout(session.itemId, session.breakpoint, (layout) => ({
    ...layout,
    colStart: String(coords.colStart),
    colEnd: String(coords.colStart + session.baseColSpan),
    rowStart: String(coords.rowStart),
    rowEnd: String(coords.rowStart + session.baseRowSpan),
  }));
};

const setItemsForResize = (
  session: DragSession,
  colSpan: number,
  rowSpan: number,
  mutateLayout: PreviewCanvasProps["mutateLayout"],
  totalCols: number
) => {
  mutateLayout(session.itemId, session.breakpoint, (layout) => {
    const next = { ...layout };

    if (!isAuto(next.colStart)) {
      const start = Number(next.colStart) || session.startCol;
      next.colEnd = String(Math.min(start + colSpan, totalCols + 1));
    } else {
      next.colSpan = colSpan;
    }

    if (!isAuto(next.rowStart)) {
      const start = Number(next.rowStart) || session.startRow;
      next.rowEnd = String(start + rowSpan);
    } else {
      next.rowSpan = rowSpan;
    }

    return next;
  });
};

interface InteractiveGridProps {
  items: GridItem[];
  settings: GridSetting;
  breakpoint: Breakpoint;
  showGrid: boolean;
  dragMode: boolean;
  mutateLayout: PreviewCanvasProps["mutateLayout"];
  selectedItemId: number | null;
  onSelect: (id: number | null) => void;
  isSubGrid?: boolean;
}

function InteractiveGrid({
  items,
  settings,
  breakpoint,
  showGrid,
  dragMode,
  mutateLayout,
  selectedItemId,
  onSelect,
  isSubGrid = false,
}: InteractiveGridProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [indicator, setIndicator] = useState<DragIndicator | null>(null);
  const [gridBackground, setGridBackground] = useState<CSSProperties | null>(null);
  const dragSession = useRef<DragSession | null>(null);
  
  // Use a unique sensor instance for each grid to avoid conflicts?
  // Actually, we want to stop propagation if a child handles the drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { distance: 2 },
      // Prevent default to avoid scrolling while dragging
    })
  );

  const gapRem = useMemo(() => settings.gap * 0.25, [settings.gap]);

  const gridStyles = useMemo(() => {
    const gap = `${gapRem}rem`;
    const colStyle = getTrackStyle(settings.colTracks);
    const rowStyle = getTrackStyle(settings.rowTracks);

    return {
      gridTemplateColumns:
        colStyle || `repeat(${settings.cols}, minmax(0, 1fr))`,
      gridTemplateRows:
        rowStyle ||
        `repeat(${settings.rows}, minmax(${CELL_BASE_SIZE}px, 1fr))`,
      gridAutoRows: `minmax(${CELL_BASE_SIZE}px, 1fr)`,
      gap,
      minHeight: isSubGrid ? '100%' : `${
        settings.rows * CELL_BASE_SIZE +
        gapRem * 16 * Math.max(settings.rows - 1, 0)
      }px`,
    };
  }, [gapRem, settings.cols, settings.rows, settings.colTracks, settings.rowTracks, isSubGrid]);

  const getMetrics = useCallback((): GridMetrics | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    
    const style = window.getComputedStyle(grid);
    const colWidths = parseTrackSizes(style.gridTemplateColumns);
    const rowHeights = parseTrackSizes(style.gridTemplateRows);
    const rect = grid.getBoundingClientRect();
    const gapPx = gapRem * 16;

    if (colWidths.length === 0 || rowHeights.length === 0) {
       const width = Math.max(rect.width - gapPx * (settings.cols - 1), 0);
       const height = Math.max(rect.height - gapPx * (settings.rows - 1), 0);
       return {
         colWidths: Array(settings.cols).fill(width / settings.cols),
         rowHeights: Array(settings.rows).fill(height / settings.rows),
         gapPx,
         gridRect: rect,
       };
    }

    return {
      colWidths,
      rowHeights,
      gapPx,
      gridRect: rect,
    };
  }, [gapRem, settings.cols, settings.rows]);

  useEffect(() => {
    const stroke = "var(--grid-line-color)";
    const node = gridRef.current;
    if (!node) return;

    const update = () => {
      const metrics = getMetrics();
      if (!metrics) return;
      
      const cols = metrics.colWidths.length;
      const rows = metrics.rowHeights.length;
      
      const avgColWidth = metrics.colWidths.reduce((a, b) => a + b, 0) / cols;
      const avgRowHeight = metrics.rowHeights.reduce((a, b) => a + b, 0) / rows;
      
      const sizeX = avgColWidth + metrics.gapPx;
      const sizeY = avgRowHeight + metrics.gapPx;
      
      setGridBackground({
        backgroundImage: `
          linear-gradient(-90deg, ${stroke} ${metrics.gapPx}px, transparent ${metrics.gapPx}px),
          linear-gradient(0deg, ${stroke} ${metrics.gapPx}px, transparent ${metrics.gapPx}px)
        `,
        backgroundSize: `${sizeX}px ${sizeY}px`,
        backgroundPosition: `0 0`,
      });
    };

    update();
    const resizeObserver = new ResizeObserver(() => update());
    resizeObserver.observe(node);

    return () => resizeObserver.disconnect();
  }, [getMetrics, showGrid, items, settings.cols, settings.rows]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (!dragMode) return;
      const data = event.active.data.current as
        | { type: "item"; itemId: number }
        | { type: "resize"; itemId: number }
        | undefined;
      if (!data) return;

      // Check if this item belongs to THIS grid
      const item = items.find((i) => i.id === data.itemId);
      if (!item) return; // Not our item

      const layout = item.layout[breakpoint];
      const metrics = getMetrics();
      if (!layout || !metrics) return;

      const nodeRect = itemRefs.current
        .get(data.itemId)
        ?.getBoundingClientRect();
      const rect =
        nodeRect ||
        event.active.rect.current.translated ||
        event.active.rect.current.initial ||
        null;
      if (!rect) return;

      const spans = {
        col: getSpan(layout, "col"),
        row: getSpan(layout, "row"),
      };
      const coords = positionFromRect(
        rect,
        metrics,
        spans.col,
        spans.row,
        settings.cols,
        settings.rows
      );

      dragSession.current = {
        mode: data.type === "resize" ? "resize" : "move",
        itemId: data.itemId,
        breakpoint,
        startCol: coords.colStart,
        startRow: coords.rowStart,
        baseColSpan: spans.col,
        baseRowSpan: spans.row,
        startWidth: rect.width,
        startHeight: rect.height,
      };

      setIndicator(
        indicatorFrom(
          coords.colStart,
          coords.rowStart,
          spans.col,
          spans.row,
          metrics
        )
      );
    },
    [breakpoint, dragMode, getMetrics, items, settings.cols, settings.rows]
  );

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const session = dragSession.current;
      if (!session) return;
      const metrics = getMetrics();
      if (!metrics) return;

      if (session.mode === "move") {
        const startX = getTrackPosition(session.startCol, metrics.colWidths, metrics.gapPx);
        const startY = getTrackPosition(session.startRow, metrics.rowHeights, metrics.gapPx);
        
        const currentX = startX + event.delta.x;
        const currentY = startY + event.delta.y;
        
        const { colStart, rowStart } = positionFromCoords(
            currentX, 
            currentY, 
            metrics, 
            session.baseColSpan, 
            session.baseRowSpan, 
            settings.cols, 
            settings.rows
        );

        setIndicator(
          indicatorFrom(
            colStart,
            rowStart,
            session.baseColSpan,
            session.baseRowSpan,
            metrics
          )
        );
      } else {
        const width = Math.max(16, session.startWidth + event.delta.x);
        const height = Math.max(16, session.startHeight + event.delta.y);
        
        const colSpan = spanFromSize(
          width,
          session.startCol,
          metrics.colWidths,
          metrics.gapPx,
          settings.cols
        );
        const rowSpan = spanFromSize(
          height,
          session.startRow,
          metrics.rowHeights,
          metrics.gapPx,
          settings.rows
        );
        
        setIndicator(
          indicatorFrom(
            session.startCol,
            session.startRow,
            colSpan,
            rowSpan,
            metrics
          )
        );
      }
    },
    [getMetrics, settings.cols, settings.rows]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const session = dragSession.current;
      dragSession.current = null;
      const metrics = getMetrics();
      if (!session || !metrics) {
        setIndicator(null);
        return;
      }

      if (session.mode === "move") {
        const startX = getTrackPosition(session.startCol, metrics.colWidths, metrics.gapPx);
        const startY = getTrackPosition(session.startRow, metrics.rowHeights, metrics.gapPx);
        
        const currentX = startX + event.delta.x;
        const currentY = startY + event.delta.y;
        
        const { colStart, rowStart } = positionFromCoords(
            currentX, 
            currentY, 
            metrics, 
            session.baseColSpan, 
            session.baseRowSpan, 
            settings.cols, 
            settings.rows
        );
        
        setItemsForMove(session, { colStart, rowStart }, mutateLayout);
      } else {
        const width = Math.max(16, session.startWidth + event.delta.x);
        const height = Math.max(16, session.startHeight + event.delta.y);
        
        const colSpan = spanFromSize(
          width,
          session.startCol,
          metrics.colWidths,
          metrics.gapPx,
          settings.cols
        );
        const rowSpan = spanFromSize(
          height,
          session.startRow,
          metrics.rowHeights,
          metrics.gapPx,
          settings.rows
        );
        
        setItemsForResize(
          session,
          colSpan,
          rowSpan,
          mutateLayout,
          settings.cols
        );
      }

      setIndicator(null);
    },
    [getMetrics, mutateLayout, settings.cols, settings.rows]
  );

  const handleDragCancel = useCallback(() => {
    dragSession.current = null;
    setIndicator(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        ref={gridRef}
        className={cn(
          "relative grid transition-colors rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm",
          dragMode
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-default",
          isSubGrid && "h-full w-full border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 shadow-none"
        )}
        style={{
          ...gridStyles,
          ...(showGrid && gridBackground
            ? gridBackground
            : { backgroundImage: "none" }),
        }}
      >
        {items.length === 0 && isSubGrid && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
              Empty Grid
            </span>
          </div>
        )}
        {items.map((item, index) => (
          <PreviewItem
            key={item.id}
            item={item}
            index={index}
            draggable={dragMode}
            layout={item.layout[breakpoint]}
            selected={selectedItemId === item.id}
            onSelect={() => onSelect(item.id)}
            registerNode={(node) => {
              if (!node) {
                itemRefs.current.delete(item.id);
              } else {
                itemRefs.current.set(item.id, node);
              }
            }}
            breakpoint={breakpoint}
            showGrid={showGrid}
            dragMode={dragMode}
            mutateLayout={mutateLayout}
            selectedItemId={selectedItemId}
            onSelectId={onSelect}
          />
        ))}
        {indicator && (
          <div
            className="drop-indicator"
            style={{
              left: indicator.left,
              top: indicator.top,
              width: indicator.width,
              height: indicator.height,
            }}
          />
        )}
      </div>
    </DndContext>
  );
}

interface PreviewItemProps {
  item: GridItem;
  index: number;
  draggable: boolean;
  layout: ItemLayout;
  selected: boolean;
  onSelect: () => void;
  registerNode: (node: HTMLDivElement | null) => void;
  
  // Props for nested grid
  breakpoint: Breakpoint;
  showGrid: boolean;
  dragMode: boolean;
  mutateLayout: PreviewCanvasProps["mutateLayout"];
  selectedItemId: number | null;
  onSelectId: (id: number | null) => void;
}

function PreviewItem({
  item,
  index,
  draggable,
  layout,
  selected,
  onSelect,
  registerNode,
  breakpoint,
  showGrid,
  dragMode,
  mutateLayout,
  selectedItemId,
  onSelectId,
}: PreviewItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `item-${item.id}`,
      data: { type: "item", itemId: item.id },
      disabled: !draggable,
    });

  const style: CSSProperties = {
    gridColumnStart: isAuto(layout.colStart) ? "auto" : layout.colStart,
    gridColumnEnd: isAuto(layout.colEnd) ? "auto" : layout.colEnd,
    gridRowStart: isAuto(layout.rowStart) ? "auto" : layout.rowStart,
    gridRowEnd: isAuto(layout.rowEnd) ? "auto" : layout.rowEnd,
    gridColumn:
      isAuto(layout.colStart) && isAuto(layout.colEnd) && layout.colSpan > 1
        ? `span ${layout.colSpan}`
        : undefined,
    gridRow:
      isAuto(layout.rowStart) && isAuto(layout.rowEnd) && layout.rowSpan > 1
        ? `span ${layout.rowSpan}`
        : undefined,
    order: isAuto(layout.order) ? undefined : layout.order,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 50 : selected ? 40 : 10,
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // If we are interacting with a nested grid's item, stop propagation so parent doesn't drag
    // But wait, useDraggable attaches listeners.
    // If we click on a nested item, the nested draggable listener fires.
    // Does it bubble?
    // dnd-kit handles this.
    // However, for selection, we want to select this item.
    e.stopPropagation();
    onSelect();
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        registerNode(node);
      }}
      style={style}
      className={cn(
        "group relative rounded-lg transition-all duration-200",
        "border border-transparent",
        selected
          ? "ring-2 ring-indigo-500 shadow-lg z-40 bg-white dark:bg-slate-800"
          : "hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md bg-slate-100 dark:bg-slate-800/50",
        isDragging ? "opacity-50 scale-95 shadow-xl ring-2 ring-indigo-400 cursor-grabbing" : "",
        item.subGrid ? "p-0 overflow-hidden" : "p-3"
      )}
      {...attributes}
      {...listeners}
      onPointerDown={handlePointerDown} // Override listeners? No, listeners are attached to the element.
      // Actually, listeners include onPointerDown.
      // If I add my own onPointerDown, I might block dnd-kit?
      // dnd-kit listeners are spread.
      // If I want to handle selection, I should do it in onPointerDown but also call the original listener?
      // Or use onClick? Dragging might trigger click.
      // Let's use onClick for selection, but prevent it if dragged.
      // dnd-kit prevents click if dragged.
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {item.subGrid && item.children ? (
        <InteractiveGrid
          items={item.children}
          settings={item.subGrid[breakpoint]}
          breakpoint={breakpoint}
          showGrid={showGrid}
          dragMode={dragMode}
          mutateLayout={mutateLayout}
          selectedItemId={selectedItemId}
          onSelect={onSelectId}
          isSubGrid={true}
        />
      ) : (
        <>
          <div
            className={cn(
              "absolute inset-0 rounded-lg opacity-90 pointer-events-none transition-opacity group-hover:opacity-100",
              item.color
            )}
          />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-mono text-white/80 uppercase tracking-wider">
                {item.id}
              </span>
              {draggable && (
                <div className="p-1 rounded hover:bg-white/20 cursor-grab active:cursor-grabbing">
                  <Move className="w-3 h-3 text-white/90" />
                </div>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-xs font-medium text-white drop-shadow-sm">
                Item {index + 1}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Resize Handle */}
      {draggable && selected && !item.subGrid && (
        <ResizeHandle itemId={item.id} />
      )}
    </div>
  );
}

function ResizeHandle({ itemId }: { itemId: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `resize-${itemId}`,
    data: { type: "resize", itemId },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-center justify-center z-50",
        "opacity-0 group-hover:opacity-100 transition-opacity",
        isDragging && "opacity-100"
      )}
    >
      <div className="w-2 h-2 bg-indigo-500 rounded-sm" />
    </div>
  );
}

export function PreviewCanvas({
  items,
  breakpoint,
  settings,
  showGrid,
  dragMode,
  onToggleShowGrid,
  onToggleDragMode,
  mutateLayout,
  code,
  onCopyCode,
  selectedItemId,
  onSelect,
  useClassName,
  onToggleUseClassName,
}: PreviewCanvasProps) {
  const [showCodeView, setShowCodeView] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = useCallback(() => {
    if (copied) return;
    onCopyCode();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [copied, onCopyCode]);

  return (
    <Card className="border-0 shadow-xl shadow-indigo-500/5 ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden h-full flex flex-col">
      <CardHeader 
        className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-200">
          <Eye className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          Preview
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 px-3 py-1.5 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              <Switch
                checked={showGrid}
                onCheckedChange={onToggleShowGrid}
                disabled={showCodeView}
                className="data-[state=checked]:bg-indigo-500"
              />
              <Grid className="w-3.5 h-3.5" />
              Grid
            </label>
            <div className="w-px h-3 bg-slate-200 dark:bg-slate-800" />
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              <Switch
                checked={dragMode}
                onCheckedChange={onToggleDragMode}
                disabled={showCodeView}
                className="data-[state=checked]:bg-indigo-500"
              />
              <Move className="w-3.5 h-3.5" />
              Interactive
            </label>
          </div>
          
          <div className="flex gap-2 items-center">
            {showCodeView && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-200 transition-colors mr-2">
                <Switch
                  checked={useClassName}
                  onCheckedChange={onToggleUseClassName}
                  className="data-[state=checked]:bg-indigo-500 scale-75"
                />
                React (className)
              </label>
            )}
            <Button
              variant={showCodeView ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowCodeView((prev) => !prev)}
              className={cn(
                "h-8 text-xs font-medium",
                showCodeView ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              <Code className="w-3.5 h-3.5 mr-1.5" />
              {showCodeView ? "Canvas" : "Code"}
            </Button>
            <Button
              variant={copied ? "default" : "outline"}
              size="sm"
              onClick={handleCopyCode}
              className={cn(
                "h-8 text-xs font-medium transition-all duration-200",
                copied 
                  ? "bg-green-500 hover:bg-green-600 border-transparent text-white" 
                  : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
              )}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 relative bg-slate-50/50 dark:bg-slate-950/50">
        {showCodeView ? (
          <div className="absolute inset-0 p-6 overflow-auto">
            <div className="rounded-xl bg-slate-900 p-6 shadow-inner min-h-full">
              <pre className="font-mono text-sm text-indigo-200 leading-relaxed whitespace-pre-wrap">
                {code}
              </pre>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 p-6 overflow-auto">
            <div className="min-h-full flex flex-col">
              <InteractiveGrid
                items={items}
                settings={settings}
                breakpoint={breakpoint}
                showGrid={showGrid}
                dragMode={dragMode}
                mutateLayout={mutateLayout}
                selectedItemId={selectedItemId}
                onSelect={onSelect}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
