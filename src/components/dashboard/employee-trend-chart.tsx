import { HEADCOUNT } from '@/data/headcount'
import { ChartCard, LineChartCompare } from '@/components/charts'
import type { ChartConfig } from '@/components/ui/chart'

const Y2024 = HEADCOUNT[2024]
const Y2025 = HEADCOUNT[2025]
const Y2026 = HEADCOUNT[2026]
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const data = BULAN.map((bulan, i) => ({ bulan, y2024: Y2024[i], y2025: Y2025[i], y2026: Y2026[i] }))

const config = {
  y2026: { label: '2026', color: 'var(--chart-1)' },
  y2025: { label: '2025', color: 'var(--chart-2)' },
  y2024: { label: '2024', color: 'var(--chart-5)' },
} satisfies ChartConfig

const series = [
  { key: 'y2026', label: '2026' },
  { key: 'y2025', label: '2025', dashed: true },
  { key: 'y2024', label: '2024', dashed: true },
]

export function EmployeeTrendChart() {
  return (
    <ChartCard
      title="Tren Karyawan Aktif"
      description="Perbandingan bulanan 2024, 2025, dan 2026"
      className="h-full"
    >
      <LineChartCompare
        data={data}
        series={series}
        categoryKey="bulan"
        config={config}
        height={300}
      />
    </ChartCard>
  )
}
