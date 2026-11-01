import { useEffect, useState } from 'react'
import { Banknote, Calculator, CircleCheck, CircleDashed, FileClock, Hourglass, MoreHorizontal, Search } from 'lucide-react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/employee/date-picker'
import { Field } from '@/components/employee/field'
import { DirectoryFooter } from '@/components/employees/directory-footer'
import { BuktiDialog } from '@/components/finalpay/bukti-dialog'
import { CalcSheet } from '@/components/finalpay/calc-sheet'
import { PersonLine } from '@/components/industrial/shared'
import { KPI_GRID, StatCard } from '@/components/payroll/pay/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { HAK_STATUS_LABEL, RECORDS, canApprove, canCalc, canPay, inYear, kpi, recordTransfer, statusOf, useFinalPay, type FinalPay, type HakStatus } from '@/data/finalpay'
import type { LeaveRequest } from '@/data/leave'
import { periodForId } from '@/data/master/attendance-rules'
import { personOf } from '@/data/offboarding'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'

const head = 'text-xs font-medium text-muted-foreground'
const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

function StatusCell({ r }: { r: FinalPay }) {
  const s = statusOf(r)
  const sub = s === 'menunggu' ? 'Menunggu Lestari Wulandari' : s === 'disetujui' ? (r.pembayaran.mode === 'payroll' ? `Lewat payroll ${periodForId(r.pembayaran.periodeId!).label}` : 'Menunggu transfer Finance') : s === 'hitung' && r.dikembalikan ? 'Dikembalikan' : null
  return (
    <div className="flex flex-col items-start gap-1">
      {s === 'hitung' && <StatusBadge variant="warning"><CircleDashed aria-hidden />{HAK_STATUS_LABEL[s]}</StatusBadge>}
      {s === 'menunggu' && <StatusBadge variant="info"><Hourglass aria-hidden />{HAK_STATUS_LABEL[s]}</StatusBadge>}
      {s === 'disetujui' && <StatusBadge variant="success"><CircleCheck aria-hidden />{HAK_STATUS_LABEL[s]}</StatusBadge>}
      {s === 'dibayar' && <StatusBadge variant="success"><Banknote aria-hidden />{HAK_STATUS_LABEL[s]}</StatusBadge>}
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}

export default function FinalPayPage({ user, leaves, focus, onFocusDone }: { user: CurrentUser; leaves: LeaveRequest[]; focus?: string; onFocusDone: () => void }) {
  useFinalPay()
  const [tahun, setTahun] = useState(DEMO_TODAY.slice(0, 4))
  const [tab, setTab] = useState<'HAK' | 'KPK'>('HAK')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | HakStatus>('all')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [sheet, setSheet] = useState<{ no: string; mode: 'hitung' | 'tinjau' | 'detail' } | null>(focus ? { no: focus, mode: 'detail' } : null)
  const [bukti, setBukti] = useState<string | null>(null)
  const [pay, setPay] = useState<string | null>(null)
  const [proof, setProof] = useState<string | null>(null)
  useEffect(() => { if (focus) onFocusDone() }, [focus]) // eslint-disable-line react-hooks/exhaustive-deps

  const year = Number(tahun)
  const inY = RECORDS.filter((r) => inYear(r, year))
  const k = kpi(RECORDS, year)
  const byTab = inY.filter((r) => r.kind === tab)
  const needle = q.trim().toLowerCase()
  const list = byTab
    .filter((r) => (status === 'all' || statusOf(r) === status) && (!needle || `${personOf(r.nik)?.nama ?? ''} ${r.nik} ${r.no}`.toLowerCase().includes(needle)))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.no.localeCompare(a.no))
  const totalPages = Math.max(1, Math.ceil(list.length / perPage))
  const cur = Math.min(page, totalPages)
  const from = (cur - 1) * perPage
  const rows = list.slice(from, from + perPage)
  const sheetRec = sheet ? RECORDS.find((r) => r.no === sheet.no) ?? null : null
  const dasar = (r: FinalPay) => (r.kind === 'KPK' || (r.kontrak && r.ruleKey === 'habis-kontrak') ? `Kontrak ke-${r.kontrak?.ke} berakhir ${formatDate(r.tanggal)}` : r.calc?.ruleLabel ?? ruleName(r))
  const ruleName = (r: FinalPay) => (r.offNo ? personOfOffReason(r) : 'Hak akhir')

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kompensasi & Pesangon</h1>
          <p className="text-sm text-muted-foreground">Hak akhir pegawai keluar dan kompensasi PKWT</p>
        </div>
        <Select value={tahun} onValueChange={(v) => { setTahun(v); setPage(1) }}>
          <SelectTrigger aria-label="Tahun" className="min-w-[110px]"><SelectValue /></SelectTrigger>
          <SelectContent>{['2026', '2025'].map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {user.role === 'admin' && <p className="text-sm text-muted-foreground">Mode baca: perhitungan oleh Payroll Officer, persetujuan oleh HR & GA Manager.</p>}

      <div className={KPI_GRID}>
        <StatCard label="Perlu dihitung" value={k.hitung} icon={Calculator} hint="Menunggu Payroll Officer" />
        <StatCard label="Menunggu approval" value={k.menunggu} icon={Hourglass} hint="HR & GA Manager" />
        <StatCard label="Dibayar tahun ini" value={rp(k.dibayar)} icon={Banknote} hint="Total neto hak akhir" />
        <StatCard label="Kompensasi PKWT bulan ini" value={rp(k.pkwtBulanIni)} icon={FileClock} hint="Periode payroll berjalan" />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as 'HAK' | 'KPK'); setPage(1) }}>
            <TabsList className="h-auto max-w-full flex-wrap justify-start">
              <TabsTrigger value="HAK">Hak Akhir (pegawai keluar) ({inY.filter((r) => r.kind === 'HAK').length})</TabsTrigger>
              <TabsTrigger value="KPK">Kompensasi PKWT ({inY.filter((r) => r.kind === 'KPK').length})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input aria-label="Cari nama atau NIP" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Cari nama atau NIP…" className="pl-9" />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v as 'all' | HakStatus); setPage(1) }}>
              <SelectTrigger aria-label="Status" className="min-w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Semua status</SelectItem>{(Object.keys(HAK_STATUS_LABEL) as HakStatus[]).map((s) => <SelectItem key={s} value={s}>{HAK_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setQ(''); setStatus('all'); setPage(1) }}>Reset</Button>
          </div>
          <Table className="min-w-[1000px] table-fixed">
            <colgroup><col className="w-[200px]" /><col className="min-w-[240px]" /><col className="w-[130px]" /><col className="w-[190px]" /><col className="w-[190px]" /><col className="w-[48px]" /></colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`sticky left-0 z-10 bg-card max-[1279px]:border-r ${head}`}>Pegawai</TableHead>
                <TableHead className={head}>Dasar</TableHead>
                <TableHead className={head}>Tanggal</TableHead>
                <TableHead className={`text-right ${head}`}>Total bruto · neto</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className={`sticky right-0 z-10 bg-card max-[1279px]:border-l ${head}`}><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">Belum ada catatan yang sesuai.</TableCell></TableRow>}
              {rows.map((r) => {
                const s = statusOf(r)
                const c = r.calc
                const ter = !!c && c.finalBase === 0 && c.terBase > 0
                return (
                  <TableRow key={r.no} className="group h-12 hover:bg-muted/50">
                    <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted max-[1279px]:border-r"><PersonLine nik={r.nik} /></TableCell>
                    <TableCell className="whitespace-normal"><div className="flex flex-col leading-tight"><span>{dasar(r)}</span><span className="text-xs text-muted-foreground tabular-nums">{r.no}</span></div></TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatDate(r.tanggal)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c ? (
                        <div className="flex flex-col leading-tight"><span className="font-medium">{rp(c.bruto)}</span><span className="text-xs text-muted-foreground">{ter ? 'Tidak final (TER) · ' + (r.pembayaran.periodeId ? 'payroll ' + periodForId(r.pembayaran.periodeId).label : '') : `neto ${rp(c.neto)}`}</span></div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><StatusCell r={r} /></TableCell>
                    <TableCell className="sticky right-0 z-10 bg-card p-0 text-center group-hover:bg-muted max-[1279px]:border-l">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Aksi"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canCalc(user) && s === 'hitung' && <DropdownMenuItem onSelect={() => setSheet({ no: r.no, mode: 'hitung' })}>Hitung</DropdownMenuItem>}
                          {canApprove(r, user) && <DropdownMenuItem onSelect={() => setSheet({ no: r.no, mode: 'tinjau' })}>Tinjau</DropdownMenuItem>}
                          {canPay(r, user) && <DropdownMenuItem onSelect={() => setPay(r.no)}>Catat Pembayaran</DropdownMenuItem>}
                          {(s === 'disetujui' || s === 'dibayar') && <DropdownMenuItem onSelect={() => setProof(r.no)}>Bukti Pembayaran</DropdownMenuItem>}
                          <DropdownMenuItem onSelect={() => setSheet({ no: r.no, mode: 'detail' })}>Detail</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
        <DirectoryFooter total={list.length} start={from} perPage={perPage} current={cur} totalPages={totalPages} onPerPage={(n) => { setPerPage(n); setPage(1) }} onPage={setPage} sizes={[5, 10, 25, 50]} />
      </Card>

      <CalcSheet rec={sheetRec} mode={sheet?.mode ?? 'detail'} user={user} leaves={leaves} onClose={() => setSheet(null)} />
      <BuktiDialog rec={bukti ? RECORDS.find((r) => r.no === bukti) ?? null : null} onClose={() => setBukti(null)} />
      {pay && <PayDialog rec={RECORDS.find((r) => r.no === pay)!} user={user} onClose={() => setPay(null)} />}
      {proof && <ProofDialog rec={RECORDS.find((r) => r.no === proof)!} onClose={() => setProof(null)} onBukti={() => { setBukti(proof); setProof(null) }} />}
    </div>
  )
}

import { OFFS } from '@/data/offboarding'
function personOfOffReason(r: FinalPay) {
  return OFFS.find((o) => o.no === r.offNo)?.reason ?? 'Hak akhir'
}

function PayDialog({ rec, user, onClose }: { rec: FinalPay; user: CurrentUser; onClose: () => void }) {
  const [tanggal, setTanggal] = useState(DEMO_TODAY)
  const [ref, setRef] = useState('')
  const [file, setFile] = useState<PickedFile | null>(null)
  const [error, setError] = useState('')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catat Pembayaran · {rec.no}</DialogTitle>
          <DialogDescription>{personOf(rec.nik)?.nama} · neto {rec.calc ? rp(rec.calc.neto) : '—'}. Transfer terpisah oleh Finance.</DialogDescription>
        </DialogHeader>
        <Field id="pay-tgl" label="Tanggal transfer" required><DatePicker id="pay-tgl" value={tanggal} max={DEMO_TODAY} onChange={setTanggal} /></Field>
        <Field id="pay-ref" label="Nomor referensi" required error={error}><Input id="pay-ref" value={ref} aria-invalid={!!error || undefined} onChange={(e) => { setRef(e.target.value); setError('') }} placeholder="Contoh: TRF-2026-1030" /></Field>
        <Field id="pay-bukti" label="Bukti transfer" helper="Opsional. PDF, JPG, atau PNG, maksimal 5 MB."><FilePicker id="pay-bukti" accept=".pdf,.jpg,.jpeg,.png" extensions={['pdf', 'jpg', 'jpeg', 'png']} maxBytes={5 * 1048576} typeError="Format file harus PDF, JPG, atau PNG" value={file} onChange={setFile} /></Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => { const e = recordTransfer(rec.no, { tanggal, ref, bukti: file?.name ?? '' }, user); if (e) return setError(e); toast.success('Pembayaran dicatat'); onClose() }}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProofDialog({ rec, onClose, onBukti }: { rec: FinalPay; onClose: () => void; onBukti: () => void }) {
  const s = statusOf(rec)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Bukti Pembayaran · {rec.no}</DialogTitle><DialogDescription>{personOf(rec.nik)?.nama} · {rec.calc ? `neto ${rp(rec.calc.neto)}` : ''}</DialogDescription></DialogHeader>
        <div className="space-y-2 text-sm">
          {rec.pembayaran.mode === 'payroll' ? (
            <p>Dibayar lewat payroll periode <span className="font-medium">{periodForId(rec.pembayaran.periodeId!).label}</span> sebagai bagian tidak berulang “Hak Akhir” pada slip. Status: {s === 'dibayar' ? 'Dibayar (periode Final)' : 'Disetujui, menunggu periode payroll Final'}.</p>
          ) : rec.pembayaran.transfer ? (
            <>
              <p>Transfer terpisah, dicatat {rec.pembayaran.transfer.oleh}.</p>
              <p className="tabular-nums">Tanggal {formatDate(rec.pembayaran.transfer.tanggal)} · ref {rec.pembayaran.transfer.ref}</p>
              {rec.pembayaran.transfer.bukti && <p className="text-muted-foreground">Bukti: {rec.pembayaran.transfer.bukti}</p>}
            </>
          ) : <p className="text-muted-foreground">Menunggu transfer dicatat oleh Finance.</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onBukti}>Bukti Perhitungan</Button><Button variant="outline" onClick={onClose}>Tutup</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
