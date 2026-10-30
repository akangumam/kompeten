import { useMemo } from 'react'
import { ArrowRight, UserCheck, UserMinus, TrendingDown, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Masuk vs Keluar per Bulan (Grouped Bar) */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Masuk vs Keluar per Bulan 2026</CardTitle>
            <CardDescription>
              {dept !== 'Semua Department' ? `Department ${dept}` : 'Seluruh perusahaan'} · Jan–Okt 2026
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
              <BarChart data={movementData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="bulan" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <ChartTooltip
                  formatter={(val, name) => [
                    val !== null ? `${val} orang` : 'Belum ada data',
                    name === 'masuk' ? 'Masuk' : 'Keluar',
                  ]}
                />
                <Bar dataKey="masuk" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="masuk" />
                <Bar dataKey="keluar" fill="var(--chart-2)" radius={[4, 4, 0, 0]} name="keluar" />
              </BarChart>
            </ChartContainer>
            <div className="flex items-center justify-center gap-6 pt-3 text-xs">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: 'var(--chart-1)' }} />
                Masuk
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: 'var(--chart-2)' }} />
                Keluar
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Small KPI: Turnover Tahun Berjalan */}
        <Card className="lg:col-span-4 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base">Turnover Tahun Berjalan</CardTitle>
            <CardDescription>
              {dept !== 'Semua Department' ? 'Angka berlaku seluruh perusahaan' : 'Rasio keluar per rata-rata headcount'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {tov.pct.toFixed(1).replace('.', ',')}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {tov.keluar} keluar ÷ {tov.avg.toLocaleString('id-ID')} rata-rata headcount × 100
              </p>
            </div>
            <div className="rounded-md border bg-muted/40 p-3 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Headcount Awal Tahun:</span>
                <strong className="text-foreground tabular-nums">{tov.awal}</strong>
              </div>
              <div className="flex justify-between">
                <span>Headcount Akhir Periode:</span>
                <strong className="text-foreground tabular-nums">{tov.akhir}</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Keluar (Turnover):</span>
                <strong className="text-foreground tabular-nums">{tov.keluar} orang</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Preview Keluar Terakhir */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Keluar Terakhir</CardTitle>
            <CardDescription>Daftar pegawai yang baru saja menyelesaikan proses offboarding</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs font-medium"
            onClick={() => onNavigate?.('industrial-relations')}
          >
            <span>Lihat semua</span>
            <ArrowRight className="size-3.5" />
          </Button>
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
      </Card>
    </div>
  )
}

