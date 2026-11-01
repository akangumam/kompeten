import { useMemo, useState } from 'react'
import { CalendarCheck, CircleCheck, Clock, Hourglass, Lock, Search, TriangleAlert, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { CorrectionSheet } from '@/components/attendance/correction-sheet'
import { DailyTable, type DayRow } from '@/components/attendance/daily-table'
import { AlfaDialog, MapPinDialog } from '@/components/attendance/dialogs'
import { ImportDialog } from '@/components/attendance/import-dialog'
import { LogSheet } from '@/components/attendance/log-sheet'
import { Pager, usePaging } from '@/components/attendance/pager'
import { ReviewSheet } from '@/components/attendance/review-sheet'
import { RecapTable } from '@/components/attendance/recap-table'
import type { AttendanceApi } from '@/components/attendance/use-attendance'
import { StatCard } from '@/components/dashboard/stat-card'
import { DatePicker } from '@/components/employee/date-picker'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { TransitionAlert } from '@/components/transition-alert'
import { attPeriods, periodForId, periodSelectLabel } from '@/data/master/attendance-rules'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  approverOf,
  buildRecap,
  DEFAULT_DATE,
  describe,
  empByNik,
  isWeekend,
  PERIOD,
  periodStats,
  SHIFTS,
  dayName,
  type DayRecord, escalationLabel, escalationOf } from '@/data/attendance'
