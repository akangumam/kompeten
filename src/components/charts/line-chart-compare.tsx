import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { fmtNum, niceDomain, sortLegend, type ChartRow } from './shared'

export type LineSeries = {
  key: string
  /** Garis putus-putus (pembanding). */
  dashed?: boolean
  /** Titik data pada garis. */
  dots?: boolean
  /** Area tipis di bawah garis (fillOpacity 0.1). */
  area?: boolean
}

/** Garis berjalan (solid, chart-1) dibanding garis pembanding (putus-putus). Domain Y dibulatkan ke kelipatan rapi. */
export function LineChartCompare({
  data, categoryKey, series, config, height = 280, valueFormatter, yTickFormatter, labelFormatter, className,
}: {
  data: readonly object[]
  categoryKey: string
  series: LineSeries[]
  config: ChartConfig
  height?: number
  valueFormatter?: (n: number) => string
  yTickFormatter?: (n: number) => string
  labelFormatter?: (label: unknown, payload: readonly unknown[]) => React.ReactNode
  className?: string
}) {
  const { domain, ticks } = niceDomain(data.flatMap((row) => series.map((s) => (row as ChartRow)[s.key] as number | null | undefined)))
  return (
    <ChartContainer config={config} className={`aspect-auto w-full ${className ?? ''}`} style={{ height }}>
      <ComposedChart accessibilityLayer data={data as object[]} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={categoryKey} tickLine={false} axisLine={false} tickMargin={10} />
        <YAxis domain={domain} ticks={ticks} tickLine={false} axisLine={false} tickMargin={8} width={yTickFormatter ? 52 : 40} tickFormatter={yTickFormatter ?? fmtNum} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" valueFormatter={valueFormatter} labelFormatter={labelFormatter as never} />} />
        <ChartLegend content={(p) => <ChartLegendContent payload={sortLegend(p.payload, Object.keys(config))} verticalAlign={p.verticalAlign} />} />
        {series.filter((s) => s.area).map((s) => (
          <Area key={`${s.key}-area`} dataKey={s.key} type="monotone" stroke="none" fill={`var(--color-${s.key})`} fillOpacity={0.1} connectNulls={false} tooltipType="none" legendType="none" activeDot={false} isAnimationActive={false} />
        ))}
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            type="monotone"
            stroke={`var(--color-${s.key})`}
            strokeWidth={2}
            strokeDasharray={s.dashed ? '4 4' : undefined}
            dot={s.dots ? { r: 3, fill: `var(--color-${s.key})` } : false}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </ComposedChart>
    </ChartContainer>
  )
}
