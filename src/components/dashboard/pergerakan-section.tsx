import { useMemo } from 'react'
import { ArrowRight, UserMinus } from 'lucide-react'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import type { ChartConfig } from '@/components/ui/chart'
import { BarChartGrouped, ChartCard } from '@/components/charts'
import { StatCard } from '@/components/dashboard/stat-card'
import { OFFS, turnoverStats, personOf } from '@/data/offboarding'
import { HEADCOUNT } from '@/data/headcount'
import { ROSTER } from '@/data/employees'
import { formatTenure } from '@/data/directory'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import type { CurrentUser } from '@/data/users'
import type { PageId } from '@/App'

type Props = {
  user: CurrentUser
  dept: string
  onNavigate?: (page: PageId, id?: string | null) => void
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function PergerakanSection({ user, dept, onNavigate }: Props) {
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

  // Atasan (Hendra) tidak melihat card Pergerakan Pegawai
  if (user.role === 'supervisor') return null

  return (
    <div className="space-y-4 pt-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Pergerakan Pegawai</h2>
        <p className="text-sm text-muted-foreground">
          Arus masuk dan keluar pegawai serta rasio turnover tahun berjalan
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ChartCard
          className="lg:col-span-8"
          title="Masuk vs Keluar per Bulan 2026"
          description={`${dept !== 'Semua Department' ? `Department ${dept}` : 'Seluruh perusahaan'} · Jan–Okt 2026`}
        >
          <BarChartGrouped data={movementData} keys={['masuk', 'keluar']} categoryKey="bulan" config={chartConfig} unit="orang" height={260} />
        </ChartCard>

        <StatCard
          className="h-auto self-start lg:col-span-4"
          label="Turnover Tahun Berjalan"
          value={`${tov.pct.toFixed(1).replace('.', ',')}%`}
          delta={`${tov.keluar} keluar`}
          icon={UserMinus}
          summary={`Rata-rata headcount ${tov.avg.toLocaleString('id-ID')} (${tov.awal} → ${tov.akhir})`}
          hint={dept !== 'Semua Department' ? 'Angka berlaku seluruh perusahaan' : 'Rasio keluar per rata-rata headcount'}
        />
      </div>

      {/* Tabel Preview Keluar Terakhir */}
      <Card>
        <CardHeader>
          <CardTitle>Keluar Terakhir</CardTitle>
          <CardDescription>Daftar pegawai yang baru saja menyelesaikan proses offboarding</CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.('industrial-relations')}>
              Lihat semua
              <ArrowRight aria-hidden />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
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
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
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
                      <TableCell className="text-sm font-medium">{o.reason}</TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{formatDate(o.tanggalKeluar)}</TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{tenure}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Menampilkan {lastExits.length} dari {completedOffs.length} data
        </CardFooter>
      </Card>
    </div>
  )
}

