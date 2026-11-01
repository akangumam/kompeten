import { AlertTriangle, CheckCircle, Clock, UserCheck, Thermometer } from 'lucide-react'
import { useMemo } from 'react'
import { BarChartGrouped, BarChartSimple, ChartCard, LineChartCompare } from '@/components/charts'
import { StatCard, num, pct } from '@/components/dashboard/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ChartConfig } from '@/components/ui/chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { presensiData, type DayPoint, type DeptBar } from '@/data/dashboard'
import type { DayRecord } from '@/data/attendance'
import { ROSTER } from '@/data/employees'
import type { LeaveRequest } from '@/data/leave'
import { teamNote, type CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PageId } from '@/App'

const head = 'text-xs font-medium text-muted-foreground'

/** Badge tren + ringkasan footer untuk perbandingan dengan periode lalu. */
function trendProps(delta: number | null, unit: string): { delta?: string; trend?: 'up' | 'down'; summary: string } {
  if (delta == null) return { summary: 'Belum ada pembanding periode lalu' }
  if (Math.abs(delta) < 0.05) return { summary: 'Sama dengan periode lalu' }
  const up = delta > 0
  return {
    delta: `${up ? '+' : '−'}${Math.abs(delta).toLocaleString('id-ID', { maximumFractionDigits: 1 })} ${unit}`,
    trend: up ? 'up' : 'down',
    summary: `${up ? 'Naik' : 'Turun'} dibanding periode lalu`,
  }
}

const weekConfig = { cur: { label: 'Minggu ini', color: 'var(--chart-1)' }, prev: { label: 'Minggu lalu (hari yang sama)', color: 'var(--chart-2)' } } satisfies ChartConfig

/** Label tooltip minggu: tanggal + rincian hadir dari terjadwal. */
function weekLabel(_: unknown, payload: readonly unknown[]) {
  const d = (payload[0] as { payload?: DayPoint } | undefined)?.payload
  if (!d) return null
  return (
    <div className="grid gap-1">
      <span>{formatDate(d.tanggal)}</span>
      <span className="font-normal text-muted-foreground tabular-nums">Hadir {d.hadir} dari {d.terjadwal} terjadwal</span>
      <span className="font-normal text-muted-foreground tabular-nums">Sakit {d.sakit} · Izin {d.izin} · Cuti {d.cuti} · Alfa {d.alfa}</span>
    </div>
  )
}

const monthConfig = { pegawai: { label: 'Pegawai sakit', color: 'var(--chart-1)' }, hari: { label: 'Hari sakit', color: 'var(--chart-2)' } } satisfies ChartConfig
const deptConfig = { value: { label: 'Jumlah', color: 'var(--chart-1)' } } satisfies ChartConfig

