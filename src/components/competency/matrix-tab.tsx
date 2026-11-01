import { TriangleAlert } from 'lucide-react'
import { Fragment } from 'react'
import { AssessBadge, GapCell, GapLegend, dec1, pctText } from '@/components/competency/shared'
import { PersonCell } from '@/components/payroll/pay/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { scoreOfRow, standardFor, statusOf, type CompRow } from '@/data/competency/assessments'
import { CATEGORIES, targetsList } from '@/data/master/competencies'
import { cn } from '@/lib/utils'

const head = 'text-xs font-medium text-muted-foreground'

/** Heatmap kompetensi: baris pegawai, kolom kompetensi standar posisi, sel diwarnai menurut gap. */
export function MatrixTab({ rows, posisi, periodId, periodLabel, onOpen }: { rows: CompRow[]; posisi: string; periodId: string; periodLabel: string; onOpen: (r: CompRow) => void }) {
  const std = standardFor(posisi, periodId)
  if (!std) {
    return (
      <Alert variant="warning">
        <TriangleAlert aria-hidden />
        <AlertDescription>Standar belum diatur untuk posisi {posisi}. Admin HRD mengaturnya di Data Master › Kompetensi.</AlertDescription>
      </Alert>
    )
  }
  const scores = rows.map((r) => ({ r, sc: scoreOfRow(r, periodId) }))
  // Kolom = standar periode ini ditambah kompetensi dari snapshot penilaian Final (bila standar berubah sesudahnya).
  const kodes = new Set([...Object.keys(std.targets), ...scores.flatMap((s) => s.sc.items.map((i) => i.kode))])
  const targetOf = (k: string) => std.targets[k] ?? scores.flatMap((x) => x.sc.items).find((i) => i.kode === k)?.target ?? 0
  const cols = targetsList(Object.fromEntries([...kodes].map((k) => [k, targetOf(k)])))
  const groups = CATEGORIES.map((cat) => ({ cat, n: cols.filter((c) => c.comp.kategori === cat).length })).filter((g) => g.n > 0)
  const avgLevel = (kode: string) => {
    const v = scores.map((s) => s.sc.items.find((i) => i.kode === kode)?.level).filter((x): x is number => x != null)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }
  const pcts = scores.map((s) => s.sc.pct).filter((x): x is number => x != null)
  const avgPct = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matrix kompetensi {posisi}</CardTitle>
        <CardDescription>
          {periodLabel} · {rows.length} pegawai · {cols.length} kompetensi standar. Angka = level aktual; arahkan kursor ke kode kompetensi untuk nama dan target.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GapLegend />
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Tidak ada pegawai pada posisi ini di cakupan Anda.</p>
        ) : (
          <div>
            <Table className="border-separate border-spacing-0">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead rowSpan={2} className={cn(head, 'sticky left-0 z-10 min-w-44 border-r bg-card align-bottom')}>Pegawai</TableHead>
                  {groups.map((g) => (
                    <TableHead key={g.cat} colSpan={g.n} className={cn(head, 'border-b border-l bg-muted/40 text-center')}>{g.cat}</TableHead>
                  ))}
                  <TableHead rowSpan={2} className={cn(head, 'sticky right-0 z-10 min-w-24 border-l bg-card text-center align-bottom')}>Pemenuhan</TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  {cols.map((c, i) => (
                    <TableHead key={c.kode} className={cn(head, 'px-1 text-center', (i === 0 || cols[i - 1].comp.kategori !== c.comp.kategori) && 'border-l')}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="rounded-sm px-0.5 text-xs font-medium tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{c.kode}</button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{c.comp.nama}</p>
                          <p>Target level {c.target}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {scores.map(({ r, sc }) => (
                  <TableRow key={r.emp.nik} className="group cursor-pointer" onClick={() => onOpen(r)}>
                    <TableCell className="sticky left-0 z-10 border-r bg-card group-hover:bg-muted">
                      <PersonCell nama={r.emp.nama} nik={r.emp.nik} extra={<AssessBadge status={statusOf(r)} />} />
                    </TableCell>
                    {cols.map((c, i) => {
                      const it = sc.items.find((x) => x.kode === c.kode)
                      return (
                        <TableCell key={c.kode} className={cn('px-1 py-1.5', (i === 0 || cols[i - 1].comp.kategori !== c.comp.kategori) && 'border-l')}>
                          {it ? <GapCell target={it.target} level={it.level} /> : <span className="block text-center text-xs text-muted-foreground" title="Tidak ada dalam standar penilaian ini">n/a</span>}
                        </TableCell>
                      )
                    })}
                    <TableCell className="sticky right-0 z-10 border-l bg-card text-center font-semibold tabular-nums group-hover:bg-muted">{pctText(sc.pct)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell className="sticky left-0 z-10 border-r bg-muted text-sm font-semibold">Rata-rata level</TableCell>
                  {cols.map((c, i) => {
                    const a = avgLevel(c.kode)
                    return (
                      <TableCell key={c.kode} className={cn('px-1 text-center text-sm tabular-nums', (i === 0 || cols[i - 1].comp.kategori !== c.comp.kategori) && 'border-l')}>
                        <Fragment>
                          <span className="font-semibold">{a == null ? '—' : dec1(a)}</span>
                          <span className="block text-xs text-muted-foreground">target {c.target}</span>
                        </Fragment>
                      </TableCell>
                    )
                  })}
                  <TableCell className="sticky right-0 z-10 border-l bg-muted text-center font-semibold tabular-nums">{pctText(avgPct)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
