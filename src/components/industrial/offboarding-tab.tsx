import { useEffect, useRef, useState } from 'react'
import { CalendarClock, CircleCheck, CircleX, Clock, DoorOpen, MoreHorizontal, Percent, Search, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import { DirectoryFooter } from '@/components/employees/directory-footer'
import { OffDetailSheet } from '@/components/industrial/off-detail-sheet'
import { OffStartSheet } from '@/components/industrial/off-start-sheet'
import { PersonLine } from '@/components/industrial/shared'
import { KPI_GRID, StatCard } from '@/components/payroll/pay/shared'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { addDayIso } from '@/data/contracts'
import { daysFromToday } from '@/data/employees'
import {
  OFFS, canCancelOff, canStartOff, cancelOff, nearRetirementList, offKpi, progressText, reached, turnoverStats, useOffboarding, visibleOffs, personOf,
  type Off, type OffStatus,
} from '@/data/offboarding'
import { teamOf } from '@/data/directory'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { DEMO_TODAY } from '@/lib/today'
import { AlasanField } from '@/components/ui/alasan-field'

const head = 'text-xs font-medium text-muted-foreground'
const STATUS_LABEL: Record<OffStatus, string> = { berjalan: 'Berjalan', selesai: 'Selesai', dibatalkan: 'Dibatalkan' }
const STATUS_VARIANT = { berjalan: 'info', selesai: 'success', dibatalkan: 'neutral' } as const
const STATUS_ICON = { berjalan: Clock, selesai: CircleCheck, dibatalkan: CircleX } as const
const pctText = (n: number) => `${n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

export function OffboardingTab({ user, intent, onIntentDone, onFinished, openToken = 0 }: { user: CurrentUser; intent?: { nik?: string; reason?: string }; onIntentDone: () => void; onFinished: (o: Off) => number; openToken?: number }) {
  useOffboarding()
  const isSpv = user.role === 'supervisor'
  const admin = canStartOff(user)
  const [start, setStart] = useState<{ nik?: string; reason?: string } | null>(intent ? intent : null)
  const seenToken = useRef(openToken)
  useEffect(() => { if (openToken !== seenToken.current) { seenToken.current = openToken; setStart({}) } }, [openToken])
  const [detail, setDetail] = useState<string | null>(null)
  const [status, setStatus] = useState<'all' | OffStatus>('all')
  const [q, setQ] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [cancelNo, setCancelNo] = useState<string | null>(null)
  const [cancelAlasan, setCancelAlasan] = useState('')
  const [cancelErr, setCancelErr] = useState('')

  const all = visibleOffs(user)
  const kpi = offKpi(all)
  const tov = turnoverStats()
  const near = nearRetirementList((e) => !isSpv || e.atasanId === user.nik)
  const needle = q.trim().toLowerCase()
  const list = all.filter((o) => (status === 'all' || o.status === status) && (!needle || `${personOf(o.nik)?.nama ?? ''} ${o.nik} ${o.no}`.toLowerCase().includes(needle))).sort((a, b) => b.no.localeCompare(a.no))
  const totalPages = Math.max(1, Math.ceil(list.length / perPage))
  const cur = Math.min(page, totalPages)
  const from = (cur - 1) * perPage
  const rows = list.slice(from, from + perPage)
  const team = isSpv ? teamOf(user) : null
  const cancelTarget = OFFS.find((o) => o.no === cancelNo)

  return (
    <div className="space-y-6">
      {team && <p className="text-sm text-muted-foreground">Menampilkan tim Anda: {team.department} · {team.section}</p>}
      {user.role === 'payroll' && <p className="text-sm text-muted-foreground">Daftar hanya-baca untuk menyiapkan hak akhir.</p>}
      <div className={KPI_GRID}>
        <StatCard label="Proses keluar berjalan" value={kpi.berjalan} icon={DoorOpen} hint="Belum selesai" />
        <StatCard label="Keluar bulan ini" value={kpi.bulanIni} icon={CalendarClock} hint="Tanggal keluar Oktober 2026" />
        <StatCard label="Mendekati pensiun" value={near.length} icon={UserMinus} hint="≤ 6 bulan" />
        <StatCard label="Turnover tahun berjalan" value={pctText(tov.pct)} icon={Percent} hint={`${tov.keluar} keluar ÷ rata-rata ${Math.round(tov.avg).toLocaleString('id-ID')} pegawai`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mendekati pensiun (≤ 6 bulan)</CardTitle>
          <CardDescription>Berdasarkan aturan Usia Pensiun di Data Master › Industrial</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Pegawai</TableHead>
                <TableHead className={head}>Department · Posisi</TableHead>
                <TableHead className={head}>Tanggal pensiun</TableHead>
                <TableHead className={`text-right ${head}`}>Sisa hari</TableHead>
                {admin && <TableHead className={`text-right ${head}`}>Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {near.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={admin ? 5 : 4} className="h-20 text-center text-sm text-muted-foreground">Tidak ada pegawai yang mendekati pensiun.</TableCell></TableRow>}
              {near.slice(0, 5).map(({ emp, tanggal }) => (
                <TableRow key={emp.nik} className="h-12 hover:bg-muted/50">
                  <TableCell><PersonLine nik={emp.nik} /></TableCell>
                  <TableCell><div className="flex flex-col leading-tight"><span>{emp.department}</span><span className="text-xs text-muted-foreground">{emp.posisi}</span></div></TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{formatDate(tanggal)}</TableCell>
                  <TableCell className="text-right tabular-nums">{daysFromToday(tanggal)} hari</TableCell>
                  {admin && <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => setStart({ nik: emp.nik, reason: 'Pensiun' })}>Proses Pensiun</Button></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter><p className="text-sm text-muted-foreground tabular-nums">Menampilkan {Math.min(5, near.length)} dari {near.length} data</p></CardFooter>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input aria-label="Cari nama atau NIP" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Cari nama atau NIP…" className="pl-9" />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v as 'all' | OffStatus); setPage(1) }}>
              <SelectTrigger aria-label="Status" className="min-w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Semua status</SelectItem>{(Object.keys(STATUS_LABEL) as OffStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setQ(''); setStatus('all'); setPage(1) }}>Reset</Button>
          </div>
          <Table className="min-w-[1030px] table-fixed">
            <colgroup><col className="w-[200px]" /><col className="w-[190px]" /><col className="w-[150px]" /><col className="min-w-[220px]" /><col className="w-[200px]" /><col className="w-[48px]" /></colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`sticky left-0 z-10 bg-card max-[1279px]:border-r ${head}`}>Pegawai</TableHead>
                <TableHead className={head}>Alasan</TableHead>
                <TableHead className={head}>Tanggal keluar</TableHead>
                <TableHead className={head}>Tahap</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className={`sticky right-0 z-10 bg-card max-[1279px]:border-l ${head}`}><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">Belum ada proses keluar yang sesuai.</TableCell></TableRow>}
              {rows.map((o) => {
                const r = o.status === 'selesai' ? 6 : o.status === 'dibatalkan' ? 0 : reached(o)
                return (
                  <TableRow key={o.no} className="group h-12 hover:bg-muted/50">
                    <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted max-[1279px]:border-r"><PersonLine nik={o.nik} /></TableCell>
                    <TableCell><div className="flex flex-col items-start gap-1"><StatusBadge variant="neutral">{o.reason.replace(' (dianggap mengundurkan diri)', '')}</StatusBadge><span className="text-xs text-muted-foreground tabular-nums">{o.no}</span></div></TableCell>
                    <TableCell className="whitespace-nowrap"><div className="flex flex-col leading-tight"><span className="tabular-nums">{formatDate(o.tanggalKeluar)}</span><span className="text-xs text-muted-foreground">Nonaktif {formatDate(addDayIso(o.tanggalKeluar))}</span></div></TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className="text-sm tabular-nums">{progressText(o)}</span>
                        <div className="h-1.5 w-full max-w-[160px] rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={6} aria-valuenow={r} aria-label="Progres tahap"><div className="h-full rounded-full bg-foreground" style={{ width: `${(r / 6) * 100}%` }} /></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge variant={STATUS_VARIANT[o.status]}>{(() => { const I = STATUS_ICON[o.status]; return <I aria-hidden /> })()}{STATUS_LABEL[o.status]}</StatusBadge>
                        {o.status === 'selesai' && addDayIso(o.tanggalKeluar) > DEMO_TODAY && <span className="text-xs text-muted-foreground">Terjadwal nonaktif {formatDate(addDayIso(o.tanggalKeluar))}</span>}
                        {o.status === 'berjalan' && o.approval.status === 'menunggu' && <span className="text-xs text-muted-foreground">Menunggu Lestari Wulandari</span>}
                      </div>
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 bg-card p-0 text-center group-hover:bg-muted max-[1279px]:border-l">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Aksi"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setDetail(o.no)}>Buka</DropdownMenuItem>
                          {canCancelOff(o, user) && (<><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => { setCancelAlasan(''); setCancelErr(''); setCancelNo(o.no) }}>Batalkan</DropdownMenuItem></>)}
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

      {admin && <OffStartSheet open={start !== null} onOpenChange={(o) => { if (!o) { setStart(null); onIntentDone() } }} user={user} initial={start ?? undefined} />}
      <OffDetailSheet no={detail} user={user} onClose={() => setDetail(null)} onFinished={onFinished} />
      <AlertDialog open={cancelNo !== null} onOpenChange={(o) => !o && setCancelNo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan proses keluar {cancelNo}?</AlertDialogTitle>
            <AlertDialogDescription>{cancelTarget && `${personOf(cancelTarget.nik)?.nama} · ${cancelTarget.reason}. `}Pegawai tetap aktif dan proses tidak dapat dilanjutkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlasanField id="off-batal" label="Alasan pembatalan" value={cancelAlasan} onChange={(v) => { setCancelAlasan(v); setCancelErr('') }} error={cancelErr} />
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button variant="destructive" onClick={() => { if (!validAlasan(cancelAlasan)) return setCancelErr(ALASAN_ERROR); if (cancelNo) cancelOff(cancelNo, user, cancelAlasan.trim()); toast.success(`Proses ${cancelNo} dibatalkan`); setCancelNo(null) }}>Batalkan Proses</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
