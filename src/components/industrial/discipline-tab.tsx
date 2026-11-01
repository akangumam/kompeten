import { useEffect, useRef, useState } from 'react'
import { CalendarClock, FileWarning, Hourglass, Mail, MoreHorizontal, Search } from 'lucide-react'
import { toast } from 'sonner'
import { DirectoryFooter } from '@/components/employees/directory-footer'
import { DiscCreateSheet } from '@/components/industrial/disc-create-sheet'
import { DiscReviewSheet } from '@/components/industrial/disc-review-sheet'
import { DiscLetterDialog } from '@/components/industrial/letters'
import { DiscJenisBadge, DiscStatusCell, PersonLine } from '@/components/industrial/shared'
import { KPI_GRID, StatCard } from '@/components/payroll/pay/shared'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DatePicker } from '@/components/employee/date-picker'
import { teamOf } from '@/data/directory'
import {
  DISC, DISC_STATUS_LABEL, approveDisc, cancelDisc, canCancelDisc, canCreateDisc, canReceipt, canReviewDisc, discKpi, hasLetter, rejectDisc, recordReceipt, statusOf, useDiscipline, violationOf, visible,
  type Disc, type DiscJenis, type DiscStatus,
} from '@/data/discipline'
import { personOf } from '@/data/offboarding'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { DEMO_TODAY } from '@/lib/today'
import { AlasanField } from '@/components/ui/alasan-field'

const head = 'text-xs font-medium text-muted-foreground'
const STATUSES: ('all' | DiscStatus)[] = ['all', 'menunggu', 'aktif', 'kedaluwarsa', 'ditolak', 'dibatalkan']

