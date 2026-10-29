import { CircleCheck, Download, Mail, MessageCircle, MoreHorizontal, Search, Send, TriangleAlert, FileText, Clock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { PageId } from '@/App'
import { DirectoryFooter } from '@/components/employees/directory-footer'
import { download, GoRun, GroupSelect, KPI_GRID, NotFinal, PageHeader, PeriodSelect, PersonCell, StatCard, idr, type GroupFilter } from '@/components/payroll/pay/shared'
import { SlipDialog } from '@/components/payroll/slips/slip-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { defaultPeriod, isFinal, periodRows, sendSlips, slipOf, vendorCsv, type SlipStatus } from '@/data/payroll/disbursement'
import { periodById, type PayRow, type PeriodId, type RunCtx } from '@/data/payroll/runs'
import { usePayroll } from '@/data/payroll/store'
import type { CurrentUser } from '@/data/users'

const head = 'text-xs font-medium text-muted-foreground'
const ALL = 'all'
type Pill = 'all' | SlipStatus

type Props = { user: CurrentUser; ctx: RunCtx; initialPeriod?: PeriodId; onNavigate: (page: PageId) => void }

export default function PayslipsPage({ user, ctx, initialPeriod, onNavigate }: Props) {
  usePayroll()
  const [periodId, setPeriodId] = useState<PeriodId>(initialPeriod ?? defaultPeriod())
  const period = periodById(periodId)
  const final = isFinal(periodId)
  const [group, setGroup] = useState<GroupFilter>('all')
  const rows = useMemo(() => (final ? periodRows(periodId, ctx).filter((r) => group === 'all' || r.kelompok === group) : []), [final, periodId, ctx, group])
  const vendorRows = rows.filter((r) => r.vendor)
  const canSend = user.role === 'payroll'

  const [pill, setPill] = useState<Pill>('all')
  const [dept, setDept] = useState(ALL)
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<PayRow | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [input])
  useEffect(() => setPage(1), [pill, dept, q, perPage, periodId])

  const status = (r: PayRow) => slipOf(periodId, r.nik).status
  const count = (s: SlipStatus) => rows.filter((r) => !r.vendor && status(r) === s).length
  const nBelum = count('belum')
  const nTerkirim = count('terkirim')
  const nGagal = count('gagal')
  const pending = rows.filter((r) => !r.vendor && status(r) !== 'terkirim')
  const departments = useMemo(() => [...new Set(rows.map((r) => r.department))].sort((a, b) => a.localeCompare(b, 'id')), [rows])

  const list = rows.filter((r) => (pill === 'all' || (!r.vendor && status(r) === pill)) && (dept === ALL || r.department === dept) && (!q || `${r.nama} ${r.nik}`.toLowerCase().includes(q)))
  const totalPages = Math.max(1, Math.ceil(list.length / perPage))
  const cur = Math.min(page, totalPages)
  const start = (cur - 1) * perPage
  const pageRows = list.slice(start, start + perPage)

  // Pengiriman disimulasikan dengan progres singkat; hasil dicatat setelah selesai.
  const run = (niks: string[]) => {
    setProgress(0)
    let p = 0
    const t = setInterval(() => {
      p += 10
      setProgress(Math.min(p, 100))
      if (p >= 100) {
        clearInterval(t)
        const res = sendSlips(periodId, niks)
        setProgress(null)
        setConfirm(false)
        if (res.gagal) toast.warning(`${res.ok} slip terkirim, ${res.gagal} gagal`)
        else toast.success(`${res.ok} slip terkirim lewat email dan WhatsApp`)
      }
    }, 120)
  }
  const resend = (r: PayRow) => {
    sendSlips(periodId, [r.nik])
    toast.success(`Slip ${r.nama} dikirim ulang`)
  }

  const sendBtn = (
    <Button disabled={!canSend || pending.length === 0} onClick={() => setConfirm(true)}>
      <Send /> Kirim Slip
    </Button>
  )

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Slip Gaji" subtitle="Slip gaji per pegawai untuk periode yang sudah final">
        <PeriodSelect value={periodId} onChange={setPeriodId} />
        <GroupSelect value={group} onChange={setGroup} />
      </PageHeader>

      {!final ? (
        <NotFinal title={`Slip terbit setelah payroll ${period.label} difinalisasi`} action={<GoRun onClick={() => onNavigate('payroll-run')} />} />
      ) : (
        <>
          {!canSend && (
            <Alert variant="info">
              <AlertDescription>Mode baca. Slip dikirim oleh Payroll Officer.</AlertDescription>
            </Alert>
          )}

          <div className={KPI_GRID}>
            <StatCard label="Slip terbit" value={rows.length.toLocaleString('id-ID')} icon={FileText} hint={`Payroll ${period.label} final`} />
            <StatCard label="Terkirim" value={nTerkirim.toLocaleString('id-ID')} icon={CircleCheck} iconClass="text-success" hint="Email dan WhatsApp" />
            <StatCard label="Gagal kirim" value={nGagal.toLocaleString('id-ID')} icon={TriangleAlert} iconClass="text-danger" hint="Perlu kontak diperbarui" />
            <StatCard label="Belum dikirim" value={nBelum.toLocaleString('id-ID')} icon={Clock} iconClass="text-warning" hint="Menunggu pengiriman" />
          </div>

          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs value={pill} onValueChange={(v) => setPill(v as Pill)}>
                  <TabsList className="h-auto flex-wrap justify-start">
                    <TabsTrigger value="all">Semua ({rows.length.toLocaleString('id-ID')})</TabsTrigger>
                    <TabsTrigger value="belum">Belum dikirim ({nBelum})</TabsTrigger>
                    <TabsTrigger value="terkirim">Terkirim ({nTerkirim.toLocaleString('id-ID')})</TabsTrigger>
                    <TabsTrigger value="gagal">Gagal ({nGagal})</TabsTrigger>
                  </TabsList>
                </Tabs>
                {vendorRows.length > 0 && (
                  <Button variant="outline" onClick={() => { const c = vendorCsv(periodId, vendorRows); download(c.name, c.text); toast.success(`${c.name} diunduh`) }}>
                    <Download /> Rincian ke vendor
                  </Button>
                )}
                {canSend && !(rows.length > 0 && rows.every((r) => r.vendor)) &&
                  (pending.length === 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild><span tabIndex={0} className="inline-flex rounded-md outline-none">{sendBtn}</span></TooltipTrigger>
                      <TooltipContent>Semua slip sudah terkirim</TooltipContent>
                    </Tooltip>
                  ) : (
                    sendBtn
                  ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
                <div className="relative w-full shrink-0 sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input aria-label="Cari pegawai" placeholder="Cari nama atau NIP…" className="pl-9" value={input} onChange={(e) => setInput(e.target.value)} />
                </div>
                <Select value={dept} onValueChange={setDept}>
                  <SelectTrigger aria-label="Department" className="w-full sm:w-52"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Semua Department</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" className="shrink-0" disabled={dept === ALL && !input} onClick={() => { setDept(ALL); setInput(''); setPill('all') }}>Reset</Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={head}>Pegawai</TableHead>
                    <TableHead className={head}>Department · Posisi</TableHead>
                    <TableHead className={`text-right ${head}`}>Neto</TableHead>
                    <TableHead className={head}>Pengiriman</TableHead>
                    <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 && (
                    <TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">Tidak ada slip yang sesuai.</TableCell></TableRow>
                  )}
                  {pageRows.map((r) => {
                    const s = slipOf(periodId, r.nik)
                    return (
                      <TableRow key={r.nik} className="h-12 hover:bg-muted/50">
                        <TableCell><PersonCell nama={r.nama} nik={r.nik} /></TableCell>
                        <TableCell>
                          <div className="flex flex-col leading-tight">
                            <span>{r.department}{r.section ? ` · ${r.section}` : ''}</span>
                            <span className="text-xs text-muted-foreground">{r.posisi}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{idr(r.neto)}</TableCell>
                        <TableCell>
                          {r.vendor && <StatusBadge variant="neutral">Slip oleh vendor</StatusBadge>}
                          {!r.vendor && s.status === 'belum' && <StatusBadge variant="neutral">Belum dikirim</StatusBadge>}
                          {!r.vendor && s.status === 'terkirim' && (
                            <StatusBadge variant="success"><CircleCheck aria-hidden />Terkirim<Mail aria-label="Email" /><MessageCircle aria-label="WhatsApp" /></StatusBadge>
                          )}
                          {!r.vendor && s.status === 'gagal' && (
                            <div className="flex flex-col items-start gap-1">
                              <StatusBadge variant="danger"><TriangleAlert aria-hidden />Gagal</StatusBadge>
                              <span className="text-xs text-muted-foreground">{s.reason}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {!r.vendor && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8" aria-label={`Aksi ${r.nama}`}><MoreHorizontal /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setOpen(r)}>Lihat Slip</DropdownMenuItem>
                                {canSend && <DropdownMenuItem onSelect={() => resend(r)}>Kirim ulang</DropdownMenuItem>}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
            <DirectoryFooter total={list.length} start={start} perPage={perPage} current={cur} totalPages={totalPages} onPerPage={setPerPage} onPage={setPage} />
          </Card>
        </>
      )}

      <SlipDialog row={open} period={period} onClose={() => setOpen(null)} />

      <AlertDialog open={confirm} onOpenChange={(o) => progress === null && setConfirm(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim {pending.length.toLocaleString('id-ID')} slip gaji {period.label} lewat email dan WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              {nGagal > 0 && nBelum === 0 ? 'Hanya slip yang gagal terkirim yang dikirim ulang.' : 'Hanya slip berstatus Belum dikirim dan Gagal yang dikirim.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {progress !== null && (
            <div className="space-y-2" role="status" aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
              <p className="text-xs text-muted-foreground tabular-nums">Mengirim… {progress}%</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={progress !== null}>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={progress !== null} onClick={(e) => { e.preventDefault(); run(pending.map((r) => r.nik)) }}>Kirim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
