import { BarChartSimple, ChartCard } from '@/components/charts'
import { dec1 } from '@/components/competency/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ChartConfig } from '@/components/ui/chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { scoreOfRow, statusOf, type CompRow } from '@/data/competency/assessments'

const head = 'text-xs font-medium text-muted-foreground'
const config = { pegawai: { label: 'Pegawai bergap', color: 'var(--chart-1)' } } satisfies ChartConfig

export type GapRow = { kode: string; nama: string; target: number; pegawai: number; rataGap: number }

/** Rekap gap per kompetensi dari penilaian yang sudah Diajukan atau Final (Draft dan Belum dinilai tidak dihitung). */
export function gapRecap(rows: CompRow[], periodId: string, namaOf: (kode: string) => string): GapRow[] {
  const map = new Map<string, { target: number; gaps: number[] }>()
  for (const r of rows) {
    const st = statusOf(r)
    if (st !== 'diajukan' && st !== 'final') continue
    for (const it of scoreOfRow(r, periodId).items) {
      const e = map.get(it.kode) ?? { target: it.target, gaps: [] }
      if (it.gap != null && it.gap >= 1) e.gaps.push(it.gap)
      map.set(it.kode, e)
    }
  }
  return [...map.entries()]
    .map(([kode, e]) => ({ kode, nama: namaOf(kode), target: e.target, pegawai: e.gaps.length, rataGap: e.gaps.length ? e.gaps.reduce((a, b) => a + b, 0) / e.gaps.length : 0 }))
    .sort((a, b) => b.pegawai - a.pegawai || b.rataGap - a.rataGap || a.kode.localeCompare(b.kode))
}

export function GapTab({ recap, posisi, periodLabel, onRecommend }: { recap: GapRow[]; posisi: string; periodLabel: string; onRecommend: (g: GapRow) => void }) {
  if (recap.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">Belum ada penilaian yang diajukan untuk {posisi} pada {periodLabel}.</CardContent>
      </Card>
    )
  }
  return (
    <div className="space-y-6">
      <ChartCard title="Gap terbanyak per kompetensi" description={`Jumlah pegawai ${posisi} dengan gap ≥ 1 · ${periodLabel}`}>
        <BarChartSimple data={recap} dataKey="pegawai" categoryKey="nama" config={config} layout="horizontal" unit="pegawai" height={recap.length * 40 + 16} />
      </ChartCard>
      <Card>
        <CardHeader>
          <CardTitle>Rincian gap</CardTitle>
          <CardDescription>Rata-rata gap dihitung dari pegawai yang bergap pada kompetensi tersebut</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Kompetensi</TableHead>
                <TableHead className={`text-right ${head}`}>Target</TableHead>
                <TableHead className={`text-right ${head}`}>Pegawai gap</TableHead>
                <TableHead className={`text-right ${head}`}>Rata-rata gap</TableHead>
                <TableHead className={`text-right ${head}`}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recap.map((g) => (
                <TableRow key={g.kode} className="h-12">
                  <TableCell><span className="font-medium">{g.nama}</span> <span className="text-xs tabular-nums text-muted-foreground">{g.kode}</span></TableCell>
                  <TableCell className="text-right tabular-nums">{g.target}</TableCell>
                  <TableCell className="text-right tabular-nums">{g.pegawai}</TableCell>
                  <TableCell className="text-right tabular-nums">{g.pegawai ? dec1(g.rataGap) : '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" disabled={g.pegawai === 0} onClick={() => onRecommend(g)}>Rekomendasi training</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
