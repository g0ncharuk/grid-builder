import type { CSSProperties } from 'react'
import type {
  Breakpoint,
  GridItem,
  GridSettingsMap,
  ItemLayout,
  LayoutMap,
} from '@/lib/types'
import { BREAKPOINT_ORDER, DEFAULT_GRID_SETTINGS } from '@/lib/constants'

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const isAuto = (value: string) => value === '' || value === 'auto'

export const createEmptyLayout = (): ItemLayout => ({
  colStart: 'auto',
  colEnd: 'auto',
  rowStart: 'auto',
  rowEnd: 'auto',
  colSpan: 1,
  rowSpan: 1,
  order: 'auto',
})

export const createLayoutMap = (): LayoutMap => {
  const map = {} as LayoutMap
  BREAKPOINT_ORDER.forEach((bp) => {
    map[bp] = createEmptyLayout()
  })
  return map
}

export const cloneLayoutMap = (layout: LayoutMap): LayoutMap => {
  const cloned = {} as LayoutMap
  BREAKPOINT_ORDER.forEach((bp) => {
    cloned[bp] = { ...layout[bp] }
  })
  return cloned
}

export const sanitizeLayoutMap = (
  layout?: Partial<Record<Breakpoint, Partial<ItemLayout>>>,
): LayoutMap => {
  const sanitized = createLayoutMap()
  if (!layout) return sanitized
  BREAKPOINT_ORDER.forEach((bp) => {
    if (layout[bp]) {
      sanitized[bp] = {
        ...sanitized[bp],
        ...layout[bp],
      }
    }
  })
  return sanitized
}

export const cloneGridSettings = (
  settings: GridSettingsMap = DEFAULT_GRID_SETTINGS,
): GridSettingsMap => {
  const copy = {} as GridSettingsMap
  BREAKPOINT_ORDER.forEach((bp) => {
    copy[bp] = { ...settings[bp] }
  })
  return copy
}

export const buildGridStyles = (layout: ItemLayout): CSSProperties => {
  const styles: CSSProperties = {}

  if (!isAuto(layout.colStart)) styles.gridColumnStart = layout.colStart
  if (!isAuto(layout.colEnd)) styles.gridColumnEnd = layout.colEnd
  if (!isAuto(layout.rowStart)) styles.gridRowStart = layout.rowStart
  if (!isAuto(layout.rowEnd)) styles.gridRowEnd = layout.rowEnd

  if (isAuto(layout.colStart) && isAuto(layout.colEnd) && layout.colSpan > 1) {
    styles.gridColumn = `span ${layout.colSpan}`
  }

  if (isAuto(layout.rowStart) && isAuto(layout.rowEnd) && layout.rowSpan > 1) {
    styles.gridRow = `span ${layout.rowSpan}`
  }

  if (!isAuto(layout.order)) {
    const parsed = Number(layout.order)
    styles.order = Number.isNaN(parsed) ? layout.order : parsed
  }

  return styles
}

export const getSpan = (layout: ItemLayout, axis: 'col' | 'row'): number => {
  const start = axis === 'col' ? layout.colStart : layout.rowStart
  const end = axis === 'col' ? layout.colEnd : layout.rowEnd

  if (!isAuto(start) && !isAuto(end)) {
    const span = Number(end) - Number(start)
    return Number.isNaN(span) || span < 1 ? 1 : span
  }

  return axis === 'col' ? layout.colSpan : layout.rowSpan
}

const prefixMap: Record<Breakpoint, string> = {
  xs: '',
  sm: 'sm:',
  md: 'md:',
  lg: 'lg:',
  xl: 'xl:',
  '2xl': '2xl:',
}

export const generateTailwindCode = (
  items: GridItem[],
  settings: GridSettingsMap,
): string => {
  if (items.length === 0) return '<div class="grid"></div>'

  let code = '<div class="grid'
  let previousCols: number | null = null
  let previousGap: number | null = null
  let previousRows: number | null = null

  BREAKPOINT_ORDER.forEach((bp) => {
    const config = settings[bp]
    const prefix = prefixMap[bp]

    if (previousCols === null || previousCols !== config.cols) {
      code += ` ${prefix}grid-cols-${config.cols}`
      previousCols = config.cols
    }

    if (previousGap === null || previousGap !== config.gap) {
      code += ` ${prefix}gap-${config.gap}`
      previousGap = config.gap
    }

    if (previousRows === null || previousRows !== config.rows) {
      code += ` ${prefix}grid-rows-${config.rows}`
      previousRows = config.rows
    }
  })

  code += '">\n'

  items.forEach((item, index) => {
    const classNames: string[] = []

    BREAKPOINT_ORDER.forEach((bp) => {
      const layout = item.layout[bp]
      const prefix = prefixMap[bp]

      if (!isAuto(layout.colStart))
        classNames.push(`${prefix}col-start-${layout.colStart}`)
      if (!isAuto(layout.colEnd))
        classNames.push(`${prefix}col-end-${layout.colEnd}`)
      if (!isAuto(layout.rowStart))
        classNames.push(`${prefix}row-start-${layout.rowStart}`)
      if (!isAuto(layout.rowEnd))
        classNames.push(`${prefix}row-end-${layout.rowEnd}`)

      if (isAuto(layout.colStart) && isAuto(layout.colEnd) && layout.colSpan > 1)
        classNames.push(`${prefix}col-span-${layout.colSpan}`)

      if (isAuto(layout.rowStart) && isAuto(layout.rowEnd) && layout.rowSpan > 1)
        classNames.push(`${prefix}row-span-${layout.rowSpan}`)

      if (!isAuto(layout.order))
        classNames.push(`${prefix}order-${layout.order}`)
    })

    if (classNames.length === 0) {
      code += `  <div>\n    <!-- Item ${index + 1} -->\n  </div>\n`
    } else {
      code += `  <div class="${classNames.join(' ').trim()}">\n    <!-- Item ${
        index + 1
      } -->\n  </div>\n`
    }
  })

  code += '</div>'
  return code
}
