import { can } from '@/lib/access'
import { TransitionAlert } from '@/components/transition-alert'
import { periodSelectLabel } from '@/data/master/attendance-rules'
import { useMemo, useState } from 'react'
import { CalendarClock, Clock, FilePlus, Hourglass, Search, Users, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Pager, usePaging } from '@/components/attendance/pager'
import { StatCard } from '@/components/dashboard/stat-card'
import { BuatSplSheet } from '@/components/overtime/buat-spl-sheet'
import { OtTable, type OtRow } from '@/components/overtime/ot-table'
import { RekapTable } from '@/components/overtime/rekap-table'
import { SlipDialog } from '@/components/overtime/slip-dialog'
import { CancelOtDialog, TinjauOtSheet } from '@/components/overtime/tinjau-ot-sheet'
import type { OvertimeApi } from '@/components/overtime/use-overtime'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { Scan } from '@/data/attendance'
import { ROSTER } from '@/data/employees'
import { empOf, inPeriod, isPeriodClosed, CURRENT_PERIOD_ID, LEAVE_PERIODS, type LeaveRequest } from '@/data/leave'
import { dayTypeOf, effStatus, fj, isAwaitingValidation, paidOf, realisasiOf, rekapFor, rp, type OtRecord, type RekapRow } from '@/data/overtime'
import { inScope, teamNote, type CurrentUser } from '@/data/users'

const ALL = 'all'
type Tab = 'all' | 'menunggu' | 'validasi' | 'verif' | 'terjadwal' | 'tervalidasi' | 'lainnya'

