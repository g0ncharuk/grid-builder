export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface ItemLayout {
  colStart: string;
  colEnd: string;
  rowStart: string;
  rowEnd: string;
  colSpan: number;
  rowSpan: number;
  order: string;
}

export type LayoutMap = Record<Breakpoint, ItemLayout>;

export interface GridItem {
  id: number;
  color: string;
  layout: LayoutMap;
}

export interface GridSetting {
  cols: number;
  rows: number;
  gap: number;
}

export type GridSettingsMap = Record<Breakpoint, GridSetting>;

export interface BreakpointDefinition {
  value: Breakpoint;
  label: string;
}

export interface DragIndicator {
  left: number;
  top: number;
  width: number;
  height: number;
}
