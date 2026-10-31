import { useMemo } from 'react'
import { ArrowRight, UserMinus } from 'lucide-react'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/dashboard/stat-card'
import { ChartCard, BarChartGrouped } from '@/components/charts'
import type { ChartConfig } from '@/components/ui/chart'
import { OFFS, turnoverStats, personOf } from '@/data/offboarding'
import { HEADCOUNT } from '@/data/headcount'
import { ROSTER } from '@/data/employees'
import { formatTenure } from '@/data/directory'
import { formatDate } from '@/lib/format'
import type { CurrentUser } from '@/data/users'
import type { PageId } from '@/App'

type Props = {
  user: CurrentUser
  dept: string
  onNavigate?: (page: PageId, id?: string | null) => void
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function PergerakanSection({ user, dept, onNavigate }: Props) {
  // Atasan (Hendra) tidak melihat card Pergerakan Pegawai
  if (user.role === 'supervisor') {
    return null
  }

  // Turnover tahun berjalan dari Hubungan Industrial (seluruh perusahaan: 1,3%)
  const tov = turnoverStats()

  // Selesai keluar (OFFS status selesai)
  const completedOffs = useMemo(() => {
    return OFFS.filter((o) => o.status === 'selesai')
      .map((o) => {
        const p = personOf(o.nik)
        return {
          ...o,
          person: p,
          dept: p?.department ?? '',
        }
      })
      .filter((o) => dept === 'Semua Department' || o.dept === dept)
      .sort((a, b) => b.tanggalKeluar.localeCompare(a.tanggalKeluar))
  }, [dept])

  // Masuk vs Keluar per bulan 2026
  const movementData = useMemo(() => {
    const isCompanyWide = dept === 'Semua Department'
    const hc2026 = HEADCOUNT[2026]
    const hcStart = HEADCOUNT[2025]?.[11] ?? 224

    return BULAN.map((bulan, idx) => {
      const m = idx + 1
      const ym = `2026-${String(m).padStart(2, '0')}`

      // Bulan setelah Oktober 2026 (DEMO_TODAY) belum terjadi
      if (m > 10) {
        return { bulan, masuk: null, keluar: null }
      }

      // Keluar bulan ini
      const keluarCount = OFFS.filter((o) => {
        if (o.status !== 'selesai') return false
        if (!o.tanggalKeluar.startsWith(ym)) return false
        if (!isCompanyWide) {
          const p = personOf(o.nik)
          return p?.department === dept
        }
        return true
      }).length

      let masukCount = 0
      if (isCompanyWide) {
        // Dari seri headcount: net = headcount(m) - headcount(m-1); masuk = net + keluar
        const prev = idx === 0 ? hcStart : hc2026[idx - 1] ?? hcStart
        const cur = hc2026[idx] ?? prev
        const net = cur - prev
        masukCount = Math.max(0, net + keluarCount)
      } else {
        // Untuk department tertentu, hitung pegawai di department tersebut yang masuk di bulan ym
        masukCount = ROSTER.filter((e) => e.department === dept && e.tanggalMasuk.startsWith(ym)).length
      }

      return {
        bulan,
        masuk: masukCount,
        keluar: keluarCount,
      }
    })
  }, [dept])

  // 5 Pegawai Keluar terakhir
  const lastExits = completedOffs.slice(0, 5)

  const chartConfig = {
    masuk: { label: 'Masuk', color: 'var(--chart-1)' },
    keluar: { label: 'Keluar', color: 'var(--chart-2)' },
  } satisfies ChartConfig

  return (
    <div className="space-y-4 pt-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Pergerakan Pegawai</h2>
        <p className="text-sm text-muted-foreground">
          Arus masuk dan keluar pegawai serta rasio turnover tahun berjalan
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* Masuk vs Keluar per Bulan (Grouped Bar) */}
        <ChartCard
          title="Masuk vs Keluar per Bulan 2026"
          description={`${dept !== 'Semua Department' ? `Department ${dept}` : 'Seluruh perusahaan'} · Jan–Okt 2026`}
          className="lg:col-span-8"
        >
          <BarChartGrouped
            layout="vertical"
            data={movementData}
            series={[
              { key: 'masuk', label: 'Masuk' },
              { key: 'keluar', label: 'Keluar' },
            ]}
            categoryKey="bulan"
            config={chartConfig}
            height={260}
          />
        </ChartCard>

        {/* Small KPI: Turnover Tahun Berjalan */}
        <div className="lg:col-span-4 flex flex-col">
          <StatCard
            label="Turnover Tahun Berjalan"
            value={`${tov.pct.toFixed(1).replace('.', ',')}%`}
            delta={`${tov.keluar} keluar`}
            categoryIcon={UserMinus}
            summary={`Rata-rata headcount ${tov.avg.toLocaleString('id-ID')} (${tov.awal} → ${tov.akhir})`}
            description={dept !== 'Semua Department' ? 'Angka berlaku seluruh perusahaan' : 'Rasio keluar per rata-rata headcount'}
            className="h-full"
          />
        </div>
      </div>

      {/* Tabel Preview Keluar Terakhir */}
      <Card>
        <CardHeader>
          <CardTitle>Keluar Terakhir</CardTitle>
          <CardDescription>Daftar pegawai yang baru saja menyelesaikan proses offboarding</CardDescription>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs font-medium"
              onClick={() => onNavigate?.('industrial-relations')}
            >
              <span>Lihat semua</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Pegawai</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Tanggal Keluar</TableHead>
                  <TableHead>Masa Kerja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lastExits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-sm text-muted-foreground">
                      Tidak ada data pegawai keluar pada filter ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  lastExits.map((o) => {
                    const masukDate = o.person?.tanggalMasuk ?? '2024-01-01'
                    const tenure = formatTenure(masukDate, o.tanggalKeluar)
                    return (
                      <TableRow key={o.no}>
                        <TableCell>
                          <div className="font-medium text-foreground">{o.person?.nama ?? o.nik}</div>
                          <div className="text-xs text-muted-foreground">
                            {o.nik} · {o.person?.department} {o.person?.section ? `(${o.person.section})` : ''}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{o.reason}</TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {formatDate(o.tanggalKeluar)}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {tenure}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground pt-4 border-t">
          Menampilkan {lastExits.length} dari {completedOffs.length} data
        </CardFooter>
      </Card>
    </div>
  )
}
