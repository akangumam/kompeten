import { TransitionAlert } from '@/components/transition-alert'
import { periodSelectLabel } from '@/data/master/attendance-rules'
import { useMemo, useState } from 'react'
import { ArrowLeftRight, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Pager, usePaging } from '@/components/attendance/pager'
import { AjukanSwapSheet } from '@/components/shift/ajukan-swap-sheet'
import { ScheduleGrid } from '@/components/shift/schedule-grid'
import { SwapTable } from '@/components/shift/swap-table'
import { CancelSwapDialog, TinjauSwapSheet } from '@/components/shift/tinjau-swap-sheet'
import type { SwapApi } from '@/components/shift/use-shift-swaps'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { addDays, empByNik } from '@/data/attendance'
import { ROSTER } from '@/data/employees'
import { approverLabel, inPeriod, isPending, CURRENT_PERIOD_ID, LEAVE_PERIODS, rangeLabel, type LeaveRequest } from '@/data/leave'
import { DEFAULT_SECTION, SCHEDULED, SECTIONS, sectionOf, THIS_WEEK, weekDays, type Ctx } from '@/data/shift-schedule'
import { inScope, teamNote, type CurrentUser } from '@/data/users'

const ALL = 'all'
type Tab = 'all' | 'menunggu' | 'disetujui' | 'ditolak' | 'dibatalkan'
const FIRST_WEEK = '2026-11-02'

