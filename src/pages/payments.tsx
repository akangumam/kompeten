import { Ban, Building2, ChevronDown, ChevronUp, CircleCheck, Clock, Download, MoreHorizontal, Search, TriangleAlert, Users, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { PageId } from '@/App'
import { DirectoryFooter } from '@/components/employees/directory-footer'
import { PayDialogs, type PayAction } from '@/components/payroll/pay/payment-dialogs'
import { GoRun, GroupSelect, KPI_GRID, NotFinal, PageHeader, PeriodSelect, PersonCell, StatCard, idr, type GroupFilter } from '@/components/payroll/pay/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  accountUpdated, bankCsv, bankGroups, batchStatus, defaultPeriod, disbOf, isFinal, payItems, payStatus, periodRows, vendorCsv, vendorDeposit, VENDOR,
  type BatchStatus, type PayItem, type PayStatus,
} from '@/data/payroll/disbursement'
import { periodById, totalsOf, type PeriodId, type RunCtx } from '@/data/payroll/runs'
import { usePayroll } from '@/data/payroll/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'

const head = 'text-xs font-medium text-muted-foreground'
type Pill = 'all' | PayStatus

const BATCH_LABEL: Record<BatchStatus, string> = { siap: 'Siap transfer', sebagian: 'Sebagian ditransfer', selesai: 'Selesai' }
const BATCH_VARIANT: Record<BatchStatus, 'info' | 'warning' | 'success'> = { siap: 'info', sebagian: 'warning', selesai: 'success' }

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function PayBadge({ s, note }: { s: PayStatus; note?: string }) {
  return (
    <div className="flex flex-col items-start gap-1">
      {s === 'siap' && <StatusBadge variant="info"><Clock aria-hidden />Siap transfer</StatusBadge>}
      {s === 'ditransfer' && <StatusBadge variant="success"><CircleCheck aria-hidden />Ditransfer</StatusBadge>}
      {s === 'gagal' && <StatusBadge variant="danger"><TriangleAlert aria-hidden />Gagal</StatusBadge>}
      {s === 'ditunda' && <StatusBadge variant="warning"><Ban aria-hidden />Ditunda</StatusBadge>}
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  )
}

type Props = { user: CurrentUser; ctx: RunCtx; initialPeriod?: PeriodId; onNavigate: (page: PageId) => void }

