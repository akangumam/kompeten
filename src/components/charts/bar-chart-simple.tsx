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
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

type Props = {
  data: Record<string, unknown>[]
  dataKey: string      // nilai
  categoryKey: string  // label sumbu
  config: ChartConfig
  layout?: 'vertical' | 'horizontal'
  /** tinggi container dalam px, default 240 */
  height?: number
  showLabels?: boolean
}

export function BarChartSimple({
  data,
  dataKey,
  categoryKey,
  config,
  layout = 'vertical',
  height = 240,
  showLabels = true,
}: Props) {
  const isHorizontal = layout === 'horizontal'

  // Lebar sumbu kategori otomatis dari panjang label terpanjang
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
        <Bar
          dataKey={dataKey}
          fill={`var(--color-${dataKey})`}
          radius={isHorizontal ? 5 : 8}
        >
          {showLabels && (
            <LabelList
              dataKey={dataKey}
              position={isHorizontal ? 'right' : 'top'}
              className="fill-foreground"
              fontSize={12}
              formatter={((v: any) => (v === 0 ? '' : v)) as any}
            />
          )}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
