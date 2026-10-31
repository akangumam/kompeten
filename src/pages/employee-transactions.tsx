import { useRef, useState } from 'react'
import { CalendarClock, CircleCheck, Clock, FileText, Hourglass, MoreHorizontal, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { StatCard } from '@/components/dashboard/stat-card'
import { DirectoryFooter } from '@/components/employees/directory-footer'
import { ExpiringCard } from '@/components/transactions/expiring-card'
import { TrxCreateSheet } from '@/components/transactions/create-sheet'
import { LetterDialog, type LetterData } from '@/components/transactions/letter-dialog'
import { TrxReviewSheet } from '@/components/transactions/review-sheet'
import { JenisBadge, JENIS_ICON, PersonCell, TrxStatusCell } from '@/components/transactions/shared'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { teamOf } from '@/data/directory'
import type { LeaveRequest } from '@/data/leave'
import { periodForId } from '@/data/master/attendance-rules'
import {
  TRX,
  TRX_JENIS,
  approveTrx,
  cancelTrx,
  canCancel,
  canCreate,
  canReview,
  canSee,
  changeLine,
  effectiveInPeriod,
  empOf,
  expiringContracts,
  inMonth,
  isFuture,
  rejectTrx,
  showsPay,
  useTrx,
  type Trx,
  type TrxJenis,
} from '@/data/transactions'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { AlasanField } from '@/components/ui/alasan-field'

const head = 'text-xs font-medium text-muted-foreground'
type Pill = 'all' | 'promdem' | 'rotmut' | 'kontrak' | 'tetap' | 'kategori'
const PILLS: { id: Pill; label: string; jenis: TrxJenis[] }[] = [
  { id: 'all', label: 'Semua', jenis: TRX_JENIS },
  { id: 'promdem', label: 'Promosi/Demosi', jenis: ['Promosi', 'Demosi'] },
  { id: 'rotmut', label: 'Rotasi/Mutasi', jenis: ['Rotasi', 'Mutasi'] },
  { id: 'kontrak', label: 'Kontrak', jenis: ['Perpanjangan Kontrak'] },
  { id: 'tetap', label: 'Pengangkatan Tetap', jenis: ['Pengangkatan Tetap'] },
  { id: 'kategori', label: 'Pindah Kategori', jenis: ['Pindah Kategori'] },
]
type StatusFilter = 'all' | 'menunggu' | 'disetujui' | 'terjadwal' | 'bulan' | 'ditolak' | 'dibatalkan'
const STATUS_OPTS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Semua status' },
  { value: 'menunggu', label: 'Menunggu Approval' },
  { value: 'disetujui', label: 'Disetujui' },
  { value: 'terjadwal', label: 'Terjadwal (belum berlaku)' },
  { value: 'bulan', label: 'Berlaku bulan ini' },
  { value: 'ditolak', label: 'Ditolak' },
  { value: 'dibatalkan', label: 'Dibatalkan' },
]
const matchStatus = (t: Trx, s: StatusFilter) =>
  s === 'all' ? true : s === 'terjadwal' ? isFuture(t) : s === 'bulan' ? inMonth(t) : t.status === s

