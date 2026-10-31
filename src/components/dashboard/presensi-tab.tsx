import { AlertTriangle, Clock, TrendingDown, TrendingUp, UserCheck, Thermometer } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { ChartCard, BarChartSimple, BarChartGrouped, LineChartCompare } from '@/components/charts'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ChartConfig } from '@/components/ui/chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { presensiData, type DeptBar } from '@/data/dashboard'
import type { DayRecord } from '@/data/attendance'
import { ROSTER } from '@/data/employees'
import type { LeaveRequest } from '@/data/leave'
import { teamNote, type CurrentUser } from '@/data/users'
import { formatDate, num, pct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PageId } from '@/App'

const head = 'text-xs font-medium text-muted-foreground'

const weekConfig = {
  cur: { label: 'Minggu ini', color: 'var(--chart-1)' },
  prev: { label: 'Minggu lalu (hari yang sama)', color: 'var(--chart-2)' },
} satisfies ChartConfig

const monthConfig = {
  pegawai: { label: 'Pegawai sakit', color: 'var(--chart-1)' },
  hari: { label: 'Hari sakit', color: 'var(--chart-2)' },
} satisfies ChartConfig

function DeptBars({ data, empty }: { data: DeptBar[]; empty: string }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p>
  const config = { value: { label: 'Jumlah', color: 'var(--chart-1)' } } satisfies ChartConfig
  return (
    <BarChartSimple
      data={data.map((d) => ({ dept: d.dept, value: d.value }))}
      dataKey="value"
      categoryKey="dept"
      config={config}
      layout="horizontal"
      height={Math.max(140, data.length * 38 + 16)}
    />
  )
}

