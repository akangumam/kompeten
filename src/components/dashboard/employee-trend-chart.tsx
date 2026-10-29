import { HEADCOUNT } from '@/data/headcount'
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartTooltip, type ChartConfig } from '@/components/ui/chart'

const Y2024 = HEADCOUNT[2024]
const Y2025 = HEADCOUNT[2025]
const Y2026 = HEADCOUNT[2026]
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const data = BULAN.map((bulan, i) => ({ bulan, y2024: Y2024[i], y2025: Y2025[i], y2026: Y2026[i] }))

const config = {
  y2024: { label: '2024', color: 'var(--chart-5)' },
  y2025: { label: '2025', color: 'var(--chart-2)' },
  y2026: { label: '2026', color: 'var(--chart-1)' },
} satisfies ChartConfig

function TrendTooltip({ active, payload }: { active?: boolean; payload?: { payload: (typeof data)[number] }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const selisih = d.y2026 == null || d.y2025 == null ? null : d.y2026 - d.y2025
  const rows = [
    { label: '2026', color: 'var(--chart-1)', value: d.y2026 == null ? '–' : String(d.y2026) },
    { label: '2025', color: 'var(--chart-2)', value: String(d.y2025 ?? "–") },
    { label: '2024', color: 'var(--chart-5)', value: String(d.y2024 ?? "–") },
  ]
  return (
    <div className="grid min-w-32 gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{d.bulan}</div>
      <div className="grid gap-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: r.color }} />
            <span className="text-muted-foreground">{r.label}</span>
            <span className="ml-auto font-medium text-foreground tabular-nums">{r.value}</span>
          </div>
        ))}
        {selisih != null && (
          <div className="flex items-center gap-2 border-t pt-1.5">
            <span className="text-muted-foreground">Selisih vs 2025</span>
            <span className="ml-auto font-medium text-foreground tabular-nums">
              {selisih >= 0 ? '+' : '−'}{Math.abs(selisih)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function TrendLegend() {
  const items = [
    { label: '2024', color: 'var(--chart-5)', width: 2, dash: '1 4', cap: 'round' as const },
    { label: '2025', color: 'var(--chart-2)', width: 2, dash: '4 4', cap: 'butt' as const },
    { label: '2026', color: 'var(--chart-1)', width: 2.5, dash: undefined, cap: 'butt' as const },
  ]
  return (
    <div className="flex items-center justify-center gap-6 pt-3 text-xs">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-2">
          <svg width="20" height="4" aria-hidden>
            <line x1="1" y1="2" x2="19" y2="2" stroke={it.color} strokeWidth={it.width} strokeDasharray={it.dash} strokeLinecap={it.cap} />
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  )
}

export function EmployeeTrendChart() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Tren Karyawan Aktif</CardTitle>
        <CardDescription>Perbandingan bulanan 2024, 2025, dan 2026</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
          <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="bulan" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: 'var(--muted-foreground)' }} />
            <YAxis
              domain={[190, 260]}
              ticks={[190, 200, 210, 220, 230, 240, 250, 260]}
              tickLine={false}
              axisLine={false}
              width={40}
              tick={{ fill: 'var(--muted-foreground)' }}
            />
            <ChartTooltip content={<TrendTooltip />} />
            <Area
              dataKey="y2026"
              type="monotone"
              stroke="none"
              fill="var(--chart-1)"
              fillOpacity={0.1}
              connectNulls={false}
              tooltipType="none"
              legendType="none"
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="y2024"
              type="monotone"
              stroke="var(--chart-5)"
              strokeWidth={2}
              strokeDasharray="1 4"
              strokeLinecap="round"
              dot={false}
            />
            <Line
              dataKey="y2025"
              type="monotone"
              stroke="var(--chart-2)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              dataKey="y2026"
              type="monotone"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--chart-1)' }}
              connectNulls={false}
            />
            <ChartLegend content={<TrendLegend />} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
