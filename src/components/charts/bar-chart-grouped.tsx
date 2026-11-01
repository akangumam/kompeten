import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { barLabel, categoryAxisWidth, fmtNum, labelRoom, sortLegend } from './shared'

/** Bar dua seri berdampingan (mis. Standar vs Existing, Masuk vs Keluar) dengan legend. */
export function BarChartGrouped({
  data, keys, categoryKey, config, layout = 'vertical', height, valueFormatter, unit, labelFormatter, className,
}: {
  data: readonly object[]
  /** Dua kunci seri yang digambar. Urutan batang dan legend mengikuti urutan kunci di `config`. */
  keys: [string, string]
  categoryKey: string
  config: ChartConfig
  layout?: 'vertical' | 'horizontal'
  height?: number
  valueFormatter?: (n: number) => string
  unit?: string
  labelFormatter?: (label: unknown, payload: readonly unknown[]) => React.ReactNode
  className?: string
}) {
  const fmt = valueFormatter ?? fmtNum
  const tipFmt = valueFormatter ?? (unit ? (n: number) => `${fmtNum(n)} ${unit}` : undefined)
  const horizontal = layout === 'horizontal'
  const h = height ?? (horizontal ? data.length * 72 + 56 : 260)
  const order = Object.keys(config).filter((k) => keys.includes(k))
  const bars = order.map((k) => (
    <Bar key={k} dataKey={k} fill={`var(--color-${k})`} radius={horizontal ? 5 : 8} maxBarSize={horizontal ? 32 : undefined} isAnimationActive={false}>
      <LabelList dataKey={k} position={horizontal ? 'right' : 'top'} offset={horizontal ? 8 : 10} className="fill-foreground tabular-nums" fontSize={12} formatter={barLabel(fmt)} />
    </Bar>
  ))
  const tooltip = <ChartTooltip cursor={false} content={<ChartTooltipContent valueFormatter={tipFmt} labelFormatter={labelFormatter as never} />} />
  const legend = <ChartLegend content={(p) => <ChartLegendContent payload={sortLegend(p.payload, order)} verticalAlign={p.verticalAlign} />} />
  return (
    <ChartContainer config={config} className={`aspect-auto w-full ${className ?? ''}`} style={{ height: h }}>
      {horizontal ? (
        <BarChart accessibilityLayer data={data as object[]} layout="vertical" barGap={4} margin={{ left: 0, right: labelRoom(data, order, fmt), top: 0, bottom: 0 }}>
          <XAxis type="number" hide domain={[(min: number) => Math.min(0, min), 'dataMax']} />
          <YAxis type="category" dataKey={categoryKey} tickLine={false} axisLine={false} tickMargin={10} interval={0} width={categoryAxisWidth(data, categoryKey)} />
          {tooltip}
          {legend}
          {bars}
        </BarChart>
      ) : (
        <BarChart accessibilityLayer data={data as object[]} margin={{ left: 0, right: 0, top: 24, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey={categoryKey} tickLine={false} axisLine={false} tickMargin={10} interval={0} />
          <YAxis hide domain={[(min: number) => Math.min(0, min), 'dataMax']} />
          {tooltip}
          {legend}
          {bars}
        </BarChart>
      )}
    </ChartContainer>
  )
}