export default function PaymentsPage({ user, ctx, initialPeriod, onNavigate }: Props) {
  usePayroll()
  const [periodId, setPeriodId] = useState<PeriodId>(initialPeriod ?? defaultPeriod())
  const period = periodById(periodId)
  const final = isFinal(periodId)
  const canAct = user.role === 'finance'
  const isOfficer = user.role === 'payroll'

  const [group, setGroup] = useState<GroupFilter>('all')
  const [vendorOpen, setVendorOpen] = useState(false)
  const everyone = useMemo(() => (final ? payItems(periodId, periodRows(periodId, ctx)).filter((i) => group === 'all' || i.row.kelompok === group) : []), [final, periodId, ctx, group])
  // Pegawai Outsourcing tidak masuk file bank: gajinya disetor ke vendor.
  const items = everyone.filter((i) => !i.row.vendor)
  const vendorItems = everyone.filter((i) => i.row.vendor)
  const vendorTotal = vendorItems.reduce((a, i) => a + i.row.neto, 0)
  const groups = bankGroups(periodId, items)
  const st = (it: PayItem) => payStatus(periodId, it)
  const total = totalsOf(items.map((i) => i.row)).neto
  const ditunda = items.filter((i) => !i.nomor)
  const nStatus = (s: PayStatus) => items.filter((i) => st(i) === s).length
  const batch = batchStatus(periodId, everyone)

  const [action, setAction] = useState<PayAction | null>(null)
  const [pill, setPill] = useState<Pill>('all')
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [input])
  useEffect(() => setPage(1), [pill, q, perPage, periodId])

  const list = items.filter((i) => (pill === 'all' || st(i) === pill) && (!q || `${i.row.nama} ${i.row.nik}`.toLowerCase().includes(q)))
  const totalPages = Math.max(1, Math.ceil(list.length / perPage))
  const cur = Math.min(page, totalPages)
  const start = (cur - 1) * perPage
  const pageRows = list.slice(start, start + perPage)

  // Tanggal pembayaran terakhir (untuk pesan Selesai).
  const d = disbOf(periodId)
  const lastDate = [...Object.values(d.batches).map((b) => b.tanggal), ...Object.values(d.rows).flatMap((r) => (r.status === 'ditransfer' ? [r.tanggal] : []))].sort().pop() ?? period.bayar

  const rowActions = (it: PayItem) => {
    const s = st(it)
    const ov = d.rows[it.row.nik]
    const out: { label: string; disabled?: boolean; run: () => void }[] = []
    if (canAct && s === 'ditunda') out.push({ label: 'Bayar manual', run: () => setAction({ kind: 'manual', item: it }) })
    if (canAct && s === 'ditransfer' && !ov) out.push({ label: 'Tandai gagal', run: () => setAction({ kind: 'gagal', item: it }) })
    if (canAct && s === 'gagal') out.push({ label: accountUpdated(periodId, it.row.nik) ? 'Transfer ulang' : 'Transfer ulang (menunggu rekening diperbarui)', disabled: !accountUpdated(periodId, it.row.nik), run: () => setAction({ kind: 'ulang', item: it }) })
    if (isOfficer && s === 'gagal' && !accountUpdated(periodId, it.row.nik)) out.push({ label: 'Perbarui rekening di Komponen Gaji', run: () => onNavigate('payroll-components') })
    return out
  }
  const noteOf = (it: PayItem) => {
    const s = st(it)
    const ov = d.rows[it.row.nik]
    if (s === 'ditunda') return 'Rekening belum ada'
    if (s === 'gagal' && ov?.status === 'gagal') return accountUpdated(periodId, it.row.nik) ? 'Rekening diperbarui' : ov.alasan + (ov.catatan ? ` · ${ov.catatan}` : '')
    if (s === 'ditransfer' && ov?.status === 'ditransfer') return ov.via === 'manual' ? `Bayar manual · ${ov.metode ?? ''}` : 'Transfer ulang'
    return undefined
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Daftar Pembayaran" subtitle={`Transfer gaji ke rekening pegawai · dibayar ${formatDate(period.bayar)}`}>
        <PeriodSelect value={periodId} onChange={setPeriodId} />
        <GroupSelect value={group} onChange={setGroup} />
        {final && <StatusBadge variant={BATCH_VARIANT[batch]}>{BATCH_LABEL[batch]}</StatusBadge>}
      </PageHeader>

      {!final ? (
        <NotFinal title={`Daftar pembayaran tersedia setelah payroll ${period.label} difinalisasi`} action={<GoRun onClick={() => onNavigate('payroll-run')} />} />
      ) : (
        <>
          {!canAct && (
            <Alert variant="info">
              <AlertDescription>Mode baca. Transfer dan pencatatan pembayaran dilakukan oleh Finance (Yohanes Kristanto).</AlertDescription>
            </Alert>
          )}
          {batch === 'selesai' && (
            <Alert variant="success">
              <CircleCheck />
              <AlertDescription>Semua gaji {period.label} sudah dibayar · {formatDate(lastDate)}</AlertDescription>
            </Alert>
          )}

          <div className={KPI_GRID}>
            <StatCard label="Total transfer" value={idr(total + vendorTotal)} icon={Wallet} hint={vendorItems.length ? `Bank ${idr(total)} + vendor ${idr(vendorTotal)}` : 'Total neto payroll final'} />
            <StatCard label="Pegawai" value={everyone.length.toLocaleString('id-ID')} icon={Users} hint={`${(nStatus('ditransfer') + (vendorDeposit(periodId) ? vendorItems.length : 0)).toLocaleString('id-ID')} sudah dibayar`} />
            <StatCard label="Ditunda" value={nStatus('ditunda').toLocaleString('id-ID')} icon={Ban} iconClass="text-warning" hint="Rekening belum ada" />
            <StatCard label="Gagal" value={nStatus('gagal').toLocaleString('id-ID')} icon={TriangleAlert} iconClass="text-danger" hint="Perlu transfer ulang" />
          </div>

          {vendorItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="size-4" aria-hidden />Setor ke Vendor Outsourcing</CardTitle>
                <CardDescription>Gaji pegawai Outsourcing dibayarkan ke vendor, tidak masuk file transfer bank pegawai.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <div><p className="text-xs text-muted-foreground">Vendor</p><p className="text-sm font-medium">{VENDOR.nama}</p></div>
                  <div><p className="text-xs text-muted-foreground">Pegawai</p><p className="text-sm font-medium tabular-nums">{vendorItems.length.toLocaleString('id-ID')} pegawai</p></div>
                  <div><p className="text-xs text-muted-foreground">Total disetor</p><p className="text-sm font-semibold tabular-nums">{idr(vendorTotal)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Rekening vendor</p><p className="text-sm font-medium tabular-nums">{VENDOR.masked}</p></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    {vendorDeposit(periodId)
                      ? <div className="flex flex-col items-start gap-1"><StatusBadge variant="success"><CircleCheck aria-hidden />Disetor</StatusBadge><span className="text-xs tabular-nums text-muted-foreground">{formatDate(vendorDeposit(periodId)!.tanggal)} · Ref. {vendorDeposit(periodId)!.ref}</span></div>
                      : <StatusBadge variant="info"><Clock aria-hidden />Siap disetor</StatusBadge>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" aria-expanded={vendorOpen} onClick={() => setVendorOpen((o) => !o)}>
                    {vendorOpen ? <ChevronUp /> : <ChevronDown />} {vendorOpen ? 'Sembunyikan rincian' : 'Lihat rincian pegawai'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { const c = vendorCsv(periodId, vendorItems.map((i) => i.row)); download(c.name, c.text); toast.success(`${c.name} diunduh`) }}>
                    <Download /> Rincian ke vendor
                  </Button>
                  {canAct && !vendorDeposit(periodId) && <Button size="sm" onClick={() => setAction({ kind: 'vendor', items: vendorItems, total: vendorTotal })}>Tandai Disetor</Button>}
                </div>
                {vendorOpen && (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={head}>Pegawai</TableHead>
                        <TableHead className={head}>Posisi</TableHead>
                        <TableHead className={`text-right ${head}`}>Hari hadir</TableHead>
                        <TableHead className={`text-right ${head}`}>Nominal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendorItems.map((i) => (
                        <TableRow key={i.row.nik} className="h-12 hover:bg-muted/50">
                          <TableCell><PersonCell nama={i.row.nama} nik={i.row.nik} /></TableCell>
                          <TableCell>{i.row.posisi}</TableCell>
                          <TableCell className="text-right tabular-nums">{i.row.hadir}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{idr(i.row.neto)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Per Bank</CardTitle>
              <CardDescription>Satu file transfer per bank. Nomor rekening lengkap hanya ada di file transfer.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={head}>Bank</TableHead>
                    <TableHead className={`text-right ${head}`}>Pegawai</TableHead>
                    <TableHead className={`text-right ${head}`}>Total</TableHead>
                    <TableHead className={head}>File transfer</TableHead>
                    <TableHead className={head}>Status</TableHead>
                    {canAct && <TableHead className={head}>Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((g) => {
                    const csv = bankCsv(periodId, g)
                    const nGagalBank = g.items.filter((i) => st(i) === 'gagal').length
                    return (
                      <TableRow key={g.bank} className="h-12 hover:bg-muted/50">
                        <TableCell className="font-medium">{g.bank}</TableCell>
                        <TableCell className="text-right tabular-nums">{g.items.length.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{idr(g.total)}</TableCell>
                        <TableCell>
                          {canAct ? (
                            <Button variant="outline" size="sm" onClick={() => { download(csv.name, csv.text); toast.success(`${csv.name} diunduh`) }}>
                              <Download /> Unduh file
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">{csv.name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            {g.batch ? <StatusBadge variant="success"><CircleCheck aria-hidden />Ditransfer</StatusBadge> : <StatusBadge variant="info"><Clock aria-hidden />Siap transfer</StatusBadge>}
                            {g.batch && <span className="text-xs text-muted-foreground tabular-nums">{formatDate(g.batch.tanggal)} · Ref. {g.batch.ref}</span>}
                            {nGagalBank > 0 && <span className="text-xs text-danger">{nGagalBank} transfer gagal</span>}
                          </div>
                        </TableCell>
                        {canAct && (
                          <TableCell>
                            {!g.batch && <Button variant="outline" size="sm" onClick={() => setAction({ kind: 'bank', group: g, items })}>Tandai sudah ditransfer</Button>}
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                  {ditunda.map((it) => (
                    <TableRow key={it.row.nik} className="h-12 hover:bg-transparent">
                      <TableCell className="font-medium">Di luar file bank</TableCell>
                      <TableCell className="text-right tabular-nums">1</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{idr(it.row.neto)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">Tidak ada file · {it.row.nama}</TableCell>
                      <TableCell><PayBadge s={st(it)} note={st(it) === 'ditunda' ? 'Rekening belum ada' : 'Dibayar manual'} /></TableCell>
                      {canAct && <TableCell />}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="font-semibold">Total transfer</TableCell>
                    <TableCell className="text-right tabular-nums">{items.length.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{idr(total)}</TableCell>
                    <TableCell colSpan={canAct ? 3 : 2} className="text-xs text-muted-foreground">Total bank + di luar file bank</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rincian per Pegawai</CardTitle>
              <CardDescription>Status transfer setiap pegawai. Nomor rekening disamarkan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs value={pill} onValueChange={(v) => setPill(v as Pill)}>
                  <TabsList className="h-auto flex-wrap justify-start">
                    <TabsTrigger value="all">Semua ({items.length.toLocaleString('id-ID')})</TabsTrigger>
                    <TabsTrigger value="siap">Siap ({nStatus('siap').toLocaleString('id-ID')})</TabsTrigger>
                    <TabsTrigger value="ditransfer">Ditransfer ({nStatus('ditransfer').toLocaleString('id-ID')})</TabsTrigger>
                    <TabsTrigger value="gagal">Gagal ({nStatus('gagal')})</TabsTrigger>
                    <TabsTrigger value="ditunda">Ditunda ({nStatus('ditunda')})</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input aria-label="Cari pegawai" placeholder="Cari nama atau NIP…" className="pl-9" value={input} onChange={(e) => setInput(e.target.value)} />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={head}>Pegawai</TableHead>
                    <TableHead className={head}>Bank &amp; rekening</TableHead>
                    <TableHead className={`text-right ${head}`}>Neto</TableHead>
                    <TableHead className={head}>Status</TableHead>
                    <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 && (
                    <TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">Tidak ada pegawai yang sesuai.</TableCell></TableRow>
                  )}
                  {pageRows.map((it) => {
                    const acts = rowActions(it)
                    return (
                      <TableRow key={it.row.nik} className="h-12 hover:bg-muted/50">
                        <TableCell><PersonCell nama={it.row.nama} nik={it.row.nik} /></TableCell>
                        <TableCell className="tabular-nums">{it.nomor ? it.masked : <span className="text-muted-foreground">Belum ada</span>}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{idr(it.row.neto)}</TableCell>
                        <TableCell><PayBadge s={st(it)} note={noteOf(it)} /></TableCell>
                        <TableCell>
                          {acts.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8" aria-label={`Aksi ${it.row.nama}`}><MoreHorizontal /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {acts.map((a) => <DropdownMenuItem key={a.label} disabled={a.disabled} onSelect={a.run}>{a.label}</DropdownMenuItem>)}
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

      <PayDialogs action={action} period={period} actor={user.nama} onClose={() => setAction(null)} />
    </div>
  )
}
