import { useMemo } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  PlusCircle,
  TrendingUp,
  Users,
  Target,
  Percent,
  UserMinus,
  Briefcase,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts'
import { ROSTER, type RosterEmployee } from '@/data/employees'
import { MANPOWER_STANDARDS } from '@/data/master/manpower-standards'
import { JOBS, terisi } from '@/data/recruitment/jobs'
import { OFFS } from '@/data/offboarding'
import { DEMO_TODAY } from '@/lib/today'
import type { CurrentUser } from '@/data/users'
import type { PageId } from '@/App'
import { useMaster } from '@/data/master/store'

type Props = {
  user: CurrentUser
  year: string
  section: string
  onNavigate?: (page: PageId, id?: string | null) => void
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function ProduksiTab({ user, year, section, onNavigate }: Props) {
  useMaster()

  const isSupervisor = user.role === 'supervisor'
  // Atasan Produksi (Hendra) hanya melihat section timnya (Injection)
  const effectiveSection = isSupervisor ? 'Injection' : section

  // Pegawai Produksi aktif saat ini
  const activeProduksi = useMemo(() => {
    return ROSTER.filter((e) => {
      if (e.department !== 'Produksi') return false
      if (effectiveSection !== 'Semua Section' && e.section !== effectiveSection) return false
      return true
    })
  }, [effectiveSection])

  // Standar Produksi saat ini
  const activeStandards = useMemo(() => {
    return MANPOWER_STANDARDS.filter((s) => {
      if (s.department !== 'Produksi' || s.status !== 'Aktif') return false
      if (s.berlakuMulai > DEMO_TODAY) return false
      if (effectiveSection !== 'Semua Section' && s.section !== effectiveSection) return false
      return true
    })
  }, [effectiveSection])

  // Rincian per posisi
  const positionRows = useMemo(() => {
    const list: {
      section: string
      posisi: string
      standar: number
      existing: number
      selisih: number
      job?: (typeof JOBS)[number]
    }[] = []

    // Kumpulkan pasangan (section, posisi) dari standar & existing
    const pairs = new Map<string, { section: string; posisi: string }>()
    activeStandards.forEach((s) => {
      pairs.set(`${s.section}|${s.posisi}`, { section: s.section, posisi: s.posisi })
    })
    activeProduksi.forEach((e) => {
      pairs.set(`${e.section ?? ''}|${e.posisi}`, { section: e.section ?? '', posisi: e.posisi })
    })

    const sortedPairs = Array.from(pairs.values()).sort((a, b) => {
      if (a.section !== b.section) return a.section.localeCompare(b.section)
      return a.posisi.localeCompare(b.posisi)
    })

    for (const p of sortedPairs) {
      const stdItem = activeStandards.find(
        (s) => s.section === p.section && s.posisi === p.posisi,
      )
      const stdCount = stdItem?.standar ?? 0
      const exCount = activeProduksi.filter(
        (e) => e.section === p.section && e.posisi === p.posisi,
      ).length
      const diff = exCount - stdCount
      const job = JOBS.find((j) => j.dept === 'Produksi' && j.posisi === p.posisi)

      list.push({
        section: p.section,
        posisi: p.posisi,
        standar: stdCount,
        existing: exCount,
        selisih: diff,
        job,
      })
    }

    return list
  }, [activeStandards, activeProduksi])

  // Total KPI
  const totalExisting = activeProduksi.length
  const totalStandar = positionRows.reduce((a, b) => a + b.standar, 0)
  const pemenuhanPct = totalStandar > 0 ? (totalExisting / totalStandar) * 100 : 100
  const totalKurang = positionRows
    .filter((r) => r.selisih < 0)
    .reduce((a, b) => a + Math.abs(b.selisih), 0)

  // Hitung jumlah lowongan terbuka untuk posisi yang kurang
  const openJobNeeds = positionRows
    .filter((r) => r.selisih < 0 && r.job && r.job.status === 'Dibuka')
    .reduce((a, b) => a + (b.job?.kebutuhan ?? 0), 0)

  // Standar vs Existing per Section
  const sectionChartData = useMemo(() => {
    const sections = isSupervisor
      ? ['Injection']
      : effectiveSection !== 'Semua Section'
      ? [effectiveSection]
      : ['Injection', 'Blow Molding', 'Extrusion', 'Printing']

    return sections.map((sec) => {
      const rows = positionRows.filter((r) => r.section === sec)
      const stdTotal = rows.reduce((a, b) => a + b.standar, 0)
      const exTotal = rows.reduce((a, b) => a + b.existing, 0)
      return {
        section: sec,
        standar: stdTotal,
        existing: exTotal,
      }
    })
  }, [positionRows, isSupervisor, effectiveSection])

  // Tren headcount Produksi bulanan Jan-Des untuk 2026 dan 2025
  const trendData = useMemo(() => {
    const prodRoster = ROSTER.filter((e) => {
      if (e.department !== 'Produksi') return false
      if (effectiveSection !== 'Semua Section' && e.section !== effectiveSection) return false
      return true
    })

    const getCountAt = (y: number, m: number) => {
      const lastDay = new Date(y, m, 0).toISOString().slice(0, 10)
      let count = prodRoster.filter((e) => e.tanggalMasuk <= lastDay).length
      // Ahmad Fauzi (Blow Molding) keluar 2026-09-15
      if (
        (effectiveSection === 'Semua Section' || effectiveSection === 'Blow Molding') &&
        lastDay <= '2026-09-15'
      ) {
        count += 1
      }
      return count
    }

    return BULAN.map((bulan, idx) => {
      const m = idx + 1
      const y2025 = getCountAt(2025, m)
      // 2026 hanya sampai bulan Oktober (DEMO_TODAY = Okt 2026)
      const y2026 = m <= 10 ? getCountAt(2026, m) : null
      return {
        bulan,
        y2025,
        y2026,
      }
    })
  }, [effectiveSection])

  const chartConfig = {
    standar: { label: 'Standar', color: 'var(--chart-2)' },
    existing: { label: 'Existing', color: 'var(--chart-1)' },
  } satisfies ChartConfig

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manpower Existing</CardTitle>
            <Users className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{totalExisting}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Karyawan aktif {effectiveSection !== 'Semua Section' ? `section ${effectiveSection}` : 'Produksi'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Standar Tenaga Kerja</CardTitle>
            <Target className="size-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{totalStandar}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total kebutuhan sesuai master standar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pemenuhan</CardTitle>
            <Percent className="size-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {pemenuhanPct.toFixed(1).replace('.', ',')}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Rasio existing dibanding standar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kekurangan</CardTitle>
            <UserMinus className="size-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-warning">{totalKurang} orang</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {openJobNeeds} sudah ada lowongan dibuka
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Standar vs Existing per Section & Tren Headcount Produksi */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Standar vs Existing per Section (Grouped Bar Horizontal) */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle>Standar vs Existing per Section</CardTitle>
            <CardDescription>Perbandingan kebutuhan standar dan jumlah aktual</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
              <BarChart
                data={sectionChartData}
                layout="vertical"
                margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)' }} />
                <YAxis
                  dataKey="section"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={90}
                  tick={{ fill: 'var(--foreground)', fontSize: 12 }}
                />
                <ChartTooltip
                  formatter={(value, name) => [
                    `${value} orang`,
                    name === 'standar' ? 'Standar' : 'Existing',
                  ]}
                />
                <Bar dataKey="standar" fill="var(--chart-2)" radius={[0, 4, 4, 0]} name="standar" />
                <Bar dataKey="existing" fill="var(--chart-1)" radius={[0, 4, 4, 0]} name="existing" />
              </BarChart>
            </ChartContainer>
            <div className="flex items-center justify-center gap-6 pt-3 text-xs">
              <span className="flex items-center gap-2">
                <span className="size-3 rounded-[2px]" style={{ backgroundColor: 'var(--chart-2)' }} />
                Standar
              </span>
              <span className="flex items-center gap-2">
                <span className="size-3 rounded-[2px]" style={{ backgroundColor: 'var(--chart-1)' }} />
                Existing
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tren Headcount Produksi */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle>Tren Headcount Produksi</CardTitle>
            <CardDescription>
              Perbandingan headcount bulanan 2025 vs 2026 {effectiveSection !== 'Semua Section' ? `(${effectiveSection})` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                y2025: { label: '2025', color: 'var(--chart-2)' },
                y2026: { label: '2026', color: 'var(--chart-1)' },
              }}
              className="aspect-auto h-[260px] w-full"
            >
              <ComposedChart data={trendData} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="bulan" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: 'var(--muted-foreground)' }} />
                <YAxis
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                  tick={{ fill: 'var(--muted-foreground)' }}
                />
                <ChartTooltip
                  formatter={(value, name) => [
                    value !== null ? `${value} orang` : 'Belum ada data',
                    name === 'y2026' ? '2026' : '2025',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="y2025"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                  name="y2025"
                />
                <Line
                  type="monotone"
                  dataKey="y2026"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls={false}
                  name="y2026"
                />
              </ComposedChart>
            </ChartContainer>
            <div className="flex items-center justify-center gap-6 pt-3 text-xs">
              <span className="flex items-center gap-2">
                <span className="h-0.5 w-4 border-b-2 border-dashed" style={{ borderColor: 'var(--chart-2)' }} />
                2025
              </span>
              <span className="flex items-center gap-2">
                <span className="h-0.5 w-4 border-b-2" style={{ borderColor: 'var(--chart-1)' }} />
                2026
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rincian per Posisi */}
      <Card>
        <CardHeader>
          <CardTitle>Rincian per Posisi</CardTitle>
          <CardDescription>
            Detail pemenuhan tenaga kerja dan keterkaitan dengan lowongan rekrutmen aktif
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px]">Section</TableHead>
                  <TableHead>Jabatan / Posisi</TableHead>
                  <TableHead className="text-right w-[100px]">Standar</TableHead>
                  <TableHead className="text-right w-[100px]">Existing</TableHead>
                  <TableHead className="w-[160px]">Selisih</TableHead>
                  <TableHead className="w-[240px]">Lowongan Rekrutmen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positionRows.map((r, i) => {
                  const terisiCount = r.job ? terisi(r.job) : 0
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-foreground">{r.section}</TableCell>
                      <TableCell className="font-medium">{r.posisi}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{r.standar}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{r.existing}</TableCell>
                      <TableCell>
                        {r.selisih < 0 ? (
                          <StatusBadge variant="warning" className="gap-1.5 font-medium">
                            <AlertTriangle className="size-3.5" />
                            Kurang {Math.abs(r.selisih)}
                          </StatusBadge>
                        ) : r.selisih > 0 ? (
                          <StatusBadge variant="info" className="gap-1.5 font-medium">
                            <PlusCircle className="size-3.5" />
                            Lebih {r.selisih}
                          </StatusBadge>
                        ) : (
                          <StatusBadge variant="success" className="gap-1.5 font-medium">
                            <CheckCircle2 className="size-3.5" />
                            Sesuai
                          </StatusBadge>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.job && r.job.status === 'Dibuka' ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                            onClick={() => onNavigate?.('recruitment')}
                          >
                            <Briefcase className="size-3.5" />
                            <span>
                              {r.job.no} · {terisiCount}/{r.job.kebutuhan} terisi
                            </span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
