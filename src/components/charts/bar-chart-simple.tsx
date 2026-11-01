import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { barLabel, categoryAxisWidth, fmtNum, labelRoom } from './shared'

/**
 * Bar satu seri. `layout="vertical"` = kolom tegak (kategori di sumbu X); `layout="horizontal"` = batang mendatar
 * (kategori di sumbu Y, lebar sumbu menyesuaikan label terpanjang).
 */
export function BarChartSimple({
  data, dataKey, categoryKey, config, layout = 'vertical', height, valueFormatter, unit, labelFormatter, showLabels = true, activeCategory, className,
}: {
  data: readonly object[]
  dataKey: string
  categoryKey: string
  config: ChartConfig
  layout?: 'vertical' | 'horizontal'
  height?: number
  /** Format angka untuk label nilai dan tooltip. */
  valueFormatter?: (n: number) => string
  /** Satuan tooltip bila tidak memakai valueFormatter, mis. "orang". */
  unit?: string
  labelFormatter?: (label: unknown, payload: readonly unknown[]) => React.ReactNode
  showLabels?: boolean
  /** Kategori yang disorot; yang lain diredupkan. */
  activeCategory?: string
  className?: string
}) {
  const fmt = valueFormatter ?? fmtNum
  const tipFmt = valueFormatter ?? (unit ? (n: number) => `${fmtNum(n)} ${unit}` : undefined)
  const horizontal = layout === 'horizontal'
  const h = height ?? (horizontal ? data.length * 40 + 16 : 240)
  const bar = (
    <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={horizontal ? 5 : 8} maxBarSize={horizontal ? 32 : undefined} isAnimationActive={false}>
      {activeCategory != null && data.map((d, i) => (
        <Cell key={i} fillOpacity={(d as Record<string, unknown>)[categoryKey] === activeCategory ? 1 : 0.55} />
      ))}
      {showLabels && (
        <LabelList dataKey={dataKey} position={horizontal ? 'right' : 'top'} offset={horizontal ? 8 : 10} className="fill-foreground tabular-nums" fontSize={12} formatter={barLabel(fmt)} />
      )}
    </Bar>
  )
  const tooltip = (
    <ChartTooltip cursor={false} content={<ChartTooltipContent valueFormatter={tipFmt} labelFormatter={labelFormatter as never} />} />
  )
  return (
    <ChartContainer config={config} className={`aspect-auto w-full ${className ?? ''}`} style={{ height: h }}>
      {horizontal ? (
        <BarChart accessibilityLayer data={data as object[]} layout="vertical" margin={{ left: 0, right: showLabels ? labelRoom(data, [dataKey], fmt) : 8, top: 0, bottom: 0 }}>
          <XAxis type="number" hide domain={[(min: number) => Math.min(0, min), 'dataMax']} />
          <YAxis type="category" dataKey={categoryKey} tickLine={false} axisLine={false} tickMargin={10} interval={0} width={categoryAxisWidth(data, categoryKey)} />
          {tooltip}
          {bar}
        </BarChart>
      ) : (
        <BarChart accessibilityLayer data={data as object[]} margin={{ left: 0, right: 0, top: showLabels ? 24 : 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey={categoryKey} tickLine={false} axisLine={false} tickMargin={10} interval={0} />
          <YAxis hide domain={[(min: number) => Math.min(0, min), 'dataMax']} />
          {tooltip}
          {bar}
        </BarChart>
      )}
    </ChartContainer>
  )
}
