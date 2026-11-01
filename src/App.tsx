import { useCallback, useEffect, useRef, useState } from 'react'
import { pageTitleFor, formatDocTitle } from '@/lib/page-title'
import { DEMO_TODAY } from '@/lib/today'
import { AppSidebar } from '@/components/app-sidebar'
import { ANDI_ID, fillLevelDefaults, makeBlankRecord, makeRecord, nikFor, ROSTER, type DraftRecord } from '@/data/employees'
import { atasanForPlacement, atasanName, DEFAULT_FILTERS, teamOf, type DirFilters, type DirPreset, type DirRef } from '@/data/directory'
import { exitedRecord, rosterRecord } from '@/data/profiles'
import { DirectoryNavContext } from '@/lib/directory-nav'
import EmployeesPage from '@/pages/employees'
import { toast } from 'sonner'
import { CANDIDATES } from '@/data/candidates'
import { markGenerated } from '@/data/recruitment/flow'
import { offerOf } from '@/data/recruitment/offers'
import { useRecruitment } from '@/data/recruitment/store'
import RecruitmentJobsPage from '@/pages/recruitment-jobs'
import RecruitmentFormPage from '@/pages/recruitment-form'
import RecruitmentTestsPage from '@/pages/recruitment-tests'
import { AppFooter } from '@/components/app-footer'
import { Topbar } from '@/components/topbar'
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
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import CompetencyPage from '@/pages/competency'
import TrainingPage from '@/pages/training'
import KpiPage from '@/pages/kpi'
import { canAccessCompetency } from '@/data/competency/assessments'
import DashboardPage, { tabsFor, type TabId as DashTab } from '@/pages/dashboard'
import EmployeeDraftPage from '@/pages/employee-draft'
import EmployeeTransactionsPage from '@/pages/employee-transactions'
import IndustrialRelationsPage, { type IrIntent } from '@/pages/industrial-relations'
import { useDiscipline } from '@/data/discipline'
import FinalPayPage from '@/pages/final-pay'
import { useFinalPay } from '@/data/finalpay'
import { useOffboarding, type Off } from '@/data/offboarding'
import { isPending, isVerif } from '@/data/leave'
import { useTrx } from '@/data/transactions'
import RecruitmentPage from '@/pages/recruitment'
import AttendancePage from '@/pages/attendance'
import LeavePage from '@/pages/leave'
import OvertimePage from '@/pages/overtime'
import { useOvertime } from '@/components/overtime/use-overtime'
import ShiftSwapPage from '@/pages/shift-swap'
import { useShiftSwaps } from '@/components/shift/use-shift-swaps'
import { PERIOD } from '@/data/attendance'
import { pendingVerification } from '@/data/verification'
import { durJam, effStatus, isAwaitingValidation, realisasiOf, unvalidatedCount } from '@/data/overtime'
import { useLeave } from '@/components/leave/use-leave'
import { useAttendance } from '@/components/attendance/use-attendance'
import { USERS, type Role } from '@/data/users'
import MasterDataPage from '@/pages/master-data'
import PayrollComponentsPage from '@/pages/payroll-components'
import PayrollRunPage from '@/pages/payroll-run'
import SalaryChangePage from '@/pages/salary-change'
import PayslipsPage from '@/pages/payslips'
import PaymentsPage from '@/pages/payments'
import PayrollReconPage from '@/pages/payroll-recon'
import CoopMembersPage from '@/pages/coop-members'
import CoopWithdrawalsPage from '@/pages/coop-withdrawals'
import CoopSettingsPage from '@/pages/coop-settings'
import CoopShuPage from '@/pages/coop-shu'
import CoopBudgetPage from '@/pages/coop-budget'
import CoopTradingPage from '@/pages/coop-trading'
import CoopCashAdvancePage from '@/pages/coop-cash-advance'
import CoopLoansPage from '@/pages/coop-loans'
import CoopPayrollDeductionsPage from '@/pages/coop-payroll-deductions'
import { isKsbRole } from '@/data/koperasi/ksb'
import { useKoperasi } from '@/data/koperasi/store'
import { PortalShell, type PortalPersona } from '@/components/portal/portal-shell'
import { useMaster } from '@/data/master/store'
import { completeScenario, periodFinalized, type PeriodId } from '@/data/payroll/runs'
import { usePayroll } from '@/data/payroll/store'
import { enrollNewHire } from '@/data/payroll/bpjs-membership'

