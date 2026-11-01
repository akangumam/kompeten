import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { KpiStatusBadge, PredikatBadge, n1 } from '@/components/kpi/shared'
import { KPI_RECORDS, monthIds, monthLabel, useKpi } from '@/data/kpi/records'
import { DEMO_TODAY } from '@/lib/today'

const head = 'text-xs font-medium text-muted-foreground'

/** Bagian KPI di Profil › Pengembangan: nilai bulanan Disetujui tahun berjalan, rata-rata, dan predikat. Terpisah dari Kompetensi. */
export function KpiSection({ nik }: { nik: string }) {
  useKpi()
  const tahun = Number(DEMO_TODAY.slice(0, 4))
  const months = monthIds(tahun).map((m) => ({ m, rec: KPI_RECORDS.find((r) => r.nik === nik && r.bulan === m) }))
  const nilai = months.flatMap((x) => (x.rec?.status === 'disetujui' && x.rec.nilai != null ? [x.rec.nilai] : []))
  const avg = nilai.length ? nilai.reduce((a, b) => a + b, 0) / nilai.length : null
  return (
    <Card>
      <CardHeader>
        <CardTitle>KPI {tahun}</CardTitle>
        <CardDescription>Nilai bulanan yang sudah Disetujui. Skor KPI terpisah dari level kompetensi.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm tabular-nums">
          <span className="text-muted-foreground">Rata-rata {tahun}</span>
          <b className="text-lg">{avg == null ? '—' : n1(avg)}</b>
          <PredikatBadge nilai={avg} />
          <span className="text-muted-foreground">· {nilai.length} bulan disetujui</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={head}>Bulan</TableHead>
              <TableHead className={`text-right ${head}`}>Nilai</TableHead>
              <TableHead className={head}>Predikat</TableHead>
              <TableHead className={head}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {months.map(({ m, rec }) => (
              <TableRow key={m} className="h-10">
                <TableCell>{monthLabel(m)}</TableCell>
                <TableCell className="text-right tabular-nums">{rec?.status === 'disetujui' && rec.nilai != null ? n1(rec.nilai) : '—'}</TableCell>
                <TableCell><PredikatBadge nilai={rec?.status === 'disetujui' ? rec.nilai : null} /></TableCell>
                <TableCell>{rec ? <KpiStatusBadge status={rec.status} /> : <span className="text-muted-foreground">—</span>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
