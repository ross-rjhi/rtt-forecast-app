import { onBeforeUnmount, onMounted, ref } from 'vue'

export interface ChartTheme {
  page: string // what the chart sits on (cards are transparent)
  surface: string // tooltips
  ink: string
  secondary: string
  muted: string
  line: string
  axis: string
  series: string
  good: string // e.g. SPC improvement
  bad: string // e.g. SPC concern
  bands: [string, string, string] // waiting-time bands, shortest wait first
  font: string
  // Multiply chart font sizes by this: ECharts sizes are in px, so they don't follow the page's
  // 90% root font size on their own. e.g. fontSize: 12 * fontScale
  fontScale: number
}

function readTheme(): ChartTheme {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(`--color-${name}`).trim()
  return {
    page: v('page'),
    surface: v('surface'),
    ink: v('ink'),
    secondary: v('ink-secondary'),
    muted: v('ink-muted'),
    line: v('line'),
    axis: v('axis'),
    series: v('series-1'),
    good: v('good'),
    bad: v('bad'),
    bands: [v('band-1'), v('band-2'), v('band-3')],
    font: getComputedStyle(document.body).fontFamily,
    fontScale: parseFloat(getComputedStyle(document.documentElement).fontSize) / 16,
  }
}

/**
 * Colours and font for ECharts, read from the CSS tokens in main.css so charts match the
 * rest of the page. Re-read when light/dark mode changes, and once the web font (Figtree)
 * has loaded, because ECharts measures text when it lays out labels.
 */
export function useChartTheme() {
  const theme = ref(readTheme())
  const refresh = () => (theme.value = readTheme())

  const scheme = window.matchMedia('(prefers-color-scheme: dark)')
  onMounted(() => {
    scheme.addEventListener('change', refresh)
    document.fonts?.ready.then(refresh)
  })
  onBeforeUnmount(() => scheme.removeEventListener('change', refresh))

  return theme
}