export type PageId = 'dashboard' | 'recruitment' | 'recruitment-jobs' | 'recruitment-form' | 'recruitment-tests' | 'employees' | 'payroll-components' | 'salary-change' | 'payroll-run' | 'payslips' | 'payments' | 'payroll-recon' | 'coop-members' | 'coop-withdrawals' | 'coop-cash-advance' | 'coop-loans' | 'coop-payroll-deductions' | 'coop-budget' | 'coop-shu' | 'coop-settings' | 'coop-trading' | 'employee-draft' | 'employee-transactions' | 'industrial-relations' | 'final-pay' | 'attendance' | 'leave' | 'shift-swap' | 'overtime' | 'master-data' | 'dev-competency' | 'dev-training' | 'dev-kpi'

type Profile = { kind: 'draft'; id: string } | { kind: 'roster'; nik: string } | { kind: 'exited'; nik: string }

const PAYROLL_PAGES: PageId[] = ['final-pay', 'payroll-components', 'salary-change', 'payroll-run', 'payslips', 'payments', 'payroll-recon']
const COOP_PAGES: PageId[] = ['coop-members', 'coop-withdrawals', 'coop-cash-advance', 'coop-loans', 'coop-payroll-deductions', 'coop-budget', 'coop-shu', 'coop-settings', 'coop-trading']