export default function ShiftSwapPage({
  api,
  user,
  leaves,
  octClosed,
}: {
  api: SwapApi
  user: CurrentUser
  leaves: LeaveRequest[]
  octClosed: boolean
}) {
  const { swaps: allSwaps } = api
  const isSpv = user.role === 'supervisor'
  const ctx: Ctx = useMemo(() => ({ swaps: allSwaps, leaves }), [allSwaps, leaves])
  const swaps = useMemo(() => allSwaps.filter((s) => inScope(user, empByNik(s.nikA) ?? undefined)), [allSwaps, user])
  const scopedStaff = useMemo(() => SCHEDULED.filter((e) => inScope(user, e)), [user])
  const sections = useMemo(() => SECTIONS.filter((s) => scopedStaff.some((e) => sectionOf(e) === s)), [scopedStaff])

  const [view, setView] = useState('pengajuan')
  const [periodId, setPeriodId] = useState(CURRENT_PERIOD_ID)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [section, setSection] = useState(ALL)
  const [gridSection, setGridSection] = useState(DEFAULT_SECTION)
  const [week, setWeek] = useState(FIRST_WEEK)
  const [ajukan, setAjukan] = useState(false)
  const [sheet, setSheet] = useState<{ no: string; mode: 'review' | 'detail' } | null>(null)
  const [cancelNo, setCancelNo] = useState<string | null>(null)

  const period = LEAVE_PERIODS.find((p) => p.id === periodId)!
  const inPer = useMemo(() => swaps.filter((s) => inPeriod(s.date, period)), [swaps, period])
  const counts = {
    all: inPer.length,
    menunggu: inPer.filter((s) => isPending(s.status)).length,
    disetujui: inPer.filter((s) => s.status === 'disetujui').length,
    ditolak: inPer.filter((s) => s.status === 'ditolak').length,
    dibatalkan: inPer.filter((s) => s.status === 'dibatalkan').length,
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return inPer.filter((s) => {
      const a = empByNik(s.nikA)!
      const b = empByNik(s.nikB)!
      if (tab === 'menunggu' ? !isPending(s.status) : tab !== 'all' && s.status !== tab) return false
      if (section !== ALL && sectionOf(a) !== section) return false
      if (q && !`${a.nama} ${a.nik} ${b.nama} ${b.nik} ${s.no}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [inPer, tab, section, search])

  const filterActive = search !== '' || section !== ALL || tab !== 'all'
  const paging = usePaging(filtered, `${periodId}|${tab}|${search}|${section}`, 10)

  const activeSection = sections.includes(gridSection) ? gridSection : (sections[0] ?? '')
  const gridRows = scopedStaff.filter((e) => sectionOf(e) === activeSection)
  const days = weekDays(week)
  const weekLabel = rangeLabel(days[0], days[6])
  const sameWeek = week === THIS_WEEK

  const active = sheet ? allSwaps.find((s) => s.no === sheet.no) ?? null : null
  const cancelSwap = allSwaps.find((s) => s.no === cancelNo) ?? null

  const summary = `Menampilkan ${filtered.length} pengajuan periode ${period.label} (${period.cutoff})${
    filterActive ? ' dengan filter aktif' : ''
  }, ${filtered.filter((s) => isPending(s.status)).length} menunggu approval.`

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tukar Shift</h1>
          <p className="text-sm text-muted-foreground">Pertukaran jadwal shift antar pegawai pada tanggal yang sama</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger aria-label="Periode" className="w-[370px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAVE_PERIODS.map((p) => (
                <SelectItem key={p.id} value={p.id}>{periodSelectLabel(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {user.role === 'admin' && (
            <Button onClick={() => setAjukan(true)}>
              <ArrowLeftRight className="size-4" />
              Ajukan Tukar Shift
            </Button>
          )}
        </div>
      </div>
      <TransitionAlert period={period} />

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="pengajuan">Pengajuan</TabsTrigger>
          <TabsTrigger value="jadwal">Jadwal Shift</TabsTrigger>
        </TabsList>

        <TabsContent value="pengajuan">
          <Card>
            <CardHeader>
              <CardTitle>Pengajuan</CardTitle>
              <CardDescription>Tukar shift yang disetujui mengubah jadwal pegawai di Absensi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
                <TabsList className="h-auto max-w-full flex-wrap justify-start">
                  <TabsTrigger value="all">Semua ({counts.all})</TabsTrigger>
                  <TabsTrigger value="menunggu">Menunggu ({counts.menunggu})</TabsTrigger>
                  <TabsTrigger value="disetujui">Disetujui ({counts.disetujui})</TabsTrigger>
                  <TabsTrigger value="ditolak">Ditolak ({counts.ditolak})</TabsTrigger>
                  <TabsTrigger value="dibatalkan">Dibatalkan ({counts.dibatalkan})</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-[22rem]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input aria-label="Cari pengajuan" placeholder="Cari nama, NIP, atau nomor pengajuan…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {!isSpv && (
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger aria-label="Section" className="w-[240px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Semua Section</SelectItem>
                      {sections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant="outline"
                  disabled={!filterActive}
                  onClick={() => {
                    setSearch('')
                    setSection(ALL)
                    setTab('all')
                  }}
                >
                  Reset
                </Button>
              </div>
              {isSpv && <p className="text-sm font-medium">{teamNote(user, ROSTER)}</p>}
              <p className="text-sm text-muted-foreground" aria-live="polite">{summary}</p>
              <SwapTable
                rows={paging.rows}
                user={user}
                onReview={(s) => setSheet({ no: s.no, mode: 'review' })}
                onDetail={(s) => setSheet({ no: s.no, mode: 'detail' })}
                onCancel={(s) => setCancelNo(s.no)}
              />
            </CardContent>
            <CardFooter className="block">
              <Pager total={filtered.length} paging={paging} />
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="jadwal">
          <Card>
            <CardHeader>
              <CardTitle>Jadwal Shift Mingguan</CardTitle>
              <CardDescription>Rotasi mingguan per section, termasuk tukar shift dan cuti yang sedang berjalan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" aria-label="Minggu sebelumnya" onClick={() => setWeek(addDays(week, -7))}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="min-w-[10rem] text-center text-sm font-medium tabular-nums" aria-live="polite">{weekLabel}</span>
                  <Button variant="ghost" size="icon" aria-label="Minggu berikutnya" onClick={() => setWeek(addDays(week, 7))}>
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button variant="outline" disabled={sameWeek} onClick={() => setWeek(THIS_WEEK)}>Minggu ini</Button>
                </div>
                <Select value={activeSection} onValueChange={setGridSection}>
                  <SelectTrigger aria-label="Section" className="w-[240px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {isSpv && <p className="text-sm font-medium">{teamNote(user, ROSTER)}</p>}
              <ScheduleGrid rows={gridRows} weekStart={week} ctx={ctx} />
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Pagi 07.00–15.00</span>
                <span>Siang 15.00–23.00</span>
                <span>Malam 23.00–07.00</span>
                <span className="inline-flex items-center gap-1">
                  <ArrowLeftRight className="size-3" aria-hidden /> Tukar shift (garis putus = menunggu approval)
                </span>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AjukanSwapSheet
        open={ajukan}
        onOpenChange={setAjukan}
        ctx={ctx}
        octClosed={octClosed}
        onSubmit={(input) => {
          const s = api.submit(input, user)
          setAjukan(false)
          toast.success(`Pengajuan ${s.no} dikirim ke ${approverLabel(s.nikA)}`)
        }}
      />
      <TinjauSwapSheet
        swap={active}
        mode={sheet?.mode ?? 'detail'}
        ctx={ctx}
        user={user}
        onClose={() => setSheet(null)}
        onApprove={(s) => {
          api.approve(s.no, user)
          setSheet(null)
          toast.success(`Pengajuan ${s.no} disetujui, jadwal diperbarui`)
        }}
        onReject={(s, alasan) => {
          api.reject(s.no, user, alasan)
          setSheet(null)
          toast.success(`Pengajuan ${s.no} ditolak`)
        }}
      />
      <CancelSwapDialog
        swap={cancelSwap}
        onClose={() => setCancelNo(null)}
        onConfirm={(s, alasan) => {
          api.cancel(s.no, user, alasan)
          setCancelNo(null)
          toast.success(`Pengajuan ${s.no} dibatalkan`)
        }}
      />
    </div>
  )
}
