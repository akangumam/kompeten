import { useMemo } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  PlusCircle,
  Users,
  Target,
  Percent,
  UserMinus,
  Briefcase,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/status-badge'
import type { ChartConfig } from '@/components/ui/chart'
import { BarChartGrouped, ChartCard, LineChartCompare } from '@/components/charts'
import { StatCard } from '@/components/dashboard/stat-card'
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
    existing: { label: 'Existing', color: 'var(--chart-1)' },
    standar: { label: 'Standar', color: 'var(--chart-2)' },
  } satisfies ChartConfig

  const trendConfig = {
    y2026: { label: '2026', color: 'var(--chart-1)' },
    y2025: { label: '2025', color: 'var(--chart-2)' },
  } satisfies ChartConfig

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Manpower Existing"
          value={totalExisting}
          icon={Users}
          hint={`Karyawan aktif ${effectiveSection !== 'Semua Section' ? `section ${effectiveSection}` : 'Produksi'}`}
        />
        <StatCard label="Standar Tenaga Kerja" value={totalStandar} icon={Target} hint="Total kebutuhan sesuai master standar" />
        <StatCard
          label="Pemenuhan"
          value={`${pemenuhanPct.toFixed(1).replace('.', ',')}%`}
          icon={Percent}
          hint="Rasio existing dibanding standar"
        />
        <StatCard
          label="Kekurangan"
          value={`${totalKurang} orang`}
          icon={UserMinus}
          hint={`${openJobNeeds} sudah ada lowongan dibuka`}
        />
      </div>

      {/* Standar vs Existing per Section & Tren Headcount Produksi */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ChartCard
          className="lg:col-span-6"
          title="Standar vs Existing per Section"
          description="Perbandingan kebutuhan standar dan jumlah aktual"
        >
          <BarChartGrouped
            data={sectionChartData}
            keys={['existing', 'standar']}
            categoryKey="section"
            config={chartConfig}
            layout="horizontal"
            unit="orang"
            height={Math.max(220, sectionChartData.length * 72 + 56)}
          />
        </ChartCard>

        <ChartCard
          className="lg:col-span-6"
          title="Tren Headcount Produksi"
          description={`Perbandingan headcount bulanan 2025 vs 2026${effectiveSection !== 'Semua Section' ? ` (${effectiveSection})` : ''}`}
        >
          <LineChartCompare
            data={trendData}
            categoryKey="bulan"
            config={trendConfig}
            height={Math.max(220, sectionChartData.length * 72 + 56)}
            valueFormatter={(n) => `${n} orang`}
            series={[{ key: 'y2025', dashed: true }, { key: 'y2026', dots: true }]}
          />
        </ChartCard>
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
                  <TableHead className="w-45">Section</TableHead>
                  <TableHead>Jabatan / Posisi</TableHead>
                  <TableHead className="text-right w-25">Standar</TableHead>
                  <TableHead className="text-right w-25">Existing</TableHead>
                  <TableHead className="w-40">Selisih</TableHead>
                  <TableHead className="w-60">Lowongan Rekrutmen</TableHead>
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