export function DisciplineTab({ user, intent, onIntentDone, openToken = 0 }: { user: CurrentUser; intent?: { nik?: string; jenis?: DiscJenis }; onIntentDone: () => void; /** Naik setiap kali tombol "Buat Catatan" di baris Tabs ditekan. */ openToken?: number }) {
  useDiscipline()
  const isSpv = user.role === 'supervisor'
  const [create, setCreate] = useState<{ nik?: string; jenis?: DiscJenis } | null>(intent ? intent : null)
  const seenToken = useRef(openToken)
  useEffect(() => { if (openToken !== seenToken.current) { seenToken.current = openToken; setCreate({}) } }, [openToken])
  const [status, setStatus] = useState<'all' | DiscStatus>('all')
  const [q, setQ] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [sheet, setSheet] = useState<{ id: string; mode: 'review' | 'detail' } | null>(null)
  const [letter, setLetter] = useState<Disc | null>(null)
  const [receipt, setReceipt] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelAlasan, setCancelAlasan] = useState('')
  const [cancelErr, setCancelErr] = useState('')

  const all = visible(user)
  const k = discKpi(all)
  const needle = q.trim().toLowerCase()
  const list = all
    .filter((d) => (status === 'all' || statusOf(d) === status) && (!needle || `${personOf(d.nik)?.nama ?? ''} ${d.nik} ${d.suratNo} ${d.id}`.toLowerCase().includes(needle)))
    .sort((a, b) => (b.terbit ?? b.diajukan.tanggal).localeCompare(a.terbit ?? a.diajukan.tanggal) || b.id.localeCompare(a.id))
  const totalPages = Math.max(1, Math.ceil(list.length / perPage))
  const cur = Math.min(page, totalPages)
  const start = (cur - 1) * perPage
  const rows = list.slice(start, start + perPage)
  const team = isSpv ? teamOf(user) : null
  const sheetDisc = sheet ? DISC.find((d) => d.id === sheet.id) ?? null : null
  const receiptDisc = receipt ? DISC.find((d) => d.id === receipt) : undefined

  return (
    <div className="space-y-6">
      {team && <p className="text-sm text-muted-foreground">Menampilkan tim Anda: {team.department} · {team.section}</p>}
      <div className={KPI_GRID}>
        <StatCard label="SP aktif" value={k.spAktif} icon={FileWarning} hint="SP1, SP2, SP3 yang masih berlaku" />
        <StatCard label="Menunggu approval" value={k.menunggu} icon={Hourglass} hint="Perlu keputusan HR & GA Manager" />
        <StatCard label="Kedaluwarsa ≤ 30 hari" value={k.kedaluwarsa30} icon={CalendarClock} hint="Masa berlaku segera berakhir" />
        <StatCard label="Surat Panggilan terbuka" value={k.panggilan} icon={Mail} hint="Belum ditanggapi" />
      </div>
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input aria-label="Cari nama atau NIP" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Cari nama atau NIP…" className="pl-9" />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v as 'all' | DiscStatus); setPage(1) }}>
              <SelectTrigger aria-label="Status" className="min-w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s === 'all' ? 'Semua status' : DISC_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setQ(''); setStatus('all'); setPage(1) }}>Reset</Button>
          </div>
          <Table className="min-w-[1030px] table-fixed">
            <colgroup>
              <col className="w-[200px]" /><col className="w-[190px]" /><col className="min-w-[240px]" /><col className="w-[160px]" /><col className="w-[200px]" /><col className="w-[48px]" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`sticky left-0 z-10 bg-card max-[1279px]:border-r ${head}`}>Pegawai</TableHead>
                <TableHead className={head}>Jenis</TableHead>
                <TableHead className={head}>Pelanggaran</TableHead>
                <TableHead className={head}>Terbit · Berlaku s/d</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className={`sticky right-0 z-10 bg-card max-[1279px]:border-l ${head}`}><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">Belum ada catatan disiplin yang sesuai.</TableCell></TableRow>
              )}
              {rows.map((d) => {
                const line = `${violationOf(d)}: ${d.kronologi}`
                return (
                  <TableRow key={d.id} className="group h-12 hover:bg-muted/50">
                    <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted max-[1279px]:border-r"><PersonLine nik={d.nik} /></TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <DiscJenisBadge jenis={d.jenis} />
                        <span className="text-xs text-muted-foreground tabular-nums">{d.suratNo || (hasLetter(d.jenis) ? 'Belum terbit' : 'Tanpa surat')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="block rounded-sm text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                            <span className="block font-medium">{violationOf(d)}</span>
                            <span className="line-clamp-1 text-xs text-muted-foreground">{d.kronologi}</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">{line}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {d.terbit ? (
                        <div className="flex flex-col leading-tight">
                          <span className="tabular-nums">{formatDate(d.terbit)}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{d.jenis === 'Surat Panggilan' ? `hadir ${formatDate(d.panggilan!.hadir)}` : `s/d ${formatDate(d.berlakuSampai!)}`}</span>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><DiscStatusCell d={d} /></TableCell>
                    <TableCell className="sticky right-0 z-10 bg-card p-0 text-center group-hover:bg-muted max-[1279px]:border-l">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Aksi"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canReviewDisc(d, user) && <DropdownMenuItem onSelect={() => setSheet({ id: d.id, mode: 'review' })}>Tinjau</DropdownMenuItem>}
                          <DropdownMenuItem onSelect={() => setSheet({ id: d.id, mode: 'detail' })}>Detail</DropdownMenuItem>
                          {hasLetter(d.jenis) && <DropdownMenuItem onSelect={() => setLetter(d)}>Pratinjau Surat</DropdownMenuItem>}
                          {canReceipt(d, user) && <DropdownMenuItem onSelect={() => setReceipt(d.id)}>Catat Tanda Terima</DropdownMenuItem>}
                          {canCancelDisc(d, user) && (<><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => { setCancelAlasan(''); setCancelErr(''); setCancelId(d.id) }}>Batalkan</DropdownMenuItem></>)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
        <DirectoryFooter total={list.length} start={start} perPage={perPage} current={cur} totalPages={totalPages} onPerPage={(n) => { setPerPage(n); setPage(1) }} onPage={setPage} sizes={[5, 10, 25, 50]} />
      </Card>

      {canCreateDisc(user) && (
        <DiscCreateSheet open={create !== null} onOpenChange={(o) => { if (!o) { setCreate(null); onIntentDone() } }} user={user} initial={create ?? undefined} />
      )}
      <DiscReviewSheet
        disc={sheetDisc}
        mode={sheet?.mode ?? 'detail'}
        user={user}
        onClose={() => setSheet(null)}
        onApprove={(d) => { approveDisc(d.id, user); toast.success(`Catatan ${d.id} disetujui dan surat terbit`); setSheet(null) }}
        onReject={(d, alasan) => { rejectDisc(d.id, user, alasan); toast.success(`Catatan ${d.id} ditolak`); setSheet(null) }}
        onLetter={setLetter}
      />
      <DiscLetterDialog disc={letter ? DISC.find((x) => x.id === letter.id) ?? letter : null} onClose={() => setLetter(null)} />
      {receiptDisc && <ReceiptDialog disc={receiptDisc} user={user} onClose={() => setReceipt(null)} />}
      <AlertDialog open={cancelId !== null} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan catatan {cancelId}?</AlertDialogTitle>
            <AlertDialogDescription>Catatan yang dibatalkan tidak bisa diaktifkan lagi dan tidak dihitung sebagai SP aktif.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlasanField id="dsc-batal" label="Alasan pembatalan" value={cancelAlasan} onChange={(v) => { setCancelAlasan(v); setCancelErr('') }} error={cancelErr} />
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button variant="destructive" onClick={() => { if (!validAlasan(cancelAlasan)) return setCancelErr(ALASAN_ERROR); if (cancelId) cancelDisc(cancelId, user, cancelAlasan.trim()); toast.success(`Catatan ${cancelId} dibatalkan`); setCancelId(null) }}>Batalkan Catatan</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ReceiptDialog({ disc, user, onClose }: { disc: Disc; user: CurrentUser; onClose: () => void }) {
  const [mode, setMode] = useState<'diterima' | 'menolak'>('diterima')
  const [tanggal, setTanggal] = useState(DEMO_TODAY)
  const [saksi, setSaksi] = useState('')
  const [tanggapan, setTanggapan] = useState<'' | 'hadir' | 'tidak-hadir'>('')
  const [error, setError] = useState('')
  const p = personOf(disc.nik)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catat Tanda Terima · {disc.suratNo}</DialogTitle>
          <DialogDescription>{p?.nama} · {disc.jenis}. Dicatat oleh Admin HRD setelah surat diserahkan.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={mode} onValueChange={(v) => { setMode(v as 'diterima' | 'menolak'); setError('') }} className="gap-2">
          <label htmlFor="rc-ok" className="flex items-center gap-2 text-sm"><RadioGroupItem id="rc-ok" value="diterima" />Surat diterima pegawai</label>
          <label htmlFor="rc-no" className="flex items-center gap-2 text-sm"><RadioGroupItem id="rc-no" value="menolak" />Menolak tanda tangan</label>
        </RadioGroup>
        {mode === 'diterima' ? (
          <div className="space-y-2"><Label htmlFor="rc-tgl">Tanggal diterima</Label><DatePicker id="rc-tgl" value={tanggal} min={disc.terbit} max={DEMO_TODAY} onChange={setTanggal} /></div>
        ) : (
          <div className="space-y-2"><Label htmlFor="rc-saksi">Nama saksi <span aria-hidden className="text-danger">*</span></Label><Input id="rc-saksi" value={saksi} onChange={(e) => setSaksi(e.target.value)} placeholder="Nama saksi yang menyaksikan penyerahan" /></div>
        )}
        {disc.jenis === 'Surat Panggilan' && (
          <div className="space-y-2">
            <Label htmlFor="rc-tanggapan">Tanggapan pegawai</Label>
            <Select value={tanggapan} onValueChange={(v) => setTanggapan(v as 'hadir' | 'tidak-hadir')}>
              <SelectTrigger id="rc-tanggapan" className="w-full"><SelectValue placeholder="Belum ada tanggapan" /></SelectTrigger>
              <SelectContent><SelectItem value="hadir">Hadir memenuhi panggilan</SelectItem><SelectItem value="tidak-hadir">Tidak hadir</SelectItem></SelectContent>
            </Select>
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => { const e = recordReceipt(disc.id, { tanggal, menolak: mode === 'menolak', saksi, tanggapan: tanggapan || undefined }, user); if (e) return setError(e); toast.success('Tanda terima dicatat'); onClose() }}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
