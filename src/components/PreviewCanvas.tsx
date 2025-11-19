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
import { CSS } from "@dnd-kit/utilities";
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
}

interface GridMetrics {
  cellWidth: number;
  cellHeight: number;
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
}: PreviewCanvasProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [indicator, setIndicator] = useState<DragIndicator | null>(null);
  const [showCodeView, setShowCodeView] = useState(false);
  const [copied, setCopied] = useState(false);
  const [gridBackground, setGridBackground] = useState<CSSProperties | null>(
    null
  );
  const dragSession = useRef<DragSession | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 2 } })
  );

  const gapRem = useMemo(() => settings.gap * 0.25, [settings.gap]);

  const gridStyles = useMemo(() => {
    const gap = `${gapRem}rem`;

    return {
      gridTemplateColumns: `repeat(${settings.cols}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${settings.rows}, minmax(${CELL_BASE_SIZE}px, 1fr))`,
      gridAutoRows: `minmax(${CELL_BASE_SIZE}px, 1fr)`,
      gap,
      minHeight: `${
        settings.rows * CELL_BASE_SIZE +
        gapRem * 16 * Math.max(settings.rows - 1, 0)
      }px`,
    };
  }, [gapRem, settings.cols, settings.rows]);

  const getMetrics = useCallback((): GridMetrics | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const gapPx = gapRem * 16;
    const width = Math.max(rect.width - gapPx * (settings.cols - 1), 0);
    const height = Math.max(rect.height - gapPx * (settings.rows - 1), 0);

    return {
      cellWidth: width / settings.cols,
      cellHeight: height / settings.rows,
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
      const sizeX = metrics.cellWidth + metrics.gapPx;
      const sizeY = metrics.cellHeight + metrics.gapPx;
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

      const layout = items.find((item) => item.id === data.itemId)?.layout[
        breakpoint
      ];
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
      const unitX = metrics.cellWidth + metrics.gapPx;
      const unitY = metrics.cellHeight + metrics.gapPx;

      if (session.mode === "move") {
        const colDelta = Math.round(event.delta.x / unitX);
        const rowDelta = Math.round(event.delta.y / unitY);
        const colStart = clamp(
          session.startCol + colDelta,
          1,
          Math.max(1, settings.cols - session.baseColSpan + 1)
        );
        const rowStart = clamp(
          session.startRow + rowDelta,
          1,
          Math.max(1, settings.rows - session.baseRowSpan + 1)
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
          metrics.cellWidth,
          metrics.gapPx,
          settings.cols
        );
        const rowSpan = spanFromSize(
          height,
          metrics.cellHeight,
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

      const unitX = metrics.cellWidth + metrics.gapPx;
      const unitY = metrics.cellHeight + metrics.gapPx;

      if (session.mode === "move") {
        const colDelta = Math.round(event.delta.x / unitX);
        const rowDelta = Math.round(event.delta.y / unitY);
        const colStart = clamp(
          session.startCol + colDelta,
          1,
          Math.max(1, settings.cols - session.baseColSpan + 1)
        );
        const rowStart = clamp(
          session.startRow + rowDelta,
          1,
          Math.max(1, settings.rows - session.baseRowSpan + 1)
        );
        setItemsForMove(session, { colStart, rowStart }, mutateLayout);
      } else {
        const width = Math.max(16, session.startWidth + event.delta.x);
        const height = Math.max(16, session.startHeight + event.delta.y);
        const colSpan = spanFromSize(
          width,
          metrics.cellWidth,
          metrics.gapPx,
          settings.cols
        );
        const rowSpan = spanFromSize(
          height,
          metrics.cellHeight,
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

  const handleCopy = useCallback(() => {
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
          
          <div className="flex gap-2">
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
              onClick={handleCopy}
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
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="absolute inset-0 p-6 overflow-auto">
              <div className="min-h-full flex flex-col">
                <div
                  ref={gridRef}
                  className={cn(
                    "relative grid transition-colors rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm",
                    dragMode
                      ? "cursor-grab active:cursor-grabbing"
                      : "cursor-default"
                  )}
                  style={{
                    ...gridStyles,
                    ...(showGrid && gridBackground
                      ? gridBackground
                      : { backgroundImage: "none" }),
                  }}
                >
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
              </div>
            </div>
          </DndContext>
        )}
      </CardContent>
    </Card>
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
}

function PreviewItem({
  item,
  index,
  draggable,
  layout,
  selected,
  onSelect,
  registerNode,
}: PreviewItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `item-${item.id}`,
      data: { type: "item", itemId: item.id },
      disabled: !draggable,
    });

  const {
    attributes: resizeAttrs,
    listeners: resizeListeners,
    setNodeRef: setResizeRef,
    isDragging: isResizing,
  } = useDraggable({
    id: `resize-${item.id}`,
    data: { type: "resize", itemId: item.id },
    disabled: !draggable,
  });

  const style: React.CSSProperties = {
    gridColumnStart: layout.colStart,
    gridColumnEnd: layout.colEnd,
    gridRowStart: layout.rowStart,
    gridRowEnd: layout.rowEnd,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging || isResizing ? 50 : 1,
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        registerNode(node);
      }}
      style={style}
      className={cn(
        "preview-item group relative flex items-center justify-center rounded-lg border p-2 text-sm font-medium shadow-sm transition-all",
        // Default styles if no color (fallback)
        !item.color && "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700",
        // Colored styles
        item.color && [
          item.color,
          "text-white border-transparent",
          "shadow-md"
        ],
        draggable ? "cursor-grab active:cursor-grabbing" : "",
        isDragging && "dragging z-50 opacity-80 shadow-xl scale-105 ring-2 ring-white",
        selected && !isDragging && "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 ring-indigo-500 z-10",
        !isDragging && !selected && "hover:scale-[1.02] hover:shadow-lg hover:brightness-110"
      )}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <span className="pointer-events-none select-none">
        {index + 1}
      </span>

      {draggable && (
        <div
          ref={setResizeRef}
          className={cn(
            "resize-handle absolute bottom-0 right-0 h-6 w-6 cursor-se-resize rounded-tl-lg opacity-0 transition-opacity group-hover:opacity-100",
            selected && "opacity-100"
          )}
          {...resizeListeners}
          {...resizeAttrs}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}

const positionFromRect = (
  rect: { left: number; top: number; width: number; height: number },
  metrics: GridMetrics,
  colSpan: number,
  rowSpan: number,
  totalCols: number,
  totalRows: number
) => {
  const unitX = metrics.cellWidth + metrics.gapPx;
  const unitY = metrics.cellHeight + metrics.gapPx;
  const relativeX = rect.left - metrics.gridRect.left;
  const relativeY = rect.top - metrics.gridRect.top;
  const maxCol = Math.max(1, totalCols - colSpan + 1);
  const maxRow = Math.max(1, totalRows - rowSpan + 1);

  const colStart = clamp(
    Math.floor((relativeX + metrics.gapPx * 0.5) / unitX) + 1,
    1,
    maxCol
  );
  const rowStart = clamp(
    Math.floor((relativeY + metrics.gapPx * 0.5) / unitY) + 1,
    1,
    maxRow
  );

  return { colStart, rowStart };
};

const spanFromSize = (
  size: number,
  cell: number,
  gap: number,
  maxSpan: number
) => clamp(Math.max(1, Math.round((size + gap) / (cell + gap))), 1, maxSpan);

const indicatorFrom = (
  colStart: number,
  rowStart: number,
  colSpan: number,
  rowSpan: number,
  metrics: { cellWidth: number; cellHeight: number; gapPx: number }
): DragIndicator => {
  const colUnit = metrics.cellWidth + metrics.gapPx;
  const rowUnit = metrics.cellHeight + metrics.gapPx;
  return {
    left: (colStart - 1) * colUnit,
    top: (rowStart - 1) * rowUnit,
    width:
      metrics.cellWidth * colSpan + metrics.gapPx * Math.max(colSpan - 1, 0),
    height:
      metrics.cellHeight * rowSpan + metrics.gapPx * Math.max(rowSpan - 1, 0),
  };
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