function DeptBars({ data, empty }: { data: DeptBar[]; empty: string }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p>
  return <BarChartSimple data={data} dataKey="value" categoryKey="dept" config={deptConfig} layout="horizontal" height={Math.max(140, data.length * 38 + 16)} />
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
  const d = useMemo(() => presensiData(records, requests, user, periodId, dept), [records, requests, user, periodId, dept])
  const spv = user.role === 'supervisor'
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
          icon={UserCheck}
          value={d.rate == null ? '—' : pct(d.rate)}
          {...(d.hasData ? trendProps(d.rateDelta, 'poin') : {})}
          hint={d.hasData ? `${num(d.present)} dari ${num(d.terjadwal)} orang-hari terjadwal` : noData}
        />
        <StatCard label="Pegawai sakit" icon={Thermometer} value={num(d.sickPeople)} hint={`${num(d.sickDays)} hari sakit`} />
        <StatCard
          label="Keterlambatan"
          icon={Clock}
          value={d.hasData ? num(d.telat) : '—'}
          {...(d.hasData ? trendProps(d.telatDelta, 'kejadian') : {})}
          hint={d.hasData ? 'kejadian terlambat' : noData}
        />
        <StatCard
          label="Anomali belum selesai"
          icon={AlertTriangle}
          value={d.hasData ? num(d.anomali) : '—'}
          hint={d.hasData ? (d.anomali ? 'Perlu diselesaikan sebelum closing' : 'Periode siap closing') : noData}
          footer={<button type="button" className="font-medium text-primary underline underline-offset-4 hover:no-underline" onClick={() => onNavigate('attendance')}>Buka Absensi Harian</button>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ChartCard
          className="lg:col-span-7"
          title="Kehadiran 7 hari terakhir"
          description={d.weekEnd ? `Hari kerja terakhir dengan data absensi, s/d ${formatDate(d.weekEnd)}. Garis putus: hari yang sama minggu lalu.` : 'Belum ada data absensi'}
        >
          {d.week.length ? (
            <LineChartCompare
              data={d.week}
              categoryKey="label"
              config={weekConfig}
              height={280}
              valueFormatter={(v) => pct(v)}
              yTickFormatter={(v) => `${v}%`}
              labelFormatter={weekLabel}
              series={[{ key: 'prev', dashed: true, dots: true }, { key: 'cur', dots: true }]}
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">{noData}</p>
          )}
        </ChartCard>

        <ChartCard
          className="lg:col-span-5"
          title="Sakit per bulan 2026"
          description={`Pegawai sakit dan hari sakit per periode absensi.${monthlyEmptyBefore ? ' Data absensi tersedia mulai periode Oktober 2026.' : ''}`}
        >
          <BarChartGrouped data={d.monthly} keys={['pegawai', 'hari']} categoryKey="bulan" config={monthConfig} height={280} />
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

        {showKategori && (
          <Card>
            <CardHeader>
              <CardTitle>Kategori sakit terbanyak</CardTitle>
              <CardDescription>5 teratas dan Lainnya, dari kategori surat dokter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {d.kategori.length ? (
                <ul className="space-y-3">
                  {d.kategori.map((k) => (
                    <li key={k.nama} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate">{k.nama}</span>
                        <span className="shrink-0 tabular-nums"><b>{num(k.hari)}</b> hari <span className="text-muted-foreground">· {pct(k.pct)}</span></span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-chart-1" style={{ width: `${k.pct}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">{d.hasData ? 'Tidak ada hari sakit pada periode ini' : noData}</p>
              )}
              <p className="text-xs text-muted-foreground">Data agregat, tanpa nama pegawai</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Keterlambatan per department</CardTitle>
            <CardDescription>Jumlah kejadian pada periode terpilih</CardDescription>
          </CardHeader>
          <CardContent><DeptBars data={d.telatByDept} empty={d.hasData ? "Tidak ada keterlambatan pada periode ini" : noData} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anomali belum selesai</CardTitle>
          <CardDescription>Selesaikan di Absensi Harian sebelum closing periode</CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('attendance')}>Lihat semua</Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {shown.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={head}>Tanggal</TableHead>
                    <TableHead className={head}>Pegawai</TableHead>
                    <TableHead className={head}>Department</TableHead>
                    <TableHead className={head}>Jenis anomali</TableHead>
                    <TableHead className={`text-right ${head}`}>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="tabular-nums">{formatDate(r.tanggal)}</TableCell>
                      <TableCell className="font-medium">{r.nama}</TableCell>
                      <TableCell className="text-muted-foreground">{r.department}</TableCell>
                      <TableCell>{r.jenis}</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => onNavigate('attendance', r.id)}>Selesaikan</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="pt-3 text-sm text-muted-foreground">Menampilkan {shown.length} dari {d.anomalyRows.length} data</p>
            </div>
          ) : (
            d.hasData ? (
              <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <CheckCircle className="size-5 text-success" aria-hidden />
                Tidak ada anomali. Periode siap closing.
              </p>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">{noData}</p>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
