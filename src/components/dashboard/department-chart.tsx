import { ROSTER } from '@/data/employees'
import { hasLeft } from '@/data/offboarding'
import { DEMO_TODAY } from '@/lib/today'
import { ChartCard, BarChartSimple } from '@/components/charts'
import type { ChartConfig } from '@/components/ui/chart'

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
    <ChartCard
      title="Karyawan per Department"
      description={`Total ${total.toLocaleString('id-ID')} karyawan aktif`}
      className="h-full"
    >
      <BarChartSimple
        data={data}
        dataKey="value"
        categoryKey="dept"
        config={config}
        layout="horizontal"
        height={300}
      />
    </ChartCard>
  )
}
