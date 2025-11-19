import { useCallback, useEffect, useState } from "react";
import {
  BREAKPOINT_ORDER,
  COLORS,
  DEFAULT_GRID_SETTINGS,
} from "@/lib/constants";
import { TEMPLATE_FACTORIES } from "@/lib/templates";
import {
  cloneGridSettings,
  cloneLayoutMap,
  createLayoutMap,
  sanitizeLayoutMap,
} from "@/lib/grid";
import type {
  Breakpoint,
  GridItem,
  GridSetting,
  GridSettingsMap,
  ItemLayout,
} from "@/lib/types";

const parsePosition = (value: string) => {
  const num = Number(value);
  return Number.isNaN(num) ? Number.POSITIVE_INFINITY : num;
};

import { useHistory } from "./useHistory";

export function useGridState() {
  const {
    state: { items, gridSettings },
    set: setHistoryState,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<{ items: GridItem[]; gridSettings: GridSettingsMap }>({
    items: [],
    gridSettings: cloneGridSettings(DEFAULT_GRID_SETTINGS),
  });

  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>("xs");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [dragMode, setDragMode] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showNotification = useCallback((message: string) => {
    setToast(message);
  }, []);

  const reflowOrders = useCallback(
    (list: GridItem[], bp: Breakpoint): GridItem[] => {
      const sorted = [...list]
        .map((item, index) => {
          const layout = item.layout[bp];
          return {
            id: item.id,
            row: parsePosition(layout.rowStart),
            col: parsePosition(layout.colStart),
            index,
          };
        })
        .sort((a, b) =>
          a.row === b.row
            ? a.col === b.col
              ? a.index - b.index
              : a.col - b.col
            : a.row - b.row
        );

      const orderMap = new Map<number, number>();
      sorted.forEach((entry, idx) => orderMap.set(entry.id, idx + 1));

      return list.map((item) => {
        const layouts = { ...item.layout };
        const currentOrder = orderMap.get(item.id) ?? orderMap.size + 1;
        layouts[bp] = { ...layouts[bp], order: String(currentOrder) };
        return { ...item, layout: layouts };
      });
    },
    []
  );

  // Helper to update items while keeping settings
  const setItems = useCallback(
    (newItemsOrCb: GridItem[] | ((prev: GridItem[]) => GridItem[])) => {
      setHistoryState({
        items:
          typeof newItemsOrCb === "function"
            ? newItemsOrCb(items)
            : newItemsOrCb,
        gridSettings,
      });
    },
    [items, gridSettings, setHistoryState]
  );

  // Helper to update settings while keeping items
  const setGridSettings = useCallback(
    (
      newSettingsOrCb:
        | GridSettingsMap
        | ((prev: GridSettingsMap) => GridSettingsMap)
    ) => {
      setHistoryState({
        items,
        gridSettings:
          typeof newSettingsOrCb === "function"
            ? newSettingsOrCb(gridSettings)
            : newSettingsOrCb,
      });
    },
    [items, gridSettings, setHistoryState]
  );

  const mutateLayout = useCallback(
    (
      itemId: number,
      breakpoint: Breakpoint,
      cb: (layout: ItemLayout) => ItemLayout
    ) => {
      setItems((prev) =>
        reflowOrders(
          prev.map((item) => {
            if (item.id !== itemId) return item;
            const layouts = { ...item.layout };
            layouts[breakpoint] = cb({ ...layouts[breakpoint] });
            return { ...item, layout: layouts };
          }),
          breakpoint
        )
      );
    },
    [reflowOrders, setItems]
  );

  const updateItemLayout = useCallback(
    (itemId: number, field: keyof ItemLayout, value: string) => {
      mutateLayout(itemId, currentBreakpoint, (layout) => {
        if (field === "colSpan" || field === "rowSpan") {
          const parsed = Number(value);
          return {
            ...layout,
            [field]: Number.isNaN(parsed) || parsed < 1 ? 1 : parsed,
          };
        }

        const payload =
          value === "" || value === "auto" ? "auto" : (value as string);
        return { ...layout, [field]: payload };
      });
    },
    [currentBreakpoint, mutateLayout]
  );

  const addItem = useCallback(() => {
    setItems((prev) =>
      reflowOrders(
        [
          ...prev,
          {
            id: Date.now(),
            color: COLORS[prev.length % COLORS.length],
            layout: createLayoutMap(),
          },
        ],
        currentBreakpoint
      )
    );
  }, [currentBreakpoint, reflowOrders, setItems]);

  const clearItems = useCallback(() => {
    if (items.length === 0) return;
    if (window.confirm("Delete all items?")) {
      setItems([]);
      showNotification("Items cleared");
    }
  }, [items.length, showNotification, setItems]);

  const removeItem = useCallback((itemId: number) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, [setItems]);

  const duplicateItem = useCallback(
    (itemId: number) => {
      setItems((prev) => {
        const item = prev.find((entry) => entry.id === itemId);
        if (!item) return prev;
        return reflowOrders(
          [
            ...prev,
            {
              id: Date.now() + 1,
              color: COLORS[prev.length % COLORS.length],
              layout: cloneLayoutMap(item.layout),
            },
          ],
          currentBreakpoint
        );
      });
      showNotification("Item duplicated!");
    },
    [currentBreakpoint, reflowOrders, showNotification, setItems]
  );

  const updateGridSetting = useCallback(
    (key: keyof GridSetting, value: number) => {
      setGridSettings((prev) => ({
        ...prev,
        [currentBreakpoint]: {
          ...prev[currentBreakpoint],
          [key]: value,
        },
      }));
    },
    [currentBreakpoint, setGridSettings]
  );

  const handleCopyFromBreakpoint = useCallback(
    (direction: "prev" | "next") => {
      const currentIndex = BREAKPOINT_ORDER.indexOf(currentBreakpoint);
      const neighborIndex =
        direction === "prev" ? currentIndex - 1 : currentIndex + 1;

      if (neighborIndex < 0 || neighborIndex >= BREAKPOINT_ORDER.length) return;
      const neighbor = BREAKPOINT_ORDER[neighborIndex];

      setHistoryState({
        gridSettings: {
          ...gridSettings,
          [currentBreakpoint]: { ...gridSettings[neighbor] },
        },
        items: items.map((item) => ({
          ...item,
          layout: {
            ...item.layout,
            [currentBreakpoint]: { ...item.layout[neighbor] },
          },
        })),
      });
      showNotification(`Copied from ${neighbor.toUpperCase()}`);
    },
    [currentBreakpoint, showNotification, gridSettings, items, setHistoryState]
  );

  const applyTemplate = useCallback(
    (name: string) => {
      const factory = TEMPLATE_FACTORIES[name];
      if (!factory) return;
      const template = factory();
      
      const templateItems = template.items.map((item) => ({
        ...item,
        layout: cloneLayoutMap(item.layout),
      }));

      setHistoryState({
        gridSettings: cloneGridSettings(template.gridSettings),
        items: reflowOrders(templateItems, currentBreakpoint),
      });
      showNotification(`Template "${name}" applied!`);
    },
    [currentBreakpoint, reflowOrders, showNotification, setHistoryState]
  );

  const importPreset = useCallback(
    (jsonString: string) => {
      try {
        const preset = JSON.parse(jsonString);
        if (!preset.items || !preset.gridSettings) {
          throw new Error("Invalid preset");
        }
        
        const importedItems = (preset.items as GridItem[]).map(
          (item: GridItem, index: number) => ({
            id: item.id ?? Date.now() + index,
            color: item.color ?? COLORS[index % COLORS.length],
            layout: sanitizeLayoutMap(item.layout),
          })
        );

        setHistoryState({
          gridSettings: cloneGridSettings(preset.gridSettings as GridSettingsMap),
          items: reflowOrders(importedItems, currentBreakpoint),
        });
        showNotification("Preset imported!");
      } catch (error) {
        console.error(error);
        showNotification("❌ Error parsing configuration");
      }
    },
    [currentBreakpoint, reflowOrders, showNotification, setHistoryState]
  );

  // We don't need the useEffect for reflowOrders anymore because we do it on every mutation
  // But wait, if we change breakpoint, we might want to reflow?
  // Actually, reflowOrders is idempotent if nothing changed, but it might reorder items if they were overlapping?
  // The original code had:
  // useEffect(() => { setItems((prev) => reflowOrders(prev, currentBreakpoint)); }, [currentBreakpoint, reflowOrders]);
  // This runs on breakpoint change. It's probably good to keep it to ensure visual consistency.
  // BUT, if we do this, it will push a new history state every time we switch tabs! That's bad.
  // We should only reflow if necessary, or maybe just don't reflow on tab switch.
  // Let's remove it for now to avoid polluting history.



  return {
    items,
    gridSettings,
    currentBreakpoint,
    setCurrentBreakpoint,
    selectedItemId,
    setSelectedItemId,
    showGrid,
    setShowGrid,
    dragMode,
    setDragMode,
    toast,
    showNotification,
    mutateLayout,
    updateItemLayout,
    addItem,
    clearItems,
    removeItem,
    duplicateItem,
    updateGridSetting,
    handleCopyFromBreakpoint,
    applyTemplate,
    importPreset,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
