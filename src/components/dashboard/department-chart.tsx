import { ROSTER } from '@/data/employees'
import { hasLeft } from '@/data/offboarding'
import { DEMO_TODAY } from '@/lib/today'
import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

/** Jumlah pegawai aktif per department, dibaca dari roster (berubah mengikuti Mutasi yang sudah berlaku). */
function departmentCounts() {
  const map = new Map<string, number>()
  for (const e of ROSTER) if (e.tanggalMasuk <= DEMO_TODAY && !hasLeft(e.nik)) map.set(e.department, (map.get(e.department) ?? 0) + 1)
  return [...map.entries()].map(([dept, value]) => ({ dept, value })).sort((a, b) => b.value - a.value || a.dept.localeCompare(b.dept))
}

const config = { value: { label: 'Karyawan', color: 'var(--chart-1)' } } satisfies ChartConfig

export function DepartmentChart() {
  const data = departmentCounts()
  const total = data.reduce((a, d) => a + d.value, 0)
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Karyawan per Department</CardTitle>
        <CardDescription>Total {total.toLocaleString('id-ID')} karyawan aktif</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40 }} barCategoryGap={6}>
            <XAxis type="number" hide domain={[0, 'dataMax + 12']} />
            <YAxis
              type="category"
              dataKey="dept"
              width={140}
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />
            <ChartTooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltipContent hideLabel={false} />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              <LabelList
                dataKey="value"
                content={({ x, y, width, height, value }) => (
                  <text
                    x={Number(x) + Number(width) + 8}
                    y={Number(y) + Number(height) / 2}
                    dominantBaseline="middle"
                    className="fill-foreground text-sm tabular-nums"
                  >
                    {value}
                  </text>
                )}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
