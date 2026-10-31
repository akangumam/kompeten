import { useMemo } from 'react'
import { ChartCard, BarChartSimple, DonutChart } from '@/components/charts'
import type { ChartConfig } from '@/components/ui/chart'
import { ROSTER } from '@/data/employees'
import { rosterForm } from '@/data/profiles'
import { TENURE_TIERS, AGE_TIERS } from '@/data/master/tier-ranges'
import { DEMO_TODAY } from '@/lib/today'
import type { CurrentUser } from '@/data/users'
import { useMaster } from '@/data/master/store'

type Props = {
  user: CurrentUser
  dept: string
}

function getAge(birthDate: string, today = DEMO_TODAY) {
  const b = new Date(birthDate)
  const t = new Date(today)
  let age = t.getFullYear() - b.getFullYear()
  const m = t.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--
  return age
}

function getTenureYears(joinDate: string, today = DEMO_TODAY) {
  const j = new Date(joinDate)
  const t = new Date(today)
  let years = t.getFullYear() - j.getFullYear()
  const m = t.getMonth() - j.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < j.getDate())) years--
  return Math.max(0, years)
}

const genderConfig = {
  'Laki-laki': { label: 'Laki-laki', color: 'var(--chart-1)' },
  Perempuan: { label: 'Perempuan', color: 'var(--chart-2)' },
} satisfies ChartConfig

const jenisConfig = {
  count: { label: 'Jumlah', color: 'var(--chart-1)' },
} satisfies ChartConfig

const statusKerjaConfig = {
  count: { label: 'Jumlah', color: 'var(--chart-2)' },
} satisfies ChartConfig

const groupKerjaConfig = {
  count: { label: 'Jumlah', color: 'var(--chart-3)' },
} satisfies ChartConfig

const pendidikanConfig = {
  count: { label: 'Jumlah', color: 'var(--chart-4)' },
} satisfies ChartConfig

const tenureConfig = {
  count: { label: 'Masa Kerja', color: 'var(--chart-1)' },
} satisfies ChartConfig