export default function App() {
  const [open, setOpen] = useState(true)
  const [activePage, setActivePage] = useState<PageId>('dashboard')
  // Satu state tab Dashboard menggerakkan tab, breadcrumb, dan judul tab browser.
  const [dashTabState, setDashTab] = useState<DashTab>('umum')
  useRecruitment()
  const candidates = CANDIDATES
  const [drafts, setDrafts] = useState<Record<string, DraftRecord>>({})
  const [profile, setProfile] = useState<Profile>({ kind: 'draft', id: ANDI_ID })
  const [profileFrom, setProfileFrom] = useState<'directory' | 'recruitment'>('recruitment')
  const [rosterEdits, setRosterEdits] = useState<Record<string, DraftRecord>>({})
  const [dirFilters, setDirFilters] = useState<DirFilters>(DEFAULT_FILTERS)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null)
  const dirtyRef = useRef(false)
  const mainRef = useRef<HTMLElement>(null)
  const [role, setRole] = useState<Role>('admin')
  const [portalPersona, setPortalPersona] = useState<PortalPersona | null>(null)
  const attendance = useAttendance()
  const leave = useLeave()
  const overtime = useOvertime()
  const swaps = useShiftSwaps()
  useMaster()
  usePayroll()
  useKoperasi()
  useTrx()
  useDiscipline()
  useOffboarding()
  useFinalPay()
  const [finalPayFocus, setFinalPayFocus] = useState<string | undefined>(undefined)
  const [irIntent, setIrIntent] = useState<IrIntent | undefined>(undefined)
  const [trxPeriod, setTrxPeriod] = useState<string | undefined>(undefined)
  const [payPeriod, setPayPeriod] = useState<PeriodId | undefined>(undefined)
  const [finishing, setFinishing] = useState(false)
  const dashTabs = tabsFor(role)
  const dashTab: DashTab = dashTabs.includes(dashTabState) ? dashTabState : dashTabs[0]

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    setOpen(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setOpen(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  // Area scroll hanya `main`; pindah halaman/profil mengembalikannya ke atas.
  const profileScrollKey = profile.kind === 'draft' ? `draft:${profile.id}` : `${profile.kind}:${profile.nik}`
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [activePage, profileScrollKey])

  const onDirtyChange = useCallback((d: boolean) => {
    dirtyRef.current = d
  }, [])

  const guarded = (run: () => void) => {
    if ((activePage === 'employee-draft' || activePage === 'recruitment-form') && dirtyRef.current) setPendingNav(() => run)
    else run()
  }

  const openDraft = (id: string, from: 'directory' | 'recruitment' = 'recruitment') => {
    const cand = candidates.find((c) => c.id === id)
    setDrafts((prev) => {
      const cur = prev[id]
      if (!cur) return cand ? { ...prev, [id]: makeRecord(cand, offerOf(cand.offerId)) } : prev
      if (cur.status !== 'draft') return prev
      const form = fillLevelDefaults(cur.form)
      return form === cur.form ? prev : { ...prev, [id]: { ...cur, form } }
    })
    setProfile({ kind: 'draft', id })
    setProfileFrom(from)
    setFocusId(null)
    setActivePage('employee-draft')
  }

  const openEmployee = (ref: DirRef) => {
    if (ref.type === 'draft') return openDraft(ref.key, 'directory')
    setProfile({ kind: ref.type, nik: ref.key })
    setProfileFrom('directory')
    setActivePage('employee-draft')
  }

  const openDirectory = (preset: DirPreset = {}) =>
    guarded(() => {
      setDirFilters({ ...DEFAULT_FILTERS, ...preset })
      setFocusId(null)
      setActivePage('employees')
    })

  // Sama dengan "Generate Data Pegawai" di Recruitment; klik kedua hanya membuka draft yang sudah ada.
  const generateDraft = (id: string) => {
    markGenerated(id)
    openDraft(id, 'directory')
    toast.success('Draft Pegawai berhasil dibuat')
  }

  const createDirectDraft = () => {
    const n = Object.values(drafts).filter((d) => d.source === 'langsung').length + 1
    const id = `DRF-2026-${String(n).padStart(4, '0')}`
    setDrafts((prev) => ({ ...prev, [id]: makeBlankRecord(DEMO_TODAY) }))
    setProfile({ kind: 'draft', id })
    setProfileFrom('directory')
    setActivePage('employee-draft')
    toast.success('Draft pegawai kosong dibuat')
  }

  // Halaman yang tidak boleh dibuka peran aktif kembali ke Dashboard saat pengguna demo berganti.
  useEffect(() => {
    // Koperasi adalah badan hukum terpisah: hanya pengurus KSB yang membukanya, dan mereka tidak membuka halaman HR/Payroll.
    const ksb = isKsbRole(role)
    if (ksb && activePage !== 'dashboard' && !COOP_PAGES.includes(activePage)) return setActivePage('dashboard')
    if (!ksb && COOP_PAGES.includes(activePage)) return setActivePage('dashboard')
    const noMaster = role === 'supervisor' || role === 'payroll' || role === 'finance'
    // People Development: Admin HRD, HR & GA Manager, dan Atasan; Payroll, Finance, dan KSB tidak punya akses.
    const noDev = !canAccessCompetency(role) && activePage.startsWith('dev-')
    const noPayroll = role === 'admin' || role === 'supervisor'
    // Kompensasi & Pesangon: Admin HRD membaca (jumlah terlihat); Atasan tidak pernah.
    const payrollPage = PAYROLL_PAGES.includes(activePage) && !(activePage === 'final-pay' && role === 'admin')
    // Finance hanya Daftar Pembayaran dan Rekonsiliasi Potongan; Rekonsiliasi berdiri sendiri hanya untuk Finance.
    const financeBlocked = role === 'finance' && activePage !== 'dashboard' && activePage !== 'payments' && activePage !== 'payroll-recon' && activePage !== 'final-pay'
    if (
      (noMaster && activePage === 'master-data') ||
      noDev ||
      (noPayroll && payrollPage) ||
      financeBlocked ||
      (role !== 'finance' && activePage === 'payroll-recon') ||
      (role === 'payroll' && (activePage === 'recruitment' || activePage === 'recruitment-jobs' || activePage === 'recruitment-form' || activePage === 'recruitment-tests')) ||
      (role === 'supervisor' && (activePage === 'recruitment-jobs' || activePage === 'recruitment-form' || activePage === 'recruitment-tests')) ||
      (role === 'manager' && activePage === 'recruitment-form') ||
      (role === 'finance' && activePage.startsWith('recruitment'))
    )
      setActivePage('dashboard')
  }, [role, activePage])

  // Atasan hanya boleh membuka profil anggota timnya; selain itu kembali ke Direktori.
  useEffect(() => {
    if (role !== 'supervisor' || activePage !== 'employee-draft') return
    const team = teamOf(USERS.supervisor)
    const e = profile.kind === 'roster' ? ROSTER.find((x) => x.nik === profile.nik) : undefined
    const ok = !!e && !!team && e.department === team.department && (e.section ?? e.department) === team.section
    if (!ok) setActivePage('employees')
  }, [role, activePage, profile])

  // Skenario demo: menyelesaikan anomali/approval kehadiran + validasi lembur, lalu closing periode Oktober.
  const runDemoClosing = () => {
    if (attendance.state.closed) return
    attendance.closeDemo(USERS[role])
    const demo = { role: 'admin' as const, nama: 'Skenario demo' }
    for (const r of overtime.records) {
      if (r.date < PERIOD.start || r.date > PERIOD.end || !isAwaitingValidation(effStatus(r))) continue
      const real = realisasiOf(r, attendance.state.scans)
      if (real.aktual === 0) overtime.markTidak(r.id, demo)
      else overtime.validate(r.id, demo, Math.min(durJam(r), real.aktual))
    }
    // Menyelesaikan verifikasi HRD (lembur dan Sakit/Dinas) agar closing tidak terblokir.
    overtime.verifyAll(demo, PERIOD.start, PERIOD.end)
    leave.verifyAll(demo, PERIOD.start, PERIOD.end)
    toast.success('Kehadiran Oktober 2026 ditutup oleh skenario demo')
  }

  // Skenario "Selesaikan payroll Oktober 2026": closing kehadiran dulu bila perlu, lalu payroll sampai Final dengan data terbaru.
  const finishPayroll = () => {
    if (periodFinalized('2026-10')) return
    if (!attendance.state.closed) runDemoClosing()
    setFinishing(true)
  }
  useEffect(() => {
    if (!finishing || !attendance.state.closed) return
    setFinishing(false)
    completeScenario('2026-10', { records: attendance.state.records, scans: attendance.state.scans, otRecords: overtime.records })
    toast.success('Payroll Oktober 2026 selesai dan final (skenario demo)')
  }, [finishing, attendance.state.closed, attendance.state.records, attendance.state.scans, overtime.records])

  const go = (page: PageId, selectId: string | null = null) => {
    setFocusId(selectId)
    setActivePage(page)
  }

  // Pegawai keluar: pengajuan (cuti, tukar shift, lembur) yang masih menunggu dan jatuh setelah tanggal keluar dibatalkan.
  const cancelAfterExit = (o: Off): number => {
    const actor = { ...USERS.admin, nama: 'Sistem (pegawai keluar)' }
    const alasan = 'Pegawai keluar'
    let n = 0
    for (const r of leave.requests) if (r.nik === o.nik && r.start > o.tanggalKeluar && (isPending(r.status) || isVerif(r.status))) { leave.cancel(r.no, actor, alasan); n++ }
    for (const w of swaps.swaps) if ((w.nikA === o.nik || w.nikB === o.nik) && w.date > o.tanggalKeluar && isPending(w.status)) { swaps.cancel(w.no, actor, alasan); n++ }
    for (const t of overtime.records) if (t.nik === o.nik && t.date > o.tanggalKeluar && t.status === 'menunggu-approval') { overtime.cancel(t.id, actor, alasan); n++ }
    return n
  }
  const openOffboarding = (nik: string, reason?: string) =>
    guarded(() => {
      setIrIntent({ tab: 'keluar', keluar: { nik, reason } })
      go('industrial-relations')
    })
  const openFinalPay = (no?: string) =>
    guarded(() => {
      setFinalPayFocus(no)
      go('final-pay')
    })
  const openDiscipline = (nik: string, jenis?: string) =>
    guarded(() => {
      setIrIntent({ tab: 'disiplin', disiplin: { nik, jenis: jenis as never } })
      go('industrial-relations')
    })

  const draftId = profile.kind === 'draft' ? profile.id : ''
  const candidate = candidates.find((c) => c.id === draftId)
  const exitedInfo = profile.kind === 'exited' ? exitedRecord(profile.nik) : undefined
  const record: DraftRecord | undefined =
    profile.kind === 'draft'
      ? drafts[profile.id]
      : profile.kind === 'roster'
        ? (rosterEdits[profile.nik] ?? rosterRecord(profile.nik))
        : exitedInfo?.record
  const atasanOfProfile = record
    ? profile.kind === 'draft'
      ? atasanName(atasanForPlacement(record.form.department, record.form.section))
      : atasanName(ROSTER.find((x) => x.nik === profile.nik)?.atasanId ?? exitedInfo?.exited.atasanId ?? '')
    : undefined
  const profileKey = profile.kind === 'draft' ? `draft:${profile.id}` : `${profile.kind}:${profile.nik}`
  const saveRecord = (r: DraftRecord) => {
    // Pegawai yang baru diaktifkan memulai kepesertaan BPJS dari "Dalam pendaftaran".
    if (profile.kind === 'draft' && r.status === 'aktif' && r.nik && drafts[profile.id]?.status !== 'aktif') enrollNewHire(r.nik, r.form.nama, r.form.tanggalMasuk)
    if (profile.kind === 'draft') setDrafts((prev) => ({ ...prev, [profile.id]: r }))
    else if (profile.kind === 'roster') setRosterEdits((prev) => ({ ...prev, [profile.nik]: r }))
  }
  const payCtx = { records: attendance.state.records, scans: attendance.state.scans, otRecords: overtime.records }
  const taken = Object.values(drafts).flatMap((d) => (d.nik ? [d.nik] : []))

  // Dynamic document title.
  useEffect(() => {
    const ksb = isKsbRole(role)
    const draft = record ? { nama: record.form.nama, activated: record.status === 'aktif' } : undefined
    document.title = formatDocTitle(pageTitleFor(activePage, draft, ksb, dashTab))
  }, [activePage, role, dashTab, record, record?.form.nama, record?.status])

  if (portalPersona !== null) {
    return (
      <>
        <Toaster />
        <PortalShell
          persona={portalPersona}
          onSelectPortalPersona={setPortalPersona}
          onSelectHRRole={(r) => { setRole(r); setPortalPersona(null) }}
        />
      </>
    )
  }

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <AppSidebar
        activePage={activePage}
        onNavigate={(p) => guarded(() => { setTrxPeriod(undefined); setIrIntent(undefined); go(p) })}
        role={role}
      />
      <SidebarInset className="h-svh min-w-0 flex-col overflow-hidden">
        <Topbar
          activePage={activePage}
          dashTab={dashTab}
          draft={record ? { nama: record.form.nama, activated: record.status === 'aktif', from: profileFrom } : undefined}
          user={USERS[role]}
          onUserChange={setRole}
          onPortalSelect={setPortalPersona}
          onNavigate={(p) => guarded(() => { setTrxPeriod(undefined); go(p) })}
          attendanceClosed={!!attendance.state.closed}
          onScenario={runDemoClosing}
          payrollFinal={periodFinalized('2026-10')}
          onFinishPayroll={finishPayroll}
        />
        <DirectoryNavContext.Provider value={{ openDirectory, openEmployee, openOffboarding, openDiscipline, openFinalPay }}>
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          {activePage === 'dashboard' && (
            <DashboardPage user={USERS[role]} records={attendance.state.records} requests={leave.requests} tab={dashTab} onTabChange={setDashTab} onNavigate={(p, id) => guarded(() => go(p, id ?? null))} />
          )}
          {activePage === 'recruitment' && (
            <RecruitmentPage
              user={USERS[role]}
              onOpenDraft={(id) => openDraft(id, 'recruitment')}
              onOpenForm={() => guarded(() => go('recruitment-form'))}
              initialSelectedId={focusId}
            />
          )}
          {activePage === 'recruitment-jobs' && (role === 'admin' || role === 'manager') && (
            <RecruitmentJobsPage user={USERS[role]} onOpenCandidate={(id) => guarded(() => go('recruitment', id))} />
          )}
          {activePage === 'recruitment-form' && role === 'admin' && (
            <RecruitmentFormPage user={USERS[role]} onDirtyChange={onDirtyChange} onDone={(id) => guarded(() => go('recruitment', id))} />
          )}
          {activePage === 'recruitment-tests' && (role === 'admin' || role === 'manager') && (
            <RecruitmentTestsPage user={USERS[role]} onOpenCandidate={(id) => guarded(() => go('recruitment', id))} />
          )}
          {activePage === 'attendance' && <AttendancePage focusId={focusId} api={attendance} user={USERS[role]} otPending={unvalidatedCount(overtime.records, PERIOD.start, PERIOD.end)} verifItems={pendingVerification(leave.requests, overtime.records, PERIOD.start, PERIOD.end)} />}
          {activePage === 'leave' && <LeavePage api={leave} user={USERS[role]} octClosed={!!attendance.state.closed} />}
          {activePage === 'overtime' && (
            <OvertimePage api={overtime} user={USERS[role]} scans={attendance.state.scans} leaves={leave.requests} octClosed={!!attendance.state.closed} />
          )}
          {activePage === 'master-data' && (role === 'admin' || role === 'manager') && <MasterDataPage role={role} />}
          {activePage === 'dev-competency' && canAccessCompetency(role) && <CompetencyPage user={USERS[role]} />}
          {activePage === 'dev-training' && canAccessCompetency(role) && <TrainingPage user={USERS[role]} />}
          {activePage === 'dev-kpi' && canAccessCompetency(role) && <KpiPage user={USERS[role]} attendance={attendance.state.records} onNavigate={() => guarded(() => go('attendance'))} />}
          {activePage === 'payroll-run' && (role === 'payroll' || role === 'manager') && (
            <PayrollRunPage
              user={USERS[role]}
              ctx={{ records: attendance.state.records, scans: attendance.state.scans, otRecords: overtime.records }}
              closed={attendance.state.closed}
              onNavigate={(p, period) => guarded(() => { setPayPeriod(period); setTrxPeriod(p === 'employee-transactions' ? period : undefined); go(p) })}
            />
          )}
          {activePage === 'payslips' && (role === 'payroll' || role === 'manager') && (
            <PayslipsPage user={USERS[role]} ctx={payCtx} initialPeriod={payPeriod} onNavigate={(p) => guarded(() => go(p))} />
          )}
          {activePage === 'payments' && (role === 'payroll' || role === 'manager' || role === 'finance') && (
            <PaymentsPage user={USERS[role]} ctx={payCtx} initialPeriod={payPeriod} onNavigate={(p) => guarded(() => go(p))} />
          )}
          {activePage === 'coop-members' && isKsbRole(role) && <CoopMembersPage user={USERS[role]} />}
          {activePage === 'coop-withdrawals' && isKsbRole(role) && <CoopWithdrawalsPage user={USERS[role]} />}
          {activePage === 'coop-cash-advance' && isKsbRole(role) && <CoopCashAdvancePage user={USERS[role]} />}
          {activePage === 'coop-loans' && isKsbRole(role) && <CoopLoansPage user={USERS[role]} />}
          {activePage === 'coop-payroll-deductions' && isKsbRole(role) && <CoopPayrollDeductionsPage user={USERS[role]} />}
          {activePage === 'coop-budget' && isKsbRole(role) && <CoopBudgetPage user={USERS[role]} />}
          {activePage === 'coop-trading' && isKsbRole(role) && <CoopTradingPage user={USERS[role]} />}
          {activePage === 'coop-settings' && isKsbRole(role) && <CoopSettingsPage user={USERS[role]} />}
          {activePage === 'coop-shu' && isKsbRole(role) && <CoopShuPage user={USERS[role]} onNavigate={(p) => guarded(() => go(p))} />}
          {activePage === 'payroll-recon' && role === 'finance' && <PayrollReconPage user={USERS[role]} ctx={payCtx} onNavigate={(p) => guarded(() => go(p))} />}
          {activePage === 'salary-change' && (role === 'payroll' || role === 'manager') && <SalaryChangePage user={USERS[role]} />}
          {activePage === 'payroll-components' && (role === 'payroll' || role === 'manager') && <PayrollComponentsPage user={USERS[role]} ctx={payCtx} onNavigate={(p) => guarded(() => go(p))} />}
          {activePage === 'shift-swap' && (
            <ShiftSwapPage api={swaps} user={USERS[role]} leaves={leave.requests} octClosed={!!attendance.state.closed} />
          )}
          {activePage === 'employee-transactions' && (role === 'admin' || role === 'manager' || role === 'supervisor' || role === 'payroll') && (
            <EmployeeTransactionsPage user={USERS[role]} leaves={leave.requests} periodId={trxPeriod} onClearPeriod={() => setTrxPeriod(undefined)} />
          )}
          {activePage === 'final-pay' && (role === 'payroll' || role === 'manager' || role === 'finance' || role === 'admin') && (
            <FinalPayPage user={USERS[role]} leaves={leave.requests} focus={finalPayFocus} onFocusDone={() => setFinalPayFocus(undefined)} />
          )}
          {activePage === 'industrial-relations' && (role === 'admin' || role === 'manager' || role === 'supervisor' || role === 'payroll') && (
            <IndustrialRelationsPage user={USERS[role]} intent={irIntent} onIntentDone={() => setIrIntent(undefined)} onFinished={cancelAfterExit} />
          )}
          {activePage === 'employees' && (
            <EmployeesPage
              user={USERS[role]}
              leaves={leave.requests}
              candidates={candidates}
              drafts={drafts}
              filters={dirFilters}
              setFilters={setDirFilters}
              onOpen={openEmployee}
              onGenerate={generateDraft}
              onCreateDirect={createDirectDraft}
            />
          )}
          {activePage === 'employee-draft' && record && (
            <EmployeeDraftPage
              key={profileKey}
              candidate={candidate}
              record={record}
              user={USERS[role]}
              atasan={atasanOfProfile}
              exit={exitedInfo?.exited.keluar}
              backLabel={profileFrom === 'directory' ? 'Kembali ke Direktori' : 'Kembali ke Recruitment'}
              onBack={() => guarded(() => go(profileFrom === 'directory' ? 'employees' : 'recruitment'))}
              onSave={saveRecord}
              onDirtyChange={onDirtyChange}
              onOpenApplication={() => guarded(() => go('recruitment', draftId))}
              generateNik={() => nikFor(draftId, taken)}
            />
          )}
        </main>
        </DirectoryNavContext.Provider>
        <AppFooter />
        <Toaster />
        <AlertDialog open={pendingNav !== null} onOpenChange={(o) => !o && setPendingNav(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Perubahan belum disimpan</AlertDialogTitle>
              <AlertDialogDescription>
                Perubahan yang belum disimpan akan hilang jika Anda meninggalkan halaman ini.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Tetap di halaman</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  const run = pendingNav
                  dirtyRef.current = false
                  setPendingNav(null)
                  run?.()
                }}
              >
                Tinggalkan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
