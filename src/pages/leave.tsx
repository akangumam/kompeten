import { can } from '@/lib/access'
import { TransitionAlert } from '@/components/transition-alert'
import { periodSelectLabel } from '@/data/master/attendance-rules'
import { useMemo, useState } from 'react'
import { CalendarPlus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Pager, usePaging } from '@/components/attendance/pager'
import { AjukanSheet } from '@/components/leave/ajukan-sheet'
import { RequestTable } from '@/components/leave/request-table'
import { SaldoTable } from '@/components/leave/saldo-table'
import { CancelDialog, RequestCancelDialog, TinjauSheet } from '@/components/leave/tinjau-sheet'
import type { LeaveApi } from '@/components/leave/use-leave'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CORE, ROSTER } from '@/data/employees'
import { useTrx } from '@/data/transactions'
import { approverLabel, empOf, inPeriod, isOpen, isVerif, JENIS, CURRENT_PERIOD_ID, LEAVE_PERIODS, type LeaveRequest } from '@/data/leave'
import { inScope, teamNote, type CurrentUser } from '@/data/users'

const ALL = 'all'
type Tab = 'all' | 'menunggu' | 'verif' | 'disetujui' | 'ditolak' | 'dibatalkan'

export default function LeavePage({ api, user, octClosed }: { api: LeaveApi; user: CurrentUser; octClosed: boolean }) {
  const { requests: allRequests } = api
  const isSpv = user.role === 'supervisor'
  const requests = useMemo(() => allRequests.filter((r) => inScope(user, empOf(r.nik))), [allRequests, user])
  const trxVersion = useTrx()
  const scopedRoster = useMemo(() => CORE.filter((e) => inScope(user, e)), [user, trxVersion])
  const [view, setView] = useState('pengajuan')
  const [periodId, setPeriodId] = useState(CURRENT_PERIOD_ID)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [jenis, setJenis] = useState(ALL)
  const [dept, setDept] = useState(ALL)
  const [ajukan, setAjukan] = useState(false)
  const [sheet, setSheet] = useState<{ no: string; mode: 'review' | 'verify' | 'detail' } | null>(null)
  const [askCancelNo, setAskCancelNo] = useState<string | null>(null)
  const [cancelNo, setCancelNo] = useState<string | null>(null)

  const period = LEAVE_PERIODS.find((p) => p.id === periodId)!
  const depts = useMemo(() => [...new Set(scopedRoster.map((e) => e.department))].sort(), [scopedRoster])
  const inPer = useMemo(() => requests.filter((r) => inPeriod(r.start, period)), [requests, period])

  const counts = {
    all: inPer.length,
    menunggu: inPer.filter((r) => isOpen(r.status)).length,
    verif: inPer.filter((r) => isVerif(r.status)).length,
    disetujui: inPer.filter((r) => r.status === 'disetujui').length,
    ditolak: inPer.filter((r) => r.status === 'ditolak').length,
    dibatalkan: inPer.filter((r) => r.status === 'dibatalkan').length,
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return inPer.filter((r) => {
      const e = empOf(r.nik)
      if (tab === 'menunggu' ? !isOpen(r.status) : tab === 'verif' ? !isVerif(r.status) : tab !== 'all' && r.status !== tab) return false
      if (jenis !== ALL && r.jenis !== jenis) return false
      if (dept !== ALL && e.department !== dept) return false
      if (q && !`${e.nama} ${e.nik} ${r.no}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [inPer, tab, jenis, dept, search])

  const filterActive = search !== '' || jenis !== ALL || dept !== ALL || tab !== 'all'
  const paging = usePaging(filtered, `${periodId}|${tab}|${search}|${jenis}|${dept}`, 10)
  const saldoPaging = usePaging(scopedRoster, 'saldo', 10)

  const active: LeaveRequest | null = sheet ? allRequests.find((r) => r.no === sheet.no) ?? null : null
  const cancelReq = allRequests.find((r) => r.no === cancelNo) ?? null
  const askCancelReq = allRequests.find((r) => r.no === askCancelNo) ?? null

  const summary = `Menampilkan ${filtered.length} pengajuan periode ${period.label} (${period.cutoff})${
    filterActive ? ' dengan filter aktif' : ''
  }, ${filtered.filter((r) => isOpen(r.status)).length} menunggu keputusan.`

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cuti, Izin, Sakit &amp; Dinas</h1>
          <p className="text-sm text-muted-foreground">Pengajuan ketidakhadiran terencana dan saldo cuti pegawai</p>
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
          {can(user, 'attendance.manage') && (
            <Button onClick={() => setAjukan(true)}>
              <CalendarPlus className="size-4" />
              Ajukan
            </Button>
          )}
        </div>
      </div>
      <TransitionAlert period={period} />

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="pengajuan">Pengajuan</TabsTrigger>
          <TabsTrigger value="saldo">Saldo Cuti</TabsTrigger>
        </TabsList>

        <TabsContent value="pengajuan">
          <Card>
            <CardHeader>
              <CardTitle>Pengajuan</CardTitle>
              <CardDescription>Cuti, izin, sakit, dan dinas yang menjadi dasar status di Absensi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
                <TabsList className="h-auto max-w-full flex-wrap justify-start">
                  <TabsTrigger value="all">Semua ({counts.all})</TabsTrigger>
                  <TabsTrigger value="menunggu">Menunggu ({counts.menunggu})</TabsTrigger>
                  {can(user, 'attendance.manage') && <TabsTrigger value="verif">Perlu Verifikasi ({counts.verif})</TabsTrigger>}
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
                <Select value={jenis} onValueChange={setJenis}>
                  <SelectTrigger aria-label="Jenis" className="w-[170px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Semua Jenis</SelectItem>
                    {JENIS.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!isSpv && <Select value={dept} onValueChange={setDept}>
                  <SelectTrigger aria-label="Department" className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Semua Department</SelectItem>
                    {depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>}
                <Button
                  variant="outline"
                  disabled={!filterActive}
                  onClick={() => {
                    setSearch('')
                    setJenis(ALL)
                    setDept(ALL)
                    setTab('all')
                  }}
                >
                  Reset
                </Button>
              </div>
              {isSpv && <p className="text-sm font-medium">{teamNote(user, ROSTER)}</p>}
              <p className="text-sm text-muted-foreground" aria-live="polite">{summary}</p>
              <RequestTable
                rows={paging.rows}
                user={user}
                onReview={(r) => setSheet({ no: r.no, mode: 'review' })}
                onDetail={(r) => setSheet({ no: r.no, mode: 'detail' })}
                onCancel={(r) => setCancelNo(r.no)}
                onVerify={(r) => setSheet({ no: r.no, mode: 'verify' })}
                onRequestCancel={(r) => setAskCancelNo(r.no)}
              />
            </CardContent>
            <CardFooter className="block">
              <Pager total={filtered.length} paging={paging} />
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="saldo">
          <Card>
            <CardHeader>
              <CardTitle>Saldo Cuti Tahunan</CardTitle>
              <CardDescription>Hak 12 hari per periode hak, dihitung sejak 12 bulan masa kerja. Sisa = Hak − Cuti Bersama − Terpakai − Dipesan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSpv && <p className="text-sm font-medium">{teamNote(user, ROSTER)}</p>}
              <SaldoTable rows={saldoPaging.rows} requests={allRequests} />
            </CardContent>
            <CardFooter className="block">
              <Pager total={scopedRoster.length} paging={saldoPaging} />
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <AjukanSheet
        open={ajukan}
        onOpenChange={setAjukan}
        requests={allRequests}
        octClosed={octClosed}
        onSubmit={(input) => {
          const r = api.submit(input, user)
          setAjukan(false)
          toast.success(`Pengajuan ${r.no} dikirim ke ${approverLabel(r.nik)}`)
        }}
      />
      <TinjauSheet
        req={active}
        mode={sheet?.mode ?? 'detail'}
        all={allRequests}
        user={user}
        onClose={() => setSheet(null)}
        onApprove={(r) => {
          api.approve(r.no, user)
          setSheet(null)
          if (r.status === 'pembatalan') toast.success(`Pembatalan ${r.no} disetujui${r.jenis === 'Cuti Tahunan' ? `, saldo dikembalikan ${r.hari} hari` : ''}`)
          else if (r.jenis === 'Sakit' || r.jenis === 'Dinas') toast.success(`Pengajuan ${r.no} disetujui, menunggu verifikasi HRD`)
          else toast.success(`Pengajuan ${r.no} disetujui`)
        }}
        onReject={(r, alasan) => {
          api.reject(r.no, user, alasan)
          setSheet(null)
          if (r.status === 'pembatalan') toast.success(`Pembatalan ${r.no} ditolak, cuti tetap Disetujui`)
          else toast.success(`Pengajuan ${r.no} ditolak${r.jenis === 'Cuti Tahunan' ? ', saldo dikembalikan' : ''}`)
        }}
        onVerify={(r, kategori) => {
          api.verify(r.no, user, kategori)
          setSheet(null)
          toast.success(`Pengajuan ${r.no} diverifikasi`)
        }}
        onGiveBack={(r, alasan) => {
          api.giveBack(r.no, user, alasan)
          setSheet(null)
          toast.success(`Pengajuan ${r.no} dikembalikan`)
        }}
      />
      <RequestCancelDialog
        req={askCancelReq}
        onClose={() => setAskCancelNo(null)}
        onConfirm={(r, alasan) => {
          api.requestCancel(r.no, user, alasan)
          setAskCancelNo(null)
          toast.success(`Pembatalan ${r.no} diajukan ke ${approverLabel(r.nik)}`)
        }}
      />
      <CancelDialog
        req={cancelReq}
        onClose={() => setCancelNo(null)}
        onConfirm={(r, alasan) => {
          api.cancel(r.no, user, alasan)
          setCancelNo(null)
          toast.success(`Pengajuan ${r.no} dibatalkan`)
        }}
      />
    </div>
  )
}
