// Which category (e.g. month) is under a click in an ECharts chart with one grid and a
// category x-axis. Works anywhere in the plot area, not just on the (tiny) data points.
// `chart` is the vue-echarts component, which exposes ECharts' pixel-conversion methods.

interface PixelChart {
  containPixel(finder: { gridIndex: number }, value: number[]): boolean
  convertFromPixel(finder: { gridIndex: number }, value: number[]): number | number[]
}

export function categoryIndexAt(chart: PixelChart | undefined | null, x: number, y: number): number | null {
  if (!chart || !chart.containPixel({ gridIndex: 0 }, [x, y])) return null
  const point = chart.convertFromPixel({ gridIndex: 0 }, [x, y])
  const index = Array.isArray(point) ? point[0] : point
  return index == null || Number.isNaN(index) ? null : Math.round(index)
}
