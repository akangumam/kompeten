import { Download } from 'lucide-react'
import { BarChartSimple, ChartCard, LineChartCompare } from '@/components/charts'
import { PredikatBadge, n1 } from '@/components/kpi/shared'
import { PersonCell, download } from '@/components/payroll/pay/shared'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ChartConfig } from '@/components/ui/chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { KPI_RECORDS, MONTHS_SHORT, monthIds, type KpiRow } from '@/data/kpi/records'
import { ROSTER } from '@/data/employees'
import { orgById } from '@/data/master/organization'
import { cn } from '@/lib/utils'

const head = 'text-xs font-medium text-muted-foreground'
const cmpConfig = { y2026: { label: '2026', color: 'var(--chart-1)' }, y2025: { label: '2025', color: 'var(--chart-2)' } } satisfies ChartConfig
const secConfig = { nilai: { label: 'Rata-rata nilai', color: 'var(--chart-1)' } } satisfies ChartConfig

/** Nilai bulanan yang sudah Disetujui (terkunci); bulan tanpa data = null (bukan 0). */
const nilaiOf = (nik: string, bulan: string) => {
  const r = KPI_RECORDS.find((x) => x.nik === nik && x.bulan === bulan)
  return r?.status === 'disetujui' && r.nilai != null ? r.nilai : null
}
const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }

export function ReportTab({ rows, tahun, posisi, department }: { rows: KpiRow[]; tahun: number; posisi: string; department: string }) {
  const months = monthIds(tahun)
  const data = rows.map((r) => {
    const vals = months.map((m) => nilaiOf(r.emp.nik, m))
    return { r, vals, avg: avg(vals) }
  })
  const trend = MONTHS_SHORT.map((b, i) => ({
    bulan: b,
    y2026: avg(rows.map((r) => nilaiOf(r.emp.nik, months[i]))),
    y2025: avg(rows.map((r) => nilaiOf(r.emp.nik, `${tahun - 1}-${String(i + 1).padStart(2, '0')}`))),
  }))
  // Rata-rata per Section: semua pegawai di department terpilih yang punya KPI Disetujui pada tahun itu.
  const sec = new Map<string, number[]>()
  for (const e of ROSTER) {
    if (e.department !== department) continue
    const a = avg(months.map((m) => nilaiOf(e.nik, m)))
    if (a == null) continue
    const name = orgById(e.sec)?.nama ?? e.section ?? department
    sec.set(name, [...(sec.get(name) ?? []), a])
  }
  const bySection = [...sec.entries()].map(([section, v]) => ({ section, nilai: Math.round(avg(v)! * 10) / 10 })).sort((a, b) => b.nilai - a.nilai)

  const csv = () => {
    const lines = [['NIP', 'Nama', 'Posisi', ...MONTHS_SHORT, 'Rata-rata'].join(',')]
    for (const d of data) lines.push([d.r.emp.nik, `"${d.r.emp.nama}"`, d.r.posisi, ...d.vals.map((v) => (v == null ? '' : v.toFixed(1))), d.avg == null ? '' : d.avg.toFixed(1)].join(','))
    download(`laporan-kpi-${posisi.replace(/\s+/g, '-').toLowerCase()}-${tahun}.csv`, lines.join('\r\n'))
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Rata-rata nilai per bulan" description={`${posisi} · ${tahun} dibanding ${tahun - 1}; bulan yang belum terjadi tidak digambar`}>
          <LineChartCompare data={trend} categoryKey="bulan" config={cmpConfig} height={260} valueFormatter={n1} series={[{ key: 'y2025', dashed: true }, { key: 'y2026', dots: true }]} />
        </ChartCard>
        <ChartCard title="Rata-rata nilai per Section" description={`Department ${department} · KPI Disetujui ${tahun}`}>
          {bySection.length ? <BarChartSimple data={bySection} dataKey="nilai" categoryKey="section" config={secConfig} layout="horizontal" height={Math.max(160, bySection.length * 44)} valueFormatter={n1} /> : <p className="py-10 text-center text-sm text-muted-foreground">Belum ada KPI Disetujui pada department ini.</p>}
        </ChartCard>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Laporan tahunan {tahun}</CardTitle>
          <CardDescription>Nilai KPI Disetujui per bulan; "—" = belum ada data</CardDescription>
          <CardAction className="self-center"><Button variant="outline" onClick={csv}><Download />Unduh CSV</Button></CardAction>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto"><Table className="border-separate border-spacing-0">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(head, 'sticky left-0 z-10 min-w-48 border-r bg-card')}>Pegawai</TableHead>
                {MONTHS_SHORT.map((b) => <TableHead key={b} className={cn(head, 'px-0.5 text-center')}>{b}</TableHead>)}
                <TableHead className={cn(head, 'min-w-24 border-l px-1 text-center')}>Rata-rata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={14} className="h-24 text-center text-sm text-muted-foreground">Tidak ada pegawai pada posisi ini di cakupan Anda.</TableCell></TableRow>}
              {data.map(({ r, vals, avg: a }) => (
                <TableRow key={r.emp.nik} className="group h-12">
                  <TableCell className="sticky left-0 z-10 border-r bg-card group-hover:bg-muted"><PersonCell nama={r.emp.nama} nik={r.emp.nik} /></TableCell>
                  {vals.map((v, i) => <TableCell key={i} className="px-0.5 text-center">{v == null ? <span className="text-muted-foreground">—</span> : <PredikatBadge nilai={v} compact />}</TableCell>)}
                  <TableCell className="border-l px-1 text-center">{a == null ? <span className="text-muted-foreground">—</span> : <PredikatBadge nilai={a} compact />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        </CardContent>
      </Card>
    </div>
  )
}
