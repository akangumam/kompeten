import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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

type SeriesDef = { key: string; label: string }

type Props = {
  data: Record<string, unknown>[]
  series: [SeriesDef, SeriesDef] | SeriesDef[]
  categoryKey: string
  config: ChartConfig
  layout?: 'vertical' | 'horizontal'
  height?: number
  showLabels?: boolean
}

export function BarChartGrouped({
  data,
  series,
  categoryKey,
  config,
  layout = 'vertical',
  height = 280,
  showLabels = true,
}: Props) {
  const isHorizontal = layout === 'horizontal'
  const maxLabelLen = data.length > 0 ? Math.max(...data.map((d) => String(d[categoryKey] ?? '').length)) : 10
  const yAxisWidth = Math.min(Math.max(maxLabelLen * 6.5, 60), 160)

  return (
    <ChartContainer config={config} style={{ height }}>
      <BarChart
        data={data}
        layout={isHorizontal ? 'vertical' : 'horizontal'}
        accessibilityLayer
        margin={isHorizontal ? { left: 4, right: 40 } : { top: 20, right: 16 }}
      >
        <CartesianGrid
          vertical={isHorizontal}
          horizontal={!isHorizontal}
          stroke="var(--border)"
        />
        {isHorizontal ? (
          <>
            <YAxis
              dataKey={categoryKey}
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={yAxisWidth}
            />
            <XAxis type="number" hide />
          </>
        ) : (
          <>
            <XAxis
              dataKey={categoryKey}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <YAxis hide />
          </>
        )}
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            fill={`var(--color-${s.key})`}
            radius={isHorizontal ? 5 : 8}
          >
            {showLabels && (
              <LabelList
                dataKey={s.key}
                position={isHorizontal ? 'right' : 'top'}
                className="fill-foreground"
                fontSize={12}
                formatter={((v: any) => (v === 0 ? '' : v)) as any}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ChartContainer>
  )
}