const ageConfig = {
  count: { label: 'Usia', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function DemografiSection({ user, dept }: Props) {
  useMaster()

  // Scope filter: Hendra (supervisor) hanya timnya (Injection), user lain sesuai filter dept
  const scopedEmployees = useMemo(() => {
    return ROSTER.filter((e) => {
      if (user.role === 'supervisor') {
        // Hendra supervisor di Produksi / Injection
        return e.department === 'Produksi' && e.section === 'Injection'
      }
      if (dept !== 'Semua Department' && e.department !== dept) {
        return false
      }
      return true
    })
  }, [user, dept])

  const totalEmployees = scopedEmployees.length

  // Profile data per employee
  const profiles = useMemo(() => {
    return scopedEmployees.map((e) => ({
      employee: e,
      form: rosterForm(e),
      age: getAge(rosterForm(e).tanggalLahir),
      tenure: getTenureYears(e.tanggalMasuk),
    }))
  }, [scopedEmployees])

  // 1. Gender (Donut)
  const genderChartData = useMemo(() => {
    let lk = 0
    let pr = 0
    profiles.forEach((p) => {
      if (p.form.gender === 'Perempuan') pr++
      else lk++
    })
    return [
      { name: 'Laki-laki', value: lk },
      { name: 'Perempuan', value: pr },
    ]
  }, [profiles])

  // 2. Jenis Karyawan (Bar)
  const jenisData = useMemo(() => {
    const counts: Record<string, number> = {
      Organik: 0,
      Harian: 0,
      Outsourcing: 0,
      Magang: 0,
    }
    profiles.forEach((p) => {
      const j = p.form.jenis || 'Organik'
      if (j.startsWith('Harian')) counts.Harian++
      else if (counts[j] !== undefined) counts[j]++
      else counts.Organik++
    })
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
  }, [profiles])

  // 3. Status Kerja (Bar)
  const statusKerjaData = useMemo(() => {
    let tetap = 0
    let kontrak = 0
    profiles.forEach((p) => {
      if (p.form.statusKerja === 'Tetap') tetap++
      else kontrak++
    })
    return [
      { name: 'Tetap', count: tetap },
      { name: 'Kontrak', count: kontrak },
    ]
  }, [profiles])

  // 4. Group Kerja (Bar)
  const groupKerjaData = useMemo(() => {
    const counts: Record<string, number> = {}
    profiles.forEach((p) => {
      const g = p.form.kelompok || 'Non Staff'
      counts[g] = (counts[g] || 0) + 1
    })
    const order = ['Non Staff', 'Staff', 'Harian', 'Outsourcing', 'Magang']
    return order
      .filter((k) => counts[k] !== undefined)
      .map((name) => ({ name, count: counts[name] || 0 }))
  }, [profiles])

  // 5. Pendidikan Terakhir (Bar, maksimal 5 + Lainnya)
  const pendidikanData = useMemo(() => {
    const counts: Record<string, number> = {}
    profiles.forEach((p) => {
      const lastEdu = p.form.pendidikan?.[p.form.pendidikan.length - 1]?.jenjang || 'Lainnya'
      counts[lastEdu] = (counts[lastEdu] || 0) + 1
    })

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    if (sorted.length <= 5) {
      return sorted.map(([name, count]) => ({ name, count }))
    }
    const top5 = sorted.slice(0, 5)
    const rest = sorted.slice(5).reduce((a, b) => a + b[1], 0)
    return [
      ...top5.map(([name, count]) => ({ name, count })),
      { name: 'Lainnya', count: rest },
    ]
  }, [profiles])

  // 6. Tier Masa Kerja (Bar Horizontal)
  const tenureTierData = useMemo(() => {
    return TENURE_TIERS.map((t) => {
      const count = profiles.filter((p) => {
        if (t.max === null) return p.tenure >= t.min
        return p.tenure >= t.min && p.tenure <= t.max
      }).length
      return {
        tier: t.label,
        count,
      }
    })
  }, [profiles])

  // 7. Tier Usia (Bar Horizontal)
  const ageTierData = useMemo(() => {
    return AGE_TIERS.map((t) => {
      const count = profiles.filter((p) => {
        if (t.max === null) return p.age >= t.min
        return p.age >= t.min && p.age <= t.max
      }).length
      return {
        tier: t.label,
        count,
      }
    })
  }, [profiles])

  const totalDesc = `Total: ${totalEmployees} pegawai`

  return (
    <div className="space-y-4 pt-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Demografi Pegawai</h2>
        <p className="text-sm text-muted-foreground">
          Struktur profil keberagaman karyawan aktif berdasarkan berbagai indikator
        </p>
      </div>

      {/* Row 1: Gender (donut), Jenis Karyawan (bar), Status Kerja (bar) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Gender */}
        <ChartCard title="Gender" description={totalDesc}>
          <DonutChart data={genderChartData} config={genderConfig} centerLabel="Pegawai" height={220} />
        </ChartCard>

        {/* Jenis Karyawan */}
        <ChartCard title="Jenis Karyawan" description={totalDesc}>
          <BarChartSimple
            layout="vertical"
            data={jenisData}
            dataKey="count"
            categoryKey="name"
            config={jenisConfig}
            height={220}
          />
        </ChartCard>

        {/* Status Kerja */}
        <ChartCard title="Status Kerja" description={totalDesc}>
          <BarChartSimple
            layout="vertical"
            data={statusKerjaData}
            dataKey="count"
            categoryKey="name"
            config={statusKerjaConfig}
            height={220}
          />
        </ChartCard>
      </div>

      {/* Row 2: Group Kerja (bar), Pendidikan Terakhir (bar) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Group Kerja" description={totalDesc}>
          <BarChartSimple
            layout="vertical"
            data={groupKerjaData}
            dataKey="count"
            categoryKey="name"
            config={groupKerjaConfig}
            height={220}
          />
        </ChartCard>

        <ChartCard title="Pendidikan Terakhir" description={totalDesc}>
          <BarChartSimple
            layout="vertical"
            data={pendidikanData}
            dataKey="count"
            categoryKey="name"
            config={pendidikanConfig}
            height={220}
          />
        </ChartCard>
      </div>

      {/* Row 3: Tier Masa Kerja (bar) & Tier Usia (bar) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Tier Masa Kerja" description={`${totalDesc} · Master rentang Primaplast`}>
          <BarChartSimple
            layout="horizontal"
            data={tenureTierData}
            dataKey="count"
            categoryKey="tier"
            config={tenureConfig}
            height={220}
          />
        </ChartCard>

        <ChartCard title="Tier Usia" description={`${totalDesc} · Master rentang Primaplast`}>
          <BarChartSimple
            layout="horizontal"
            data={ageTierData}
            dataKey="count"
            categoryKey="tier"
            config={ageConfig}
            height={220}
          />
        </ChartCard>
      </div>
    </div>
  )
}
