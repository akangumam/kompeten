import { Label, Pie, PieChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { fmtNum } from './shared'

/** Donut dengan teks di tengah (pola shadcn "Donut with Text") dan legend berangka di bawah. */
export function DonutChart({
  data, config, centerLabel, centerValue, valueFormatter, unit, size = 220, className,
}: {
  data: { key: string; value: number }[]
  config: ChartConfig
  /** Label kecil di bawah angka tengah, mis. "Karyawan". */
  centerLabel: string
  /** Angka tengah; default total. */
  centerValue?: string
  valueFormatter?: (n: number) => string
  unit?: string
  size?: number
  className?: string
}) {
  const fmt = valueFormatter ?? fmtNum
  const tipFmt = valueFormatter ?? (unit ? (n: number) => `${fmtNum(n)} ${unit}` : undefined)
  const total = data.reduce((a, d) => a + d.value, 0)
  const empty = total === 0
  const slices = empty ? [{ key: 'kosong', value: 1, fill: 'var(--muted)' }] : data.map((d) => ({ ...d, fill: `var(--color-${d.key})` }))
  const center = centerValue ?? fmt(total)
  const centerSize = center.length <= 6 ? 'text-3xl font-bold' : center.length <= 9 ? 'text-2xl font-bold' : 'text-sm font-semibold'
  return (
    <div className={className}>
      <ChartContainer config={config} className="mx-auto aspect-square" style={{ maxHeight: size }}>
        <PieChart accessibilityLayer>
          {!empty && <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" valueFormatter={tipFmt} />} />}
          <Pie data={slices} dataKey="value" nameKey="key" innerRadius={60} strokeWidth={5} isAnimationActive={false}>
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !('cx' in viewBox) || viewBox.cx == null || viewBox.cy == null) return null
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 4} className={`fill-foreground tabular-nums ${centerSize}`}>{center}</tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 18} className="fill-muted-foreground text-xs">{centerLabel}</tspan>
                  </text>
                )
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="mx-auto mt-4 grid max-w-sm gap-2 text-sm">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: config[d.key]?.color }} aria-hidden />
            <span className="text-muted-foreground">{config[d.key]?.label}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums">{fmt(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
