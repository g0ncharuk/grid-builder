import type {
  Breakpoint,
  BreakpointDefinition,
  GridSettingsMap,
} from "./types";

export const BREAKPOINTS: BreakpointDefinition[] = [
  { value: "xs", label: "xs" },
  { value: "sm", label: "sm (640px+)" },
  { value: "md", label: "md (768px+)" },
  { value: "lg", label: "lg (1024px+)" },
  { value: "xl", label: "xl (1280px+)" },
  { value: "2xl", label: "2xl (1536px+)" },
];

export const BREAKPOINT_ORDER: Breakpoint[] = BREAKPOINTS.map((bp) => bp.value);

export const createTracks = (count: number) => 
  Array.from({ length: count }).map((_, i) => ({ 
    id: `track-${Date.now()}-${i}`, 
    value: 1, 
    unit: "fr" as const 
  }));

export const DEFAULT_GRID_SETTINGS: GridSettingsMap = {
  xs: { cols: 1, rows: 1, gap: 4, colTracks: createTracks(1), rowTracks: createTracks(1) },
  sm: { cols: 4, rows: 4, gap: 4, colTracks: createTracks(4), rowTracks: createTracks(4) },
  md: { cols: 4, rows: 4, gap: 4, colTracks: createTracks(4), rowTracks: createTracks(4) },
  lg: { cols: 4, rows: 4, gap: 4, colTracks: createTracks(4), rowTracks: createTracks(4) },
  xl: { cols: 4, rows: 4, gap: 4, colTracks: createTracks(4), rowTracks: createTracks(4) },
  "2xl": { cols: 4, rows: 4, gap: 4, colTracks: createTracks(4), rowTracks: createTracks(4) },
};

export const COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-green-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
];

export const GAP_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 8, 10];

export const CELL_BASE_SIZE = 70;