export default function EmployeeTransactionsPage({ user, leaves, periodId, onClearPeriod }: { user: CurrentUser; leaves: LeaveRequest[]; periodId?: string; onClearPeriod: () => void }) {
  useTrx()
  const isSpv = user.role === 'supervisor'
  const admin = canCreate(user)
  const pay = showsPay(user)
  const [pill, setPill] = useState<Pill>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [q, setQ] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [create, setCreate] = useState<{ jenis?: TrxJenis; nik?: string } | null>(null)
  const [sheet, setSheet] = useState<{ no: string; mode: 'review' | 'detail' } | null>(null)
  const [letter, setLetter] = useState<LetterData | null>(null)
  const [cancelNo, setCancelNo] = useState<string | null>(null)
  const [cancelAlasan, setCancelAlasan] = useState('')
  const [cancelErr, setCancelErr] = useState('')
  const expiringRef = useRef<HTMLDivElement>(null)

  const period = periodId ? periodForId(periodId) : null
  const visible = TRX.filter((t) => canSee(t, user))
  const scoped = period ? visible.filter((t) => effectiveInPeriod(t, period.start, period.end)) : visible
  const team = isSpv ? teamOf(user) : null

  const kpi = {
    menunggu: scoped.filter((t) => t.status === 'menunggu').length,
    terjadwal: scoped.filter(isFuture).length,
    bulan: scoped.filter(inMonth).length,
    kontrak: expiringContracts((e) => !isSpv || e.atasanId === user.nik).length,
  }

  const byPill = scoped.filter((t) => PILLS.find((p) => p.id === pill)!.jenis.includes(t.jenis))
  const needle = q.trim().toLowerCase()
  const list = byPill
    .filter((x) => matchStatus(x, status))
    .filter((x) => !needle || `${empOf(x.nik)?.nama ?? ''} ${x.nik} ${x.no}`.toLowerCase().includes(needle))
    .sort((a, b) => b.no.localeCompare(a.no))
  const totalPages = Math.max(1, Math.ceil(list.length / perPage))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * perPage
  const rows = list.slice(start, start + perPage)
  const letterOf = (t: Trx): LetterData => ({
    jenis: t.jenis, nik: t.nik, suratNo: t.suratNo, tanggal: t.diajukan.tanggal, efektif: t.efektif, sebelum: t.sebelum, sesudah: t.sesudah,
    gaji: t.gaji, kontrak: t.kontrak, alasanDemosi: t.alasanDemosi, alasan: t.alasan, disetujui: t.status === 'disetujui', showPay: pay,
  })
  const reset = () => { setPill('all'); setStatus('all'); setQ(''); setPage(1) }
  const pickStatus = (s: StatusFilter) => { setStatus((cur) => (cur === s ? 'all' : s)); setPage(1) }
  const sheetTrx = sheet ? (TRX.find((t) => t.no === sheet.no) ?? null) : null
  const cancelTarget = cancelNo ? TRX.find((t) => t.no === cancelNo) : undefined

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transaksi Kepegawaian</h1>
          <p className="text-sm text-muted-foreground">Perubahan jabatan, penempatan, kontrak, dan kategori pegawai berdasarkan tanggal efektif</p>
        </div>
        {admin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button><Plus /> Buat Transaksi</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {TRX_JENIS.map((j) => {
                const Icon = JENIS_ICON[j]
                return <DropdownMenuItem key={j} onSelect={() => setCreate({ jenis: j })}><Icon aria-hidden /> {j}</DropdownMenuItem>
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {(team || user.role === 'payroll' || period) && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {team && <p>Menampilkan tim Anda: {team.department} · {team.section}</p>}
          {user.role === 'payroll' && <p>Daftar hanya-baca: hanya transaksi yang sudah Disetujui.</p>}
          {period && (
            <span className="inline-flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              Berlaku di periode payroll {period.label} ({period.cutoff})
              <button type="button" aria-label="Hapus filter periode" className="rounded-full focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={onClearPeriod}><X className="size-3" /></button>
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Menunggu approval"
          value={String(kpi.menunggu)}
          delta={kpi.menunggu ? `${kpi.menunggu} antrean` : '0 antrean'}
          trend={kpi.menunggu ? 'down' : 'neutral'}
          categoryIcon={Hourglass}
          summary="Perlu keputusan penyetuju"
          description="Persetujuan atasan dan HRD"
          onClick={() => pickStatus('menunggu')}
          active={status === 'menunggu'}
        />
        <StatCard
          label="Terjadwal"
          value={String(kpi.terjadwal)}
          categoryIcon={CalendarClock}
          summary="Disetujui, belum berlaku"
          description="Efektif pada tanggal mendatang"
          onClick={() => pickStatus('terjadwal')}
          active={status === 'terjadwal'}
        />
        <StatCard
          label="Berlaku bulan ini"
          value={String(kpi.bulan)}
          categoryIcon={CircleCheck}
          summary="Efektif Oktober 2026"
          description="Transaksi kepegawaian aktif"
          onClick={() => pickStatus('bulan')}
          active={status === 'bulan'}
        />
        <StatCard
          label="Kontrak ≤ 45 hari"
          value={String(kpi.kontrak)}
          delta={kpi.kontrak ? `${kpi.kontrak} kontrak` : 'Aman'}
          trend={kpi.kontrak ? 'down' : 'neutral'}
          categoryIcon={Clock}
          summary="Lihat daftar tindakan"
          description="Evaluasi perpanjangan kontrak"
          onClick={() => expiringRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      </div>

      <div ref={expiringRef} className="scroll-mt-6">
        <ExpiringCard user={user} canAct={admin} onAct={(jenis, nik) => setCreate({ jenis, nik })} />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <Tabs value={pill} onValueChange={(v) => { setPill(v as Pill); setPage(1) }}>
            <TabsList className="h-auto max-w-full flex-wrap justify-start">
              {PILLS.map((p) => (
                <TabsTrigger key={p.id} value={p.id}>
                  {p.label} ({scoped.filter((t) => p.jenis.includes(t.jenis)).length})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input aria-label="Cari nama atau NIP" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Cari nama atau NIP…" className="pl-9" />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v as StatusFilter); setPage(1) }}>
              <SelectTrigger aria-label="Status" className="min-w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={reset}>Reset</Button>
          </div>
          {/* 6 kolom; muat di 1440px. Di bawah 1280px tabel bergulir, Pegawai menempel kiri dan Aksi menempel kanan. */}
          <Table className="min-w-[1030px] table-fixed">
            <colgroup>
              <col className="w-[200px]" />
              <col className="w-[190px]" />
              <col className="min-w-[240px]" />
              <col className="w-[150px]" />
              <col className="w-[200px]" />
              <col className="w-[48px]" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`sticky left-0 z-10 bg-card max-[1279px]:border-r ${head}`}>Pegawai</TableHead>
                <TableHead className={head}>Jenis</TableHead>
                <TableHead className={head}>Perubahan</TableHead>
                <TableHead className={head}>Tanggal efektif</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className={`sticky right-0 z-10 bg-card max-[1279px]:border-l ${head}`}><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">
                    Tidak ada transaksi yang sesuai filter.
                    <Button variant="link" className="ml-1 h-auto p-0" onClick={reset}>Reset filter</Button>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((t) => {
                const line = changeLine(t, pay)
                return (
                  <TableRow key={t.no} className="group h-12 hover:bg-muted/50">
                    <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted max-[1279px]:border-r"><PersonCell nik={t.nik} /></TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <JenisBadge jenis={t.jenis} />
                        <span className="text-xs text-muted-foreground tabular-nums">{t.no}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="line-clamp-2 rounded-sm text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">{line}</span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">{line}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col leading-tight">
                        <span className="tabular-nums">{formatDate(t.efektif)}</span>
                        {t.periodeId && <span className="text-xs text-muted-foreground">Periode {periodForId(t.periodeId).label}</span>}
                      </div>
                    </TableCell>
                    <TableCell><TrxStatusCell t={t} /></TableCell>
                    <TableCell className="sticky right-0 z-10 bg-card p-0 text-center group-hover:bg-muted max-[1279px]:border-l">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Aksi"><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canReview(t, user) && <DropdownMenuItem onSelect={() => setSheet({ no: t.no, mode: 'review' })}>Tinjau</DropdownMenuItem>}
                          <DropdownMenuItem onSelect={() => setSheet({ no: t.no, mode: 'detail' })}>Detail</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setLetter(letterOf(t))}><FileText aria-hidden /> Pratinjau Surat</DropdownMenuItem>
                          {canCancel(t, user) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onSelect={() => { setCancelAlasan(''); setCancelErr(''); setCancelNo(t.no) }}>Batalkan</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
        <DirectoryFooter total={list.length} start={start} perPage={perPage} current={current} totalPages={totalPages} onPerPage={(n) => { setPerPage(n); setPage(1) }} onPage={setPage} sizes={[5, 10, 25, 50]} />
      </Card>

      <TrxCreateSheet open={create !== null} onOpenChange={(o) => !o && setCreate(null)} user={user} leaves={leaves} initial={create ?? undefined} />
      <TrxReviewSheet
        trx={sheetTrx}
        mode={sheet?.mode ?? 'detail'}
        user={user}
        leaves={leaves}
        onClose={() => setSheet(null)}
        onApprove={(t) => {
          approveTrx(t.no, user)
          toast.success(TRX.find((x) => x.no === t.no)?.status === 'disetujui' ? `Transaksi ${t.no} disetujui` : `Persetujuan langkah ${t.no} dicatat, menunggu penyetuju berikutnya`)
          setSheet(null)
        }}
        onReject={(t, alasan) => { rejectTrx(t.no, user, alasan); toast.success(`Transaksi ${t.no} ditolak`); setSheet(null) }}
        onLetter={(t) => setLetter(letterOf(t))}
      />
      <LetterDialog data={letter} onClose={() => setLetter(null)} />
      <AlertDialog open={cancelNo !== null} onOpenChange={(o) => !o && setCancelNo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan transaksi {cancelNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && `${empOf(cancelTarget.nik)?.nama} · ${cancelTarget.jenis}. `}Transaksi yang dibatalkan tidak bisa diaktifkan lagi dan tidak mengubah data pegawai.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlasanField id="trx-batal" label="Alasan pembatalan" value={cancelAlasan} onChange={(v) => { setCancelAlasan(v); setCancelErr('') }} error={cancelErr} />
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (!validAlasan(cancelAlasan)) return setCancelErr(ALASAN_ERROR)
                if (cancelNo) cancelTrx(cancelNo, user, cancelAlasan.trim())
                toast.success(`Transaksi ${cancelNo} dibatalkan`)
                setCancelNo(null)
              }}
            >
              Batalkan Transaksi
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
