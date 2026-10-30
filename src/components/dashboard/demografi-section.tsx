import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts'
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
      { name: 'Laki-laki', value: lk, color: 'var(--chart-1)' },
      { name: 'Perempuan', value: pr, color: 'var(--chart-2)' },
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

  // 6. Tier Masa Kerja (Bar Vertikal)
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
  }, [profiles, TENURE_TIERS])

  // 7. Tier Usia (Bar Vertikal)
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

      {/* Row 1: Gender (donut), Jenis Karyawan (bar), Status Kerja (bar) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Gender */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gender</CardTitle>
            <CardDescription>{totalDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-45 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip formatter={(val, name) => [`${val} orang`, name]} />
                  <Pie
                    data={genderData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              {genderData.map((g) => (
                <span key={g.name} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.name}: <strong className="tabular-nums">{g.value}</strong>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Jenis Karyawan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Jenis Karyawan</CardTitle>
            <CardDescription>{totalDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-50 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jenisData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <ChartTooltip formatter={(val) => [`${val} orang`, 'Jumlah']} />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Kerja */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Kerja</CardTitle>
            <CardDescription>{totalDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-50 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusKerjaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <ChartTooltip formatter={(val) => [`${val} orang`, 'Jumlah']} />
                  <Bar dataKey="value" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Group Kerja (bar), Pendidikan Terakhir (bar) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Group Kerja</CardTitle>
            <CardDescription>{totalDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-50 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupKerjaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <ChartTooltip formatter={(val) => [`${val} orang`, 'Jumlah']} />
                  <Bar dataKey="value" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pendidikan Terakhir</CardTitle>
            <CardDescription>{totalDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-50 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pendidikanData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <ChartTooltip formatter={(val) => [`${val} orang`, 'Jumlah']} />
                  <Bar dataKey="value" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Tier Masa Kerja (bar) & Tier Usia (bar) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tier Masa Kerja</CardTitle>
            <CardDescription>{totalDesc} · Master rentang Primaplast</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-55 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tenureTierData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="tier"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <ChartTooltip formatter={(val) => [`${val} orang`, 'Masa Kerja']} />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tier Usia</CardTitle>
            <CardDescription>{totalDesc} · Master rentang Primaplast</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-55 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageTierData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="tier"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <ChartTooltip formatter={(val) => [`${val} orang`, 'Usia']} />
                  <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