export default function OvertimePage({
  api,
  user,
  scans,
  leaves,
  octClosed,
}: {
  api: OvertimeApi
  user: CurrentUser
  scans: Scan[]
  leaves: LeaveRequest[]
  octClosed: boolean
}) {
  const isSpv = user.role === 'supervisor'
  const showPay = !isSpv
  const canCreate = can(user, 'attendance.manage') || user.role === 'supervisor'
  const [view, setView] = useState('lembur')
  const [periodId, setPeriodId] = useState(CURRENT_PERIOD_ID)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [dayType, setDayType] = useState(ALL)
  const [buat, setBuat] = useState(false)
  const [sheet, setSheet] = useState<{ id: string; mode: 'review' | 'verify' | 'detail' } | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [slip, setSlip] = useState<RekapRow | null>(null)

  const period = LEAVE_PERIODS.find((p) => p.id === periodId)!
  const final = isPeriodClosed(period, octClosed)

  const scoped = useMemo(() => api.records.filter((r) => inScope(user, empOf(r.nik))), [api.records, user])
  const rows: OtRow[] = useMemo(
    () =>
      scoped
        .filter((r) => inPeriod(r.date, period))
        .map((rec) => {
          const real = realisasiOf(rec, scans)
          return { rec, emp: empOf(rec.nik), status: effStatus(rec), real, paid: paidOf(rec, real) }
        })
        .sort((a, b) => b.rec.date.localeCompare(a.rec.date) || b.rec.no.localeCompare(a.rec.no)),
    [scoped, period, scans],
  )

  const group = (s: OtRow['status']): Tab =>
    s === 'menunggu-approval' || isAwaitingValidation(s) || s === 'menunggu-verifikasi' ? 'menunggu' : s === 'terjadwal' ? 'terjadwal' : s === 'tervalidasi' ? 'tervalidasi' : 'lainnya'
  const counts = {
    all: rows.length,
    menunggu: rows.filter((r) => group(r.status) === 'menunggu').length,
    verif: rows.filter((r) => r.status === 'menunggu-verifikasi').length,
    terjadwal: rows.filter((r) => r.status === 'terjadwal').length,
    tervalidasi: rows.filter((r) => r.status === 'tervalidasi').length,
    lainnya: rows.filter((r) => group(r.status) === 'lainnya').length,
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (tab === 'validasi' ? !isAwaitingValidation(r.status) : tab === 'verif' ? r.status !== 'menunggu-verifikasi' : tab !== 'all' && group(r.status) !== tab) return false
      if (dayType !== ALL && dayTypeOf(r.emp, r.rec.date) !== dayType) return false
      if (q && !`${r.emp.nama} ${r.emp.nik} ${r.rec.no}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, tab, dayType, search])

  const validated = rows.filter((r) => r.status === 'tervalidasi')
  const jamValid = validated.reduce((s, r) => s + (r.paid?.jam ?? 0), 0)
  const biaya = validated.reduce((s, r) => s + (r.paid?.nominal ?? 0), 0)
  const waiting = rows.filter((r) => isAwaitingValidation(r.status)).length
  const scheduled = rows.filter((r) => r.status === 'terjadwal').length
  const people = new Set(validated.map((r) => r.rec.nik)).size

  const rekapAll = useMemo(() => rekapFor(scoped, scans, period), [scoped, scans, period])
  const rekapPaging = usePaging(rekapAll, `${periodId}|rekap`, 10)
  const paging = usePaging(filtered, `${periodId}|${tab}|${search}|${dayType}`, 10)
  const filterActive = search !== '' || dayType !== ALL || tab !== 'all'

  const active: OtRecord | null = sheet ? api.records.find((r) => r.id === sheet.id) ?? null : null
  const cancelRec = api.records.find((r) => r.id === cancelId) ?? null
  const actor = { role: user.role, nama: user.nama, nik: user.nik }
  const emp = (r: OtRecord) => empOf(r.nik).nama

  const summary = `Menampilkan ${filtered.length} lembur periode ${period.label} (${period.cutoff})${filterActive ? ' dengan filter aktif' : ''}, ${waiting} menunggu validasi.`

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Input &amp; Slip Overtime</h1>
          <p className="text-sm text-muted-foreground">Surat Perintah Lembur, realisasi dari scan absen, dan slip lembur</p>
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
          {canCreate && (
            <Button onClick={() => setBuat(true)}>
              <FilePlus className="size-4" />
              Buat SPL
            </Button>
          )}
        </div>
      </div>
      <TransitionAlert period={period} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jam Lembur Tervalidasi" value={`${fj(jamValid)} jam`} icon={Clock} hint={`${validated.length} lembur tervalidasi`} />
        <StatCard
          label="Menunggu Validasi"
          value={String(waiting)}
          icon={Hourglass}
          hint={waiting ? 'Perlu divalidasi atasan' : 'Tidak ada antrean'}
          active={tab === 'validasi'}
          onClick={() => {
            setView('lembur')
            setTab((t) => (t === 'validasi' ? 'all' : 'validasi'))
          }}
        />
        <StatCard label="Lembur Terjadwal" value={`${scheduled} SPL`} icon={CalendarClock} hint="Belum dilaksanakan" />
        {showPay ? (
          <StatCard label="Biaya Lembur Tervalidasi" value={rp(biaya)} icon={Wallet} hint="Periode terpilih" />
        ) : (
          <StatCard label="Pegawai Lembur" value={`${people} orang`} icon={Users} hint="Dengan lembur tervalidasi" />
        )}
      </div>

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="lembur">Lembur</TabsTrigger>
          <TabsTrigger value="rekap">Rekap &amp; Slip</TabsTrigger>
        </TabsList>

        <TabsContent value="lembur">
          <Card>
            <CardHeader>
              <CardTitle>Lembur</CardTitle>
              <CardDescription>Satu baris per pegawai per SPL; realisasi dihitung dari scan absen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSpv && <p className="text-sm text-muted-foreground">{teamNote(user, ROSTER)}</p>}
              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
                <TabsList className="h-auto max-w-full flex-wrap justify-start">
                  <TabsTrigger value="all">Semua ({counts.all})</TabsTrigger>
                  <TabsTrigger value="menunggu">Menunggu ({counts.menunggu})</TabsTrigger>
                  {can(user, 'attendance.manage') && <TabsTrigger value="verif">Perlu Verifikasi ({counts.verif})</TabsTrigger>}
                  <TabsTrigger value="terjadwal">Terjadwal ({counts.terjadwal})</TabsTrigger>
                  <TabsTrigger value="tervalidasi">Tervalidasi ({counts.tervalidasi})</TabsTrigger>
                  <TabsTrigger value="lainnya">Lainnya ({counts.lainnya})</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-[22rem]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input aria-label="Cari lembur" placeholder="Cari nama, NIP, atau nomor SPL…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={dayType} onValueChange={setDayType}>
                  <SelectTrigger aria-label="Jenis Hari" className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Semua Jenis Hari</SelectItem>
                    <SelectItem value="kerja">Hari kerja</SelectItem>
                    <SelectItem value="istirahat">Hari istirahat</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" disabled={!filterActive} onClick={() => { setSearch(''); setDayType(ALL); setTab('all') }}>
                  Reset
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{summary}</p>
              <OtTable
                rows={paging.rows.map((r) => filtered.find((f) => f.rec.id === r.rec.id)!)}
                user={user}
                showPay={showPay}
                onReview={(r) => setSheet({ id: r.id, mode: 'review' })}
                onDetail={(r) => setSheet({ id: r.id, mode: 'detail' })}
                onCancel={(r) => setCancelId(r.id)}
                onVerify={(r) => setSheet({ id: r.id, mode: 'verify' })}
              />
            </CardContent>
            <CardFooter className="block">
              <Pager total={filtered.length} paging={paging} />
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="rekap">
          <Card>
            <CardHeader>
              <CardTitle>Rekap &amp; Slip</CardTitle>
              <CardDescription>Lembur tervalidasi per pegawai periode {period.label}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSpv && <p className="text-sm text-muted-foreground">{teamNote(user, ROSTER)}</p>}
              <RekapTable rows={rekapPaging.rows} totals={rekapAll} showPay={showPay} final={final} onSlip={setSlip} />
            </CardContent>
            <CardFooter className="block">
              <Pager total={rekapAll.length} paging={rekapPaging} />
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <BuatSplSheet
        open={buat}
        onOpenChange={setBuat}
        user={user}
        records={api.records}
        leaves={leaves}
        octClosed={octClosed}
        onSubmit={(input) => {
          const res = api.create(input, actor)
          setBuat(false)
          toast.success(
            res.status === 'terjadwal'
              ? `SPL ${res.no} diterbitkan untuk ${input.niks.length} pegawai`
              : `SPL ${res.no} diajukan ke ${res.approvers.join(', ')} untuk approval`,
          )
        }}
      />
      <TinjauOtSheet
        rec={active}
        mode={sheet?.mode ?? 'detail'}
        records={api.records}
        scans={scans}
        leaves={leaves}
        user={user}
        onClose={() => setSheet(null)}
        onApprove={(r) => { api.approve(r.id, actor); setSheet(null); toast.success(`SPL ${r.no} untuk ${emp(r)} disetujui`) }}
        onReject={(r, a) => { api.reject(r.id, actor, a); setSheet(null); toast.success(`SPL ${r.no} untuk ${emp(r)} ditolak`) }}
        onValidate={(r, j, k, ist) => { api.validate(r.id, actor, j, k, ist); setSheet(null); toast.success(`Lembur ${emp(r)} divalidasi (${fj(j)} jam), menunggu verifikasi HRD`) }}
        onVerify={(r, j, ist) => { api.verify(r.id, actor, j, ist); setSheet(null); toast.success(`Lembur ${emp(r)} diverifikasi (${fj(j)} jam)`) }}
        onTidak={(r) => { api.markTidak(r.id, actor); setSheet(null); toast.success(`Lembur ${emp(r)} ditandai tidak terealisasi`) }}
      />
      <CancelOtDialog
        rec={cancelRec}
        onClose={() => setCancelId(null)}
        onConfirm={(r, a) => { api.cancel(r.id, actor, a); setCancelId(null); toast.success(`SPL ${r.no} untuk ${emp(r)} dibatalkan`) }}
      />
      <SlipDialog row={slip} period={period} final={final} onClose={() => setSlip(null)} />
    </div>
  )
}
