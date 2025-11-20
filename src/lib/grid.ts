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
    const setting = settings[bp]
    copy[bp] = {
      ...setting,
      colTracks: setting.colTracks?.map((t) => ({ ...t })) || [],
      rowTracks: setting.rowTracks?.map((t) => ({ ...t })) || [],
    }
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

const getTrackString = (tracks: { value: number; unit: string }[]) => {
  return tracks
    .map((t) => {
      if (
        t.unit === 'auto' ||
        t.unit === 'min-content' ||
        t.unit === 'max-content'
      )
        return t.unit
      return `${t.value}${t.unit}`
    })
    .join('_')
}

const isStandardTracks = (tracks: { value: number; unit: string }[]) => {
  return tracks.every((t) => t.unit === 'fr' && t.value === 1)
}

export const generateTailwindCode = (
  items: GridItem[],
  settings: GridSettingsMap,
  useClassName: boolean = false,
): string => {
  const classAttr = useClassName ? 'className' : 'class'
  


  // Let's rewrite the main function to be recursive-friendly.
  
  const generateGridContainer = (
    currentItems: GridItem[],
    currentSettings: GridSettingsMap,
    indent: number,
    isRoot: boolean
  ): string => {
    const spaces = ' '.repeat(indent)
    let code = ''
    
    if (isRoot) {
      code += `${spaces}<div ${classAttr}="grid`
    } else {
      code += `\n${spaces}<div ${classAttr}="grid w-full h-full`
    }

    let previousCols: string | null = null
    let previousGap: number | null = null
    let previousRows: string | null = null

    BREAKPOINT_ORDER.forEach((bp) => {
      const config = currentSettings[bp]
      const prefix = prefixMap[bp]

      // Columns
      let colsClass = ''
      if (config.colTracks && !isStandardTracks(config.colTracks)) {
        colsClass = `grid-cols-[${getTrackString(config.colTracks)}]`
      } else {
        colsClass = `grid-cols-${config.cols}`
      }

      if (previousCols === null || previousCols !== colsClass) {
        code += ` ${prefix}${colsClass}`
        previousCols = colsClass
      }

      // Gap
      if (previousGap === null || previousGap !== config.gap) {
        code += ` ${prefix}gap-${config.gap}`
        previousGap = config.gap
      }

      // Rows
      let rowsClass = ''
      if (config.rowTracks && !isStandardTracks(config.rowTracks)) {
        rowsClass = `grid-rows-[${getTrackString(config.rowTracks)}]`
      } else {
        rowsClass = `grid-rows-${config.rows}`
      }

      if (previousRows === null || previousRows !== rowsClass) {
        code += ` ${prefix}${rowsClass}`
        previousRows = rowsClass
      }
    })

    code += '">\n'

    currentItems.forEach((item, index) => {
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

      const itemIndent = spaces + '  '
      
      if (item.subGrid && item.children) {
        // Recursive call
        const subGridCode = generateGridContainer(item.children, item.subGrid, indent + 4, false)
        code += `${itemIndent}<div ${classAttr}="${classNames.join(' ').trim()}">`
        code += `${subGridCode}`
        code += `${itemIndent}</div>\n`
      } else {
        if (classNames.length === 0) {
          code += `${itemIndent}<div>\n${itemIndent}  <!-- Item ${index + 1} -->\n${itemIndent}</div>\n`
        } else {
          code += `${itemIndent}<div ${classAttr}="${classNames.join(' ').trim()}">\n${itemIndent}  <!-- Item ${
            index + 1
          } -->\n${itemIndent}</div>\n`
        }
      }
    })

    code += `${spaces}</div>`
    return code
  }

  return generateGridContainer(items, settings, 0, true)
}
