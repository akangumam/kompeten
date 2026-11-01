import { useMemo } from 'react'
import { BarChartSimple, ChartCard, DonutChart } from '@/components/charts'
import type { ChartConfig } from '@/components/ui/chart'
import { ROSTER, type RosterEmployee } from '@/data/employees'
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

const valueConfig = { value: { label: 'Pegawai', color: 'var(--chart-1)' } } satisfies ChartConfig
const genderConfig = {
  lk: { label: 'Laki-laki', color: 'var(--chart-1)' },
  pr: { label: 'Perempuan', color: 'var(--chart-2)' },
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
  const genderData = useMemo(() => {
    let lk = 0
    let pr = 0
    profiles.forEach((p) => {
      if (p.form.gender === 'Perempuan') pr++
      else lk++
    })
    return [
      { key: 'lk', value: lk },
      { key: 'pr', value: pr },
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
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
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
      { name: 'Tetap', value: tetap },
      { name: 'Kontrak', value: kontrak },
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
      .map((name) => ({ name, value: counts[name] || 0 }))
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
      return sorted.map(([name, value]) => ({ name, value }))
    }
    const top5 = sorted.slice(0, 5)
    const rest = sorted.slice(5).reduce((a, b) => a + b[1], 0)
    return [
      ...top5.map(([name, value]) => ({ name, value })),
      { name: 'Lainnya', value: rest },
    ]
  }, [profiles])

  // 6. Tier Masa Kerja (Bar horizontal)
  const tenureTierData = useMemo(() => {
    return TENURE_TIERS.map((t) => {
      const count = profiles.filter((p) => {
        if (t.max === null) return p.tenure >= t.min
        return p.tenure >= t.min && p.tenure <= t.max
      }).length
      return {
        name: t.label,
        value: count,
      }
    })
  }, [profiles, TENURE_TIERS])

  // 7. Tier Usia (Bar horizontal)
  const ageTierData = useMemo(() => {
    return AGE_TIERS.map((t) => {
      const count = profiles.filter((p) => {
        if (t.max === null) return p.age >= t.min
        return p.age >= t.min && p.age <= t.max
      }).length
      return {
        name: t.label,
        value: count,
      }
    })
  }, [profiles, AGE_TIERS])

  const totalDesc = `Total: ${totalEmployees} pegawai`

  return (
    <div className="space-y-4 pt-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Demografi Pegawai</h2>
        <p className="text-sm text-muted-foreground">
          Struktur profil keberagaman karyawan aktif berdasarkan berbagai indikator
        </p>
      </div>

      {/* Baris 1: Gender (donut), Jenis Karyawan, Status Kerja */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Gender" description={totalDesc}>
          <DonutChart data={genderData} config={genderConfig} centerLabel="Karyawan" unit="orang" />
        </ChartCard>
        <ChartCard title="Jenis Karyawan" description={totalDesc}>
          <BarChartSimple data={jenisData} dataKey="value" categoryKey="name" config={valueConfig} unit="orang" />
        </ChartCard>
        <ChartCard title="Status Kerja" description={totalDesc}>
          <BarChartSimple data={statusKerjaData} dataKey="value" categoryKey="name" config={valueConfig} unit="orang" />
        </ChartCard>
      </div>

      {/* Baris 2: Group Kerja, Pendidikan Terakhir */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Group Kerja" description={totalDesc}>
          <BarChartSimple data={groupKerjaData} dataKey="value" categoryKey="name" config={valueConfig} unit="orang" />
        </ChartCard>
        <ChartCard title="Pendidikan Terakhir" description={totalDesc}>
          <BarChartSimple data={pendidikanData} dataKey="value" categoryKey="name" config={valueConfig} unit="orang" />
        </ChartCard>
      </div>

      {/* Baris 3: Tier Masa Kerja & Tier Usia (horizontal supaya label tidak miring) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Tier Masa Kerja" description={`${totalDesc} · Master rentang Primaplast`}>
          <BarChartSimple data={tenureTierData} dataKey="value" categoryKey="name" config={valueConfig} layout="horizontal" unit="orang" />
        </ChartCard>
        <ChartCard title="Tier Usia" description={`${totalDesc} · Master rentang Primaplast`}>
          <BarChartSimple data={ageTierData} dataKey="value" categoryKey="name" config={valueConfig} layout="horizontal" unit="orang" />
        </ChartCard>
      </div>
    </div>
  )
}