export function PresensiTab({
  records, requests, user, periodId, dept, onNavigate,
}: {
  records: DayRecord[]
  requests: LeaveRequest[]
  user: CurrentUser
  periodId: string
  dept: string
  onNavigate: (page: PageId, id?: string | null) => void
}) {
  const spv = user.role === 'supervisor'
  const d = presensiData(records, requests, user, periodId, dept)
  const showKategori = user.role === 'admin' || user.role === 'manager'
  const noData = 'Belum ada data absensi pada periode ini'
  const monthlyEmptyBefore = d.monthly.slice(0, 9).every((m) => m.hari === 0)
  const shown = d.anomalyRows.slice(0, 5)

  return (
    <div className="space-y-6">
      {spv && <p className="text-sm text-muted-foreground">{teamNote(user, ROSTER)}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tingkat kehadiran"
          value={d.rate == null ? '—' : pct(d.rate)}
          delta={d.hasData && d.rateDelta != null ? `${d.rateDelta >= 0 ? '+' : ''}${d.rateDelta.toFixed(1).replace('.', ',')}%` : undefined}
          trend={d.rateDelta != null ? (d.rateDelta > 0 ? 'up' : d.rateDelta < 0 ? 'down' : 'neutral') : 'neutral'}
          deltaIcon={d.rateDelta != null && d.rateDelta > 0 ? TrendingUp : d.rateDelta != null && d.rateDelta < 0 ? TrendingDown : undefined}
          categoryIcon={UserCheck}
          summary={d.hasData ? `${num(d.present)} dari ${num(d.terjadwal)} orang-hari` : undefined}
          description={d.hasData ? 'Terjadwal pada periode ini' : noData}
        />
        <StatCard
          label="Pegawai sakit"
          value={num(d.sickPeople)}
          categoryIcon={Thermometer}
          summary={`${num(d.sickDays)} hari sakit`}
          description="Total hari sakit periode ini"
        />
        <StatCard
          label="Keterlambatan"
          value={d.hasData ? `${num(d.telat)} kejadian` : '—'}
          delta={d.hasData && d.telatDelta != null ? `${d.telatDelta >= 0 ? '+' : ''}${d.telatDelta}` : undefined}
          trend={d.telatDelta != null ? (d.telatDelta > 0 ? 'down' : d.telatDelta < 0 ? 'up' : 'neutral') : 'neutral'}
          categoryIcon={Clock}
          summary={d.hasData ? 'Kejadian terlambat' : undefined}
          description={d.hasData ? 'Dibandingkan periode sebelumnya' : noData}
        />
        <StatCard
          label="Anomali belum selesai"
          value={d.hasData ? num(d.anomali) : '—'}
          delta={d.hasData && d.anomali > 0 ? `${d.anomali} anomali` : 'Selesai'}
          trend={d.anomali > 0 ? 'down' : 'neutral'}
          categoryIcon={AlertTriangle}
          summary={d.hasData ? (d.anomali ? 'Perlu diselesaikan sebelum closing' : 'Periode siap closing') : undefined}
          description="Klik untuk membuka Absensi Harian"
          onClick={() => onNavigate('attendance')}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ChartCard
          title="Kehadiran 7 hari terakhir"
          description={
            d.weekEnd
              ? `Hari kerja terakhir dengan data absensi, s/d ${formatDate(d.weekEnd)}. Garis putus: hari yang sama minggu lalu.`
              : 'Belum ada data absensi'
          }
          className="lg:col-span-7"
        >
          {d.week.length ? (
            <LineChartCompare
              data={d.week}
              series={[
                { key: 'cur', label: 'Minggu ini' },
                { key: 'prev', label: 'Minggu lalu', dashed: true },
              ]}
              categoryKey="label"
              config={weekConfig}
              height={260}
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">{noData}</p>
          )}
        </ChartCard>

        <ChartCard
          title="Sakit per bulan 2026"
          description={`Pegawai sakit dan hari sakit per periode absensi.${monthlyEmptyBefore ? ' Data absensi tersedia mulai periode Oktober 2026.' : ''}`}
          className="lg:col-span-5"
        >
          <BarChartGrouped
            data={d.monthly}
            series={[
              { key: 'pegawai', label: 'Pegawai sakit' },
              { key: 'hari', label: 'Hari sakit' },
            ]}
            categoryKey="bulan"
            config={monthConfig}
            height={260}
          />
        </ChartCard>
      </div>

      <div className={cn('grid grid-cols-1 gap-6', showKategori ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
        <Card>
          <CardHeader>
            <CardTitle>Hari sakit per department</CardTitle>
            <CardDescription>Periode terpilih, terbanyak di atas</CardDescription>
          </CardHeader>
          <CardContent><DeptBars data={d.sickByDept} empty={d.hasData || d.sickDays ? "Tidak ada hari sakit pada periode ini" : noData} /></CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keterlambatan per department</CardTitle>
            <CardDescription>Periode terpilih, terbanyak di atas</CardDescription>
          </CardHeader>
          <CardContent><DeptBars data={d.telatByDept} empty={d.hasData || d.telat ? "Tidak ada keterlambatan pada periode ini" : noData} /></CardContent>
        </Card>

        {showKategori && (
          <Card>
            <CardHeader>
              <CardTitle>Hari sakit per kategori pegawai</CardTitle>
              <CardDescription>Organik, Harian, Magang, Outsourcing</CardDescription>
            </CardHeader>
            <CardContent><DeptBars data={d.kategori.map((k) => ({ dept: k.nama, value: k.hari }))} empty={d.hasData || d.sickDays ? "Tidak ada hari sakit pada periode ini" : noData} /></CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anomali belum diselesaikan ({d.anomali})</CardTitle>
          <CardDescription>Pratinjau anomali absensi pada periode terpilih yang masih membutuhkan tindakan</CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('attendance')}>Lihat semua di Absensi Harian</Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={head}>Tanggal</TableHead>
                  <TableHead className={head}>NIP</TableHead>
                  <TableHead className={head}>Nama</TableHead>
                  <TableHead className={head}>Department</TableHead>
                  <TableHead className={head}>Masalah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">Tidak ada anomali yang belum diselesaikan pada periode ini.</TableCell></TableRow>
                ) : (
                  shown.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{formatDate(a.tanggal)}</TableCell>
                      <TableCell className="text-muted-foreground">{a.nik ?? '—'}</TableCell>
                      <TableCell>{a.nama}</TableCell>
                      <TableCell className="text-muted-foreground">{a.department}</TableCell>
                      <TableCell className="text-danger font-medium">{a.jenis}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">Menampilkan {shown.length} dari {d.anomali} anomali</p>
        </CardContent>
      </Card>
    </div>
  )
}
