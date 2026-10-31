import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

type SeriesDef = { key: string; label: string; dashed?: boolean }

type Props = {
  data: Record<string, unknown>[]
  series: SeriesDef[]
  categoryKey: string
  config: ChartConfig
  height?: number
  connectNulls?: boolean
}

export function LineChartCompare({
  data,
  series,
  categoryKey,
  config,
  height = 260,
  connectNulls = false,
}: Props) {
  return (
    <ChartContainer config={config} style={{ height }}>
      <LineChart data={data} accessibilityLayer margin={{ left: 8, right: 16, top: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey={categoryKey}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={35}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="natural"
            dataKey={s.key}
            stroke={`var(--color-${s.key})`}
            strokeWidth={2}
            strokeDasharray={s.dashed ? '4 4' : undefined}
            dot={{ r: 3 }}
            connectNulls={connectNulls}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
