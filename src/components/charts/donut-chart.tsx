import { useMemo } from 'react'
import { Cell, Label, Pie, PieChart } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

type DataItem = { name: string; value: number }

type Props = {
  data: DataItem[]
  config: ChartConfig
  /** Label kecil di bawah angka total */
  centerLabel?: string
  height?: number
}

export function DonutChart({ data, config, centerLabel = 'Total', height = 240 }: Props) {
  const total = useMemo(() => data.reduce((a, b) => a + b.value, 0), [data])

  return (
    <ChartContainer config={config} style={{ height }}>
      <PieChart accessibilityLayer>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          strokeWidth={5}
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={`var(--color-${entry.name})`}
            />
          ))}
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !('cx' in viewBox)) return null
              return (
                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan
                    x={viewBox.cx}
                    y={viewBox.cy}
                    className="fill-foreground text-3xl font-bold"
                  >
                    {total.toLocaleString('id-ID')}
                  </tspan>
                  <tspan
                    x={viewBox.cx}
                    y={(viewBox.cy ?? 0) + 24}
                    className="fill-muted-foreground text-sm"
                  >
                    {centerLabel}
                  </tspan>
                </text>
              )
            }}
          />
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  )
}