import { atasanOf, ROSTER } from '@/data/employees'
import { useDirectoryNav } from '@/lib/directory-nav'
import { Info } from 'lucide-react'
import { inScope, teamNote, type CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'

const ALL = 'all'
type StatusTab = 'all' | 'anomali' | 'pending' | 'telat' | 'hadir'

export default function AttendancePage({ api, user, otPending = 0, verifItems = [], focusId = null }: { api: AttendanceApi; user: CurrentUser; otPending?: number; verifItems?: string[]; focusId?: string | null }) {
  const { state } = api
  const closed = state.closed
  const { openDiscipline } = useDirectoryNav()
  // Alfa berturut-turut >= 5 hari kerja: tawarkan Surat Panggilan (Hubungan Industrial › Disiplin).
  const alfaStreaks = useMemo(() => {
    const byNik = new Map<string, DayRecord[]>()
    for (const r of state.records) if (r.nik) byNik.set(r.nik, [...(byNik.get(r.nik) ?? []), r])
    const out: { nik: string; n: number; from: string; to: string }[] = []
    for (const [nik, list] of byNik) {
      const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
      let run: DayRecord[] = []
      const flush = () => { if (run.length >= 5) out.push({ nik, n: run.length, from: run[0].date, to: run[run.length - 1].date }); run = [] }
      for (const r of sorted) { if (describe(r).key === 'alfa') run.push(r); else flush() }
      flush()
    }
    return out
  }, [state.records])
  const [attPeriodId, setAttPeriodId] = useState('2026-10')
  const attPeriod = periodForId(attPeriodId)
  const isOkt = attPeriodId === '2026-10'
  const [view, setView] = useState('harian')
  // Dibuka dari Dashboard (anomali): langsung ke tanggal dan pegawai pada baris tersebut.
  const focusRec = focusId ? state.records.find((r) => r.id === focusId) : undefined
  const [date, setDate] = useState(focusRec?.date ?? DEFAULT_DATE)
  const [statusTab, setStatusTab] = useState<StatusTab>('all')
  const [search, setSearch] = useState(() => empByNik(focusRec?.nik ?? null)?.nama ?? '')
  const [dept, setDept] = useState(ALL)
  const [shift, setShift] = useState(ALL)
  const [koreksi, setKoreksi] = useState<DayRecord | null>(null)
  const [log, setLog] = useState<DayRecord | null>(null)
  const [alfa, setAlfa] = useState<DayRecord | null>(null)
  const [mapRec, setMapRec] = useState<DayRecord | null>(null)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)

  const reviewRec = state.records.find((r) => r.id === reviewId) ?? null
  const isAdmin = user.role === 'admin'

  const isSpv = user.role === 'supervisor'
  const scopedRecords = useMemo(() => state.records.filter((r) => inScope(user, empByNik(r.nik))), [state.records, user])
  const stats = useMemo(() => periodStats(scopedRecords), [scopedRecords])
  const recap = useMemo(() => buildRecap(scopedRecords), [scopedRecords])

  const dayRows = useMemo<DayRow[]>(() => {
    if (isWeekend(date)) {
      const niks = new Set(scopedRecords.map((r) => r.nik).filter(Boolean))
      return ROSTER.filter((e) => niks.has(e.nik)).map((emp) => ({ key: emp.nik, emp, libur: true }))
    }
    return scopedRecords
      .filter((r) => r.date === date)
      .map((rec) => ({ key: rec.id, rec, emp: empByNik(rec.nik), desc: describe(rec) }))
  }, [scopedRecords, date])

  const counts = {
    all: dayRows.length,
    anomali: dayRows.filter((r) => r.desc?.anomaly).length,
    pending: dayRows.filter((r) => r.desc?.pending).length,
    telat: dayRows.filter((r) => (r.desc?.telat ?? 0) > 0).length,
    hadir: dayRows.filter((r) => r.desc?.key === 'hadir').length,
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return dayRows.filter((r) => {
      const d = r.desc
      if (statusTab === 'anomali' && !d?.anomaly) return false
      if (statusTab === 'pending' && !d?.pending) return false
      if (statusTab === 'telat' && !(d && d.telat > 0)) return false
      if (statusTab === 'hadir' && d?.key !== 'hadir') return false
      if (dept !== ALL && r.emp?.department !== dept) return false
      if (shift !== ALL && r.emp?.shift !== shift) return false
      if (q && !(r.emp ? `${r.emp.nama} ${r.emp.nik}`.toLowerCase().includes(q) : `pin ${r.rec?.pin}`.includes(q))) return false
      return true
    })
  }, [dayRows, statusTab, search, dept, shift])

  const depts = useMemo(() => [...new Set(ROSTER.filter((e) => inScope(user, e) && (e.pin || e.nik === 'PPI-2025-0071')).map((e) => e.department))].sort(), [user])
  const dailyPaging = usePaging(filtered, `${date}|${statusTab}|${search}|${dept}|${shift}`, 25)
  const recapPaging = usePaging(recap, 'recap', 25)

  const fa = filtered.filter((r) => r.desc?.anomaly).length
  const fp = filtered.filter((r) => r.desc?.pending).length
  const summary = isWeekend(date)
    ? `Menampilkan ${filtered.length} pegawai pada ${formatDate(date)} (${dayName(date)}, hari libur).`
    : `Menampilkan ${filtered.length} pegawai pada ${formatDate(date)} (${fa} anomali, ${fp} menunggu approval).`
  const filterActive = search !== '' || dept !== ALL || shift !== ALL || statusTab !== 'all'

  const actorFor = (r: DayRecord): CurrentUser => {
    const emp = empByNik(r.nik)
    if (user.role !== 'manager' || !r.pending || !emp) return user
    const onBehalf = approverOf(r.pending) === 'supervisor' ? atasanOf(emp) : escalationOf(r.pending)
    return onBehalf && onBehalf.id !== 'manager' ? { ...user, nama: `${user.nama} (mewakili ${onBehalf.nama})` } : user
  }
  const nameOf = (r: DayRecord) => empByNik(r.nik)?.nama ?? `PIN ${r.pin}`
  const blocked = stats.anomali > 0 || stats.pending > 0 || otPending > 0 || verifItems.length > 0
  const verifText = verifItems.length ? ` ${verifItems.length} item menunggu verifikasi HRD: ${verifItems.slice(0, 4).join('; ')}${verifItems.length > 4 ? '…' : ''}.` : ''

  const kpiFilter = (t: StatusTab) => {
    setView('harian')
    setStatusTab((cur) => (cur === t ? 'all' : t))
  }

  const actions = {
    onKoreksi: setKoreksi,
    onAlfa: setAlfa,
    onMap: setMapRec,
    onLog: setLog,
    onReview: (r: DayRecord) => setReviewId(r.id),
  }

  const lockTip = (label: string, tip: string | null, button: React.ReactNode) =>
    tip ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-label={`${label} (tidak tersedia)`}>
            {button}
          </span>
        </TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
    ) : (
      button
    )

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Absensi Harian &amp; Rekap</h1>
          <p className="text-sm text-muted-foreground">Import log mesin absen, selesaikan anomali, lalu closing untuk Payroll</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={attPeriodId} onValueChange={setAttPeriodId}>
            <SelectTrigger aria-label="Periode" className="w-[370px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {attPeriods().filter((p) => p.id >= '2026-10').map((p) => (
                <SelectItem key={p.id} value={p.id}>{periodSelectLabel(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && lockTip(
            'Import CSV Absensi',
            closed ? 'Periode sudah closing' : null,
            <Button variant="outline" disabled={!!closed || !isOkt} onClick={() => setImportOpen(true)}>
              <Upload className="size-4" />
              Import CSV Absensi
            </Button>,
          )}
          {isAdmin && lockTip(
            'Closing Kehadiran',
            closed
              ? 'Periode sudah closing'
              : blocked
                ? `Selesaikan ${stats.anomali} anomali dan ${stats.pending} approval sebelum closing${otPending ? `; ${otPending} realisasi lembur belum divalidasi` : ''}.${verifText}`
                : null,
            <Button disabled={!!closed || blocked || !isOkt} onClick={() => setCloseOpen(true)}>
              <Lock className="size-4" />
              Closing Kehadiran
            </Button>,
          )}
        </div>
      </div>

      <TransitionAlert period={attPeriod} />
      {!isOkt ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <h2 className="text-base font-semibold">Belum ada data kehadiran</h2>
            <p className="text-sm text-muted-foreground">Periode {attPeriod.label} ({attPeriod.cutoff}) belum memiliki log mesin absen. Import CSV setelah periode berjalan.</p>
          </CardContent>
        </Card>
      ) : (
      <>
      {user.role === 'admin' && alfaStreaks.map((a) => (
        <Alert key={a.nik} variant="info">
          <Info />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{empByNik(a.nik)?.nama} Alfa {a.n} hari kerja berturut-turut ({formatDate(a.from)} – {formatDate(a.to)}).</span>
            <Button size="sm" variant="outline" onClick={() => openDiscipline(a.nik, 'Surat Panggilan')}>Buat Surat Panggilan</Button>
          </AlertDescription>
        </Alert>
      ))}
      {closed ? (
        <Alert variant="success">
          <CircleCheck />
          <AlertDescription>
            Periode {PERIOD.label} sudah closing pada {closed.at} oleh {closed.by}. Data dikirim ke Payroll.
          </AlertDescription>
        </Alert>
      ) : blocked ? (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertDescription>
            Periode belum closing: {stats.anomali} anomali dan {stats.pending} koreksi menunggu approval{otPending ? `, serta ${otPending} realisasi lembur belum divalidasi` : ''}.{verifText}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="info">
          <CircleCheck />
          <AlertDescription>Semua anomali dan koreksi sudah selesai. Periode siap di-closing.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tingkat Kehadiran"
          value={`${stats.rate.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
          icon={CalendarCheck}
          hint="Dari hari kerja efektif"
          active={statusTab === 'hadir'}
          onClick={() => kpiFilter('hadir')}
        />
        <StatCard
          label="Telat"
          value={`${stats.telat.toLocaleString('id-ID')} kali`}
          icon={Clock}
          hint="Sepanjang periode"
          active={statusTab === 'telat'}
          onClick={() => kpiFilter('telat')}
        />
        <StatCard
          label="Anomali"
          value={String(stats.anomali)}
          icon={TriangleAlert}
          hint={stats.anomali ? 'Perlu tindakan sebelum closing' : 'Semua anomali selesai'}
          active={statusTab === 'anomali'}
          onClick={() => kpiFilter('anomali')}
        />
        <StatCard
          label="Menunggu Approval"
          value={String(stats.pending)}
          icon={Hourglass}
          hint={stats.pending ? 'Menunggu persetujuan atasan' : 'Tidak ada antrean'}
          active={statusTab === 'pending'}
          onClick={() => kpiFilter('pending')}
        />
      </div>

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="harian">Harian</TabsTrigger>
          <TabsTrigger value="rekap">Rekap Periode</TabsTrigger>
        </TabsList>

        <TabsContent value="harian">
          <Card>
            <CardHeader>
              <CardTitle>Absensi Harian</CardTitle>
              <CardDescription>Pasangan scan masuk-pulang per pegawai, dengan anomali yang perlu ditindaklanjuti</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-[200px]">
                  <DatePicker id="tgl-absensi" value={date} onChange={setDate} min={PERIOD.start} max={PERIOD.end} />
                </div>
                <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
                  <TabsList className="h-auto max-w-full flex-wrap justify-start">
                    <TabsTrigger value="all">Semua ({counts.all})</TabsTrigger>
                    <TabsTrigger value="anomali">Anomali ({counts.anomali})</TabsTrigger>
                    <TabsTrigger value="pending">Menunggu Approval ({counts.pending})</TabsTrigger>
                    <TabsTrigger value="telat">Telat ({counts.telat})</TabsTrigger>
                    <TabsTrigger value="hadir">Hadir ({counts.hadir})</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input aria-label="Cari pegawai" placeholder="Cari nama atau NIP…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {!isSpv && <Select value={dept} onValueChange={setDept}>
                  <SelectTrigger aria-label="Department" className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Semua Department</SelectItem>
                    {depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>}
                <Select value={shift} onValueChange={setShift}>
                  <SelectTrigger aria-label="Shift" className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Semua Shift</SelectItem>
                    {Object.values(SHIFTS).map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  disabled={!filterActive}
                  onClick={() => {
                    setSearch('')
                    setDept(ALL)
                    setShift(ALL)
                    setStatusTab('all')
                  }}
                >
                  Reset
                </Button>
              </div>
              {isSpv && <p className="text-sm font-medium">{teamNote(user, ROSTER)}</p>}
              <p className="text-sm text-muted-foreground" aria-live="polite">{summary}</p>
              <DailyTable rows={dailyPaging.rows} user={user} closed={!!closed} actions={actions} />
            </CardContent>
            <CardFooter className="block">
              <Pager total={filtered.length} paging={dailyPaging} />
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="rekap">
          <Card>
            <CardHeader>
              <CardTitle>Rekap Periode</CardTitle>
              <CardDescription>Cut-off {PERIOD.cutoff}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSpv && <p className="text-sm font-medium">{teamNote(user, ROSTER)}</p>}
              <RecapTable rows={recapPaging.rows} all={recap} />
              <p className="text-xs text-muted-foreground">
                Kolom Alfa dipakai Payroll untuk potongan kehadiran. Hari anomali dan menunggu approval belum dihitung.
              </p>
            </CardContent>
            <CardFooter className="block">
              <Pager total={recap.length} paging={recapPaging} />
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <CorrectionSheet
        rec={koreksi}
        scans={state.scans}
        onClose={() => setKoreksi(null)}
        onSubmit={(rec, input) => {
          api.submitCorrection(rec.id, input, user)
          setKoreksi(null)
          toast.success(`Koreksi ${nameOf(rec)} diajukan · ${user.role === 'supervisor' ? `diteruskan ke ${escalationLabel({ by: user.nama })}` : 'menunggu approval Supervisor'}`)
        }}
      />
      <LogSheet rec={log} scans={state.scans} onClose={() => setLog(null)} />
      <AlfaDialog
        rec={alfa}
        onClose={() => setAlfa(null)}
        onKoreksi={(r) => {
          setAlfa(null)
          setKoreksi(r)
        }}
        onConfirm={(r) => {
          api.confirmAlfa(r.id, user)
          setAlfa(null)
          toast.success(`Alfa ${nameOf(r)} dikonfirmasi`)
        }}
      />
      <MapPinDialog
        rec={mapRec}
        pinMap={state.pinMap}
        onClose={() => setMapRec(null)}
        onSave={(pin, nik) => {
          api.mapPin(pin, nik, user)
          setMapRec(null)
          toast.success(`PIN ${pin} dipetakan ke ${empByNik(nik)?.nama}`)
        }}
      />
      <ReviewSheet
        rec={reviewRec}
        user={user}
        onClose={() => setReviewId(null)}
        onApprove={(r) => {
          api.approve(r.id, actorFor(r))
          setReviewId(null)
          toast.success(`Koreksi ${nameOf(r)} disetujui`)
        }}
        onReject={(r, alasan) => {
          api.reject(r.id, alasan, actorFor(r))
          setReviewId(null)
          toast.success(`Koreksi ${nameOf(r)} ditolak`)
        }}
      />
      </>
      )}

      <ImportDialog
        open={importOpen}
        state={state}
        onClose={() => setImportOpen(false)}
        onImport={(parsed) => {
          const res = api.importScans(parsed.rows)
          setImportOpen(false)
          if (res.fresh === 0)
            toast(`0 scan baru, ${res.existing.toLocaleString('id-ID')} sudah ada sebelumnya`)
          else toast.success(`Import selesai · ${res.fresh.toLocaleString('id-ID')} scan baru diproses`)
        }}
      />

      <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Closing kehadiran periode {PERIOD.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Data kehadiran {PERIOD.cutoff} dikunci dan dikirim ke Payroll. Perubahan setelah closing memerlukan pembukaan periode oleh HR &amp; GA Manager.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                api.close(user)
                toast.success(`Kehadiran periode ${PERIOD.label} berhasil di-closing`)
              }}
            >
              Closing Kehadiran
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
