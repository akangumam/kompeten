import { AlertTriangle, CheckCircle, Clock, TrendingDown, TrendingUp, UserCheck, Thermometer } from 'lucide-react'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Line, LineChart, XAxis, YAxis } from 'recharts'
import { KpiCard, num, pct } from '@/components/dashboard/kpi-card'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
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

function Trend({ delta, unit, good }: { delta: number | null; unit: string; good: 'up' | 'down' }) {
  if (delta == null) return <span>Belum ada pembanding periode lalu</span>
  if (Math.abs(delta) < 0.05) return <span>Sama dengan periode lalu</span>
  const up = delta > 0
  const ok = (good === 'up') === up
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={cn('flex items-center gap-1.5', ok ? 'text-success' : 'text-danger')}>
      <Icon className="size-4" aria-hidden />
      {up ? '+' : '−'}{Math.abs(delta).toLocaleString('id-ID', { maximumFractionDigits: 1 })} {unit} vs periode lalu
    </span>
  )
}

const weekConfig = { cur: { label: 'Minggu ini', color: 'var(--chart-1)' }, prev: { label: 'Minggu lalu (hari yang sama)', color: 'var(--chart-2)' } } satisfies ChartConfig
function WeekTooltip({ active, payload }: { active?: boolean; payload?: { payload: DayPoint }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const row = (label: string, color: string, v: number | null) => (
    <div className="flex items-center gap-2">
      <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium tabular-nums">{v == null ? '—' : pct(v)}</span>
    </div>
  )
  return (
    <div className="grid min-w-52 gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{formatDate(d.tanggal)}</div>
      {row('Minggu ini', 'var(--chart-1)', d.cur)}
      {row('Minggu lalu', 'var(--chart-2)', d.prev)}
      <div className="grid gap-1 border-t pt-1.5 tabular-nums">
        <span>Hadir <b>{d.hadir}</b> dari <b>{d.terjadwal}</b> terjadwal</span>
        <span className="text-muted-foreground">Sakit {d.sakit} · Izin {d.izin} · Cuti {d.cuti} · Alfa {d.alfa}</span>
      </div>
    </div>
  )
}

const monthConfig = { pegawai: { label: 'Pegawai sakit', color: 'var(--chart-1)' }, hari: { label: 'Hari sakit', color: 'var(--chart-2)' } } satisfies ChartConfig

function DeptBars({ data, empty }: { data: DeptBar[]; empty: string }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p>
  const config = { value: { label: 'Jumlah', color: 'var(--chart-1)' } } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(140, data.length * 38 + 16) }}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 28, top: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="dept" tickLine={false} axisLine={false} width={112} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={4} barSize={20}>
          <LabelList dataKey="value" position="right" className="fill-foreground text-xs" />
        </Bar>
      </BarChart>
    </ChartContainer>
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
        <KpiCard
          label="Tingkat kehadiran"
          icon={UserCheck}
          iconClass="text-success"
          value={d.rate == null ? '—' : pct(d.rate)}
          hint={d.hasData ? <><span className="tabular-nums">{num(d.present)} dari {num(d.terjadwal)} orang-hari terjadwal</span><div className="mt-1"><Trend delta={d.rateDelta} unit="poin" good="up" /></div></> : noData}
        />
        <KpiCard
          label="Pegawai sakit"
          icon={Thermometer}
          iconClass="text-info"
          value={num(d.sickPeople)}
          hint={<span className="tabular-nums">{num(d.sickDays)} hari sakit</span>}
        />
        <KpiCard
          label="Keterlambatan"
          icon={Clock}
          iconClass="text-warning"
          value={d.hasData ? num(d.telat) : '—'}
          hint={d.hasData ? <><span>kejadian terlambat</span><div className="mt-1"><Trend delta={d.telatDelta} unit="kejadian" good="down" /></div></> : noData}
        />
        <KpiCard
          label="Anomali belum selesai"
          icon={AlertTriangle}
          iconClass="text-danger"
          value={d.hasData ? num(d.anomali) : '—'}
          hint={d.hasData ? (d.anomali ? 'Perlu diselesaikan sebelum closing' : 'Periode siap closing') : noData}
          footer={<button type="button" className="font-medium text-primary underline underline-offset-4 hover:no-underline" onClick={() => onNavigate('attendance')}>Buka Absensi Harian</button>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Kehadiran 7 hari terakhir</CardTitle>
            <CardDescription>
              {d.weekEnd ? `Hari kerja terakhir dengan data absensi, s/d ${formatDate(d.weekEnd)}. Garis putus: hari yang sama minggu lalu.` : 'Belum ada data absensi'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {d.week.length ? (
              <ChartContainer config={weekConfig} className="aspect-auto h-[280px] w-full">
                <LineChart data={d.week} margin={{ left: 0, right: 28, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: 'var(--muted-foreground)' }} />
                  <YAxis domain={[(m: number) => Math.max(0, Math.floor(m / 5) * 5 - 5), 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={44} tick={{ fill: 'var(--muted-foreground)' }} />
                  <ChartTooltip content={<WeekTooltip />} />
                  <Line dataKey="prev" type="linear" stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: 'var(--chart-2)' }} connectNulls={false} />
                  <Line dataKey="cur" type="linear" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--chart-1)' }} connectNulls={false} />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">{noData}</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Sakit per bulan 2026</CardTitle>
            <CardDescription>
              Batang: pegawai sakit. Garis: hari sakit, per periode absensi.{monthlyEmptyBefore ? ' Data absensi tersedia mulai periode Oktober 2026.' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthConfig} className="aspect-auto h-[280px] w-full">
              <ComposedChart data={d.monthly} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="bulan" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: 'var(--muted-foreground)' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} tick={{ fill: 'var(--muted-foreground)' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="pegawai" fill="var(--color-pegawai)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line dataKey="hari" type="monotone" stroke="var(--color-hari)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-hari)' }} />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
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
