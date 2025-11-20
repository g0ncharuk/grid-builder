import { COLORS, DEFAULT_GRID_SETTINGS, createTracks } from './constants'
import {
  cloneGridSettings,
  cloneLayoutMap,
  createLayoutMap,
} from './grid'
import type { GridItem, GridSettingsMap, LayoutMap } from './types'

const uniqueId = () => Number(Date.now() + Math.floor(Math.random() * 1000))

const withItems = (configs: { color: string; layout: LayoutMap }[]) =>
  configs.map(({ color, layout }) => ({
    id: uniqueId(),
    color,
    layout: cloneLayoutMap(layout),
  }))

type TemplateFactory = () => {
  gridSettings: GridSettingsMap
  items: GridItem[]
}

export const TEMPLATE_FACTORIES: Record<string, TemplateFactory> = {
  hero: () => ({
    gridSettings: {
      xs: { cols: 1, rows: 2, gap: 4, colTracks: createTracks(1), rowTracks: createTracks(2) },
      sm: { cols: 1, rows: 2, gap: 4, colTracks: createTracks(1), rowTracks: createTracks(2) },
      md: { cols: 2, rows: 2, gap: 6, colTracks: createTracks(2), rowTracks: createTracks(2) },
      lg: { cols: 2, rows: 2, gap: 6, colTracks: createTracks(2), rowTracks: createTracks(2) },
      xl: { cols: 2, rows: 2, gap: 6, colTracks: createTracks(2), rowTracks: createTracks(2) },
      '2xl': { cols: 2, rows: 2, gap: 8, colTracks: createTracks(2), rowTracks: createTracks(2) },
    },
    items: withItems([
      // ... items ...
    ]),
  }),
  sidebar: () => ({
    gridSettings: {
      xs: { cols: 1, rows: 3, gap: 4, colTracks: createTracks(1), rowTracks: createTracks(3) },
      sm: { cols: 1, rows: 3, gap: 4, colTracks: createTracks(1), rowTracks: createTracks(3) },
      md: { cols: 4, rows: 3, gap: 4, colTracks: createTracks(4), rowTracks: createTracks(3) },
      lg: { cols: 4, rows: 3, gap: 6, colTracks: createTracks(4), rowTracks: createTracks(3) },
      xl: { cols: 4, rows: 3, gap: 6, colTracks: createTracks(4), rowTracks: createTracks(3) },
      '2xl': { cols: 4, rows: 3, gap: 6, colTracks: createTracks(4), rowTracks: createTracks(3) },
    },
    items: withItems([
      // ... items ...
    ]),
  }),
  cards: () => ({
    gridSettings: {
      xs: { cols: 1, rows: 4, gap: 4, colTracks: createTracks(1), rowTracks: createTracks(4) },
      sm: { cols: 2, rows: 4, gap: 4, colTracks: createTracks(2), rowTracks: createTracks(4) },
      md: { cols: 3, rows: 4, gap: 4, colTracks: createTracks(3), rowTracks: createTracks(4) },
      lg: { cols: 4, rows: 4, gap: 6, colTracks: createTracks(4), rowTracks: createTracks(4) },
      xl: { cols: 4, rows: 4, gap: 6, colTracks: createTracks(4), rowTracks: createTracks(4) },
      '2xl': { cols: 4, rows: 4, gap: 6, colTracks: createTracks(4), rowTracks: createTracks(4) },
    },
    items: Array.from({ length: 8 }).map((_, index) => ({
      id: uniqueId(),
      color: COLORS[index % COLORS.length],
      layout: createLayoutMap(),
    })),
  }),
  masonry: () => ({
    gridSettings: {
      xs: { cols: 2, rows: 6, gap: 4, colTracks: createTracks(2), rowTracks: createTracks(6) },
      sm: { cols: 3, rows: 6, gap: 4, colTracks: createTracks(3), rowTracks: createTracks(6) },
      md: { cols: 4, rows: 6, gap: 4, colTracks: createTracks(4), rowTracks: createTracks(6) },
      lg: { cols: 4, rows: 6, gap: 6, colTracks: createTracks(4), rowTracks: createTracks(6) },
      xl: { cols: 4, rows: 6, gap: 6, colTracks: createTracks(4), rowTracks: createTracks(6) },
      '2xl': { cols: 4, rows: 6, gap: 6, colTracks: createTracks(4), rowTracks: createTracks(6) },
    },
    items: withItems([
      // ... items ...
    ]),
  }),
}

export const createEmptyTemplate = (): {
  gridSettings: GridSettingsMap
  items: GridItem[]
} => ({
  gridSettings: cloneGridSettings(DEFAULT_GRID_SETTINGS),
  items: [],
})
