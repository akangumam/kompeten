import { MessageSquare, Minus, Search, TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { DirectoryFooter } from '@/components/employees/directory-footer'
import { DetailSheet } from '@/components/payroll/run/detail-sheet'
import { BackButton, Blocked, RunTotals, StepFooter, idr, pctText, type StepProps } from '@/components/payroll/run/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { periodById, setCheck, submitRun, totalsOf, uncheckedCount, type PayRow, type Totals } from '@/data/payroll/runs'

const head = 'text-xs font-medium text-muted-foreground'
type Pill = 'all' | 'flag' | 'rek'

export function StepReview(props: StepProps & { rows: PayRow[]; prevTotals?: Totals; stale: boolean }) {
  const { run, period, officer, rows, prevTotals, stale } = props
  const [pill, setPill] = useState<Pill>('all')
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [input])
  useEffect(() => setPage(1), [pill, q, perPage])

  const flagged = rows.filter((r) => r.flagged)
  const noRek = rows.filter((r) => !r.rekeningAda)
  const list = useMemo(
    () => rows.filter((r) => (pill === 'all' || (pill === 'flag' ? r.flagged : !r.rekeningAda)) && (!q || `${r.nama} ${r.nik}`.toLowerCase().includes(q))),
    [rows, pill, q],
  )
  const totalPages = Math.max(1, Math.ceil(list.length / perPage))
  const cur = Math.min(page, totalPages)
  const start = (cur - 1) * perPage
  const pageRows = list.slice(start, start + perPage)
  const unchecked = uncheckedCount(run)
  const canCheck = officer && run.status === 'draft'
  const prevLabel = period.prev ? periodById(period.prev).label : undefined
  const submitReason = stale ? 'Draft belum memuat komponen insidental terbaru. Tarik ulang dulu.' : unchecked > 0 ? `${unchecked} baris ditandai belum dicek` : null
  const checkedInList = list.filter((r) => run.checks[r.nik]?.checked).length
  const detail = rows.find((r) => r.nik === open)

  return (
    <div className="space-y-4">
      {run.rejected && officer && run.status === 'draft' && (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertTitle>Payroll ditolak oleh {run.rejected.by}</AlertTitle>
          <AlertDescription>
            {run.rejected.at}. Alasan: {run.rejected.alasan}
          </AlertDescription>
        </Alert>
      )}
      {stale && (
        <Alert variant="warning">
          <AlertDescription>Komponen insidental berubah setelah draft dibuat. Kembali ke langkah 3 dan tarik ulang.</AlertDescription>
        </Alert>
      )}

      <RunTotals totals={totalsOf(rows)} prev={prevTotals} prevLabel={prevLabel} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={pill} onValueChange={(v) => setPill(v as Pill)}>
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="all">Semua ({rows.length.toLocaleString('id-ID')})</TabsTrigger>
            <TabsTrigger value="flag">Ditandai ({flagged.length})</TabsTrigger>
            <TabsTrigger value="rek">Rekening belum ada ({noRek.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Cari pegawai" placeholder="Cari nama atau NIP…" className="pl-9" value={input} onChange={(e) => setInput(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Ditandai bila neto berubah lebih dari 10% atau lembur/Alfa/Izin berubah ≥ 5% dari neto bulan lalu. Setiap baris ditandai wajib dicek sebelum diajukan.
      </p>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={`sticky left-0 z-10 bg-card ${head}`}>Pegawai</TableHead>
            <TableHead className={`text-right ${head}`}>Hari hadir</TableHead>
            <TableHead className={`text-right ${head}`}>Pendapatan</TableHead>
            <TableHead className={`text-right ${head}`}>Potongan</TableHead>
            <TableHead className={`text-right ${head}`}>PPh 21</TableHead>
            <TableHead className={`text-right ${head}`}>Neto</TableHead>
            <TableHead className={`text-right ${head}`}>Neto {prevLabel?.split(' ')[0] ?? 'lalu'}</TableHead>
            <TableHead className={head}>Selisih</TableHead>
            <TableHead className={head}>
              {pill === 'flag' && canCheck && list.length > 0 ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="cek-semua"
                    aria-label="Tandai semua sudah dicek"
                    checked={checkedInList === list.length ? true : checkedInList > 0 ? 'indeterminate' : false}
                    onCheckedChange={(v) => list.forEach((r) => setCheck(run.id, r.nik, v === true))}
                  />
                  <label htmlFor="cek-semua" className="cursor-pointer whitespace-nowrap">Tandai semua sudah dicek</label>
                </div>
              ) : (
                'Cek'
              )}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">Tidak ada baris yang sesuai.</TableCell>
            </TableRow>
          )}
          {pageRows.map((r) => {
            const chk = run.checks[r.nik]
            const dp = r.deltaPct ?? 0
            const Trend = Math.abs(dp) < 0.05 ? Minus : dp > 0 ? TrendingUp : TrendingDown
            return (
              <TableRow
                key={r.nik}
                tabIndex={0}
                onClick={() => setOpen(r.nik)}
                onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === 'Enter') setOpen(r.nik) }}
                className="group h-12 cursor-pointer outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring"
              >
                <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted">
                  <div className="flex flex-col leading-tight">
                    <span className="whitespace-nowrap font-medium">{r.nama}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{r.nik}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.hadir}</TableCell>
                <TableCell className="text-right tabular-nums">{idr(r.pendapatan)}</TableCell>
                <TableCell className="text-right tabular-nums">{idr(r.potongan)}</TableCell>
                <TableCell className="text-right tabular-nums">{idr(r.pph)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{idr(r.neto)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{r.prevNeto !== undefined ? idr(r.prevNeto) : '—'}</TableCell>
                <TableCell>
                  {r.deltaPct === undefined ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-col items-start gap-1">
                      <span className="inline-flex items-center gap-1 text-sm tabular-nums"><Trend className="size-3.5 text-muted-foreground" aria-hidden />{pctText(r.deltaPct)}</span>
                      {r.flagged && (
                        <div className="flex flex-wrap gap-1">
                          <StatusBadge variant="warning"><TriangleAlert aria-hidden />Ditandai</StatusBadge>
                          {r.reasons.map((x) => <StatusBadge key={x} variant="neutral">{x}</StatusBadge>)}
                        </div>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                  <div className="flex flex-col items-start gap-1">
                    {r.flagged &&
                      (canCheck ? (
                        <div className="flex items-center gap-1">
                          <Checkbox aria-label={`Sudah dicek ${r.nama}`} checked={!!chk?.checked} onCheckedChange={(v) => setCheck(run.id, r.nik, v === true)} />
                          <span className="text-xs">Sudah dicek</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8" aria-label={`Catatan ${r.nama}`}><MessageSquare className={`size-4 ${chk?.note ? 'text-foreground' : 'text-muted-foreground'}`} /></Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-72 space-y-2">
                              <Textarea aria-label="Catatan pengecekan" placeholder="Catatan (opsional)" value={chk?.note ?? ''} onChange={(e) => setCheck(run.id, r.nik, !!chk?.checked, e.target.value)} />
                            </PopoverContent>
                          </Popover>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{chk?.checked ? 'Sudah dicek' : 'Belum dicek'}</span>
                      ))}
                    {!r.rekeningAda && <StatusBadge variant="warning"><TriangleAlert aria-hidden />Rekening belum ada</StatusBadge>}
                    {!r.flagged && r.rekeningAda && <span className="text-muted-foreground">—</span>}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <div className="-mx-6 -mb-2">
        <DirectoryFooter total={list.length} start={start} perPage={perPage} current={cur} totalPages={totalPages} onPerPage={setPerPage} onPage={setPage} />
      </div>

      {canCheck && (
        <StepFooter left={<BackButton step={4} onGo={props.onGo} />}>
          <Blocked reason={submitReason}>
            <Button
              disabled={!!submitReason}
              onClick={() => {
                submitRun(run.id, props.user.nama)
                toast.success(`Payroll ${period.label} diajukan ke Lestari Wulandari`)
                props.onGo(5)
              }}
            >
              Ajukan Approval
            </Button>
          </Blocked>
        </StepFooter>
      )}
      {detail && <DetailSheet row={detail} run={run} canCheck={canCheck} onClose={() => setOpen(null)} onNavigate={props.onNavigate} />}
    </div>
  )
}
