import { BadgeCheck, CalendarClock, Download, FileText, Users } from 'lucide-react'
import { ContractsTable } from '@/components/dashboard/contracts-table'
import { DepartmentChart } from '@/components/dashboard/department-chart'
import { EmployeeTrendChart } from '@/components/dashboard/employee-trend-chart'
import { StatCard } from '@/components/dashboard/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KoperasiTab } from '@/components/dashboard/koperasi-tab'
import { PresensiTab } from '@/components/dashboard/presensi-tab'
import { ProduksiTab } from '@/components/dashboard/produksi-tab'
import { DemografiSection } from '@/components/dashboard/demografi-section'
import { PergerakanSection } from '@/components/dashboard/pergerakan-section'
import type { DayRecord } from '@/data/attendance'
import { ALL_DEPT, PRES_PERIOD_IDS, presPeriodLabel } from '@/data/dashboard'
import { COOP_MONTHS, DEFAULT_COOP_MONTH } from '@/data/dashboard-koperasi'
import type { LeaveRequest } from '@/data/leave'
import { periodForId } from '@/data/master/attendance-rules'
import { periodLabel } from '@/data/koperasi/loans'
import { isKsbRole } from '@/data/koperasi/ksb'
import type { CurrentUser, Role } from '@/data/users'
import { funnel } from '@/data/candidates'
import { useRecruitment } from '@/data/recruitment/store'
import { useDirectoryNav } from '@/lib/directory-nav'
import type { PageId } from '@/App'
import { useState } from 'react'
import { expiringContracts, useTrx } from '@/data/transactions'

const DEPARTMENTS = [
  'Semua Department', 'Produksi', 'Quality Assurance', 'Maintenance', 'PPIC', 'Warehouse',
  'Engineering', 'HR & GA', 'Finance', 'IT', 'Purchasing',
]

function Placeholder() {
  return (
    <Card>
      <CardContent className="space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <p className="text-sm text-muted-foreground">Konten tab ini dibuat di tahap berikutnya</p>
      </CardContent>
    </Card>
  )
}

export type TabId = 'umum' | 'produksi' | 'presensi' | 'koperasi'
const TAB_LABEL: Record<TabId, string> = { umum: 'Umum & Rekrutmen', produksi: 'Produksi', presensi: 'Presensi', koperasi: 'Koperasi' }

/** Tab Dashboard per peran: Koperasi hanya untuk pengurus KSB; HR dan Payroll tidak pernah melihat tab Koperasi. */
export function tabsFor(role: Role): TabId[] {
  if (isKsbRole(role)) return ['koperasi']
  if (role === 'hr_personalia' || role === 'manager' || role === 'supervisor') return ['umum', 'produksi', 'presensi']
  if (role === 'hr_recruitment' || role === 'hr_development') return ['umum', 'produksi']
  return ['umum']
}

export default function DashboardPage({
  user, records, requests, onNavigate, tab, onTabChange,
}: {
  /** Tab aktif; state-nya dimiliki App supaya sidebar, breadcrumb, dan judul tab browser ikut sinkron. */
  tab: TabId
  onTabChange: (tab: TabId) => void
  user: CurrentUser
  records: DayRecord[]
  requests: LeaveRequest[]
  onNavigate: (page: PageId, id?: string | null) => void
}) {
  const { openDirectory } = useDirectoryNav()
  useTrx()
  useRecruitment()
  const fun = funnel()
  const tabs = tabsFor(user.role)
  const ksb = isKsbRole(user.role)
  const [tahun, setTahun] = useState('2026')
  const [dept, setDept] = useState('Semua Department')
  const [presPeriod, setPresPeriod] = useState('2026-10')
  const [presDept, setPresDept] = useState(ALL_DEPT)
  const [coopMonth, setCoopMonth] = useState(DEFAULT_COOP_MONTH)
  const [prodYear, setProdYear] = useState('2026')
  const [prodSection, setProdSection] = useState(user.role === 'supervisor' ? 'Injection' : 'Semua Section')
  // Ganti persona: pertahankan tab aktif bila masih diizinkan, jika tidak pilih tab pertama.
  const active: TabId = tabs.includes(tab) ? tab : tabs[0]

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{ksb ? 'Dashboard Koperasi' : 'Dashboard'}</h1>
          <p className="text-sm text-muted-foreground">{ksb ? 'Ringkasan simpanan, pinjaman, dan keuangan Koperasi KSB' : 'Ringkasan SDM dan rekrutmen PT Primaplast Indonesia'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {active === 'umum' && (
            <>
              <Select value={tahun} onValueChange={setTahun}>
                <SelectTrigger aria-label="Tahun" className="min-w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['2026', '2025', '2024'].map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={dept} onValueChange={setDept}>
                <SelectTrigger aria-label="Department" className="min-w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline"><Download className="size-4" />Export</Button>
            </>
          )}
          {active === 'produksi' && (
            <>
              <Select value={prodYear} onValueChange={setProdYear}>
                <SelectTrigger aria-label="Tahun" className="min-w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['2026', '2025'].map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select
                value={user.role === 'supervisor' ? 'Injection' : prodSection}
                onValueChange={setProdSection}
                disabled={user.role === 'supervisor'}
              >
                <SelectTrigger aria-label="Section" className="min-w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {user.role === 'supervisor' ? (
                    <SelectItem value="Injection">Injection</SelectItem>
                  ) : (
                    ['Semua Section', 'Injection', 'Blow Molding', 'Extrusion', 'Printing'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </>
          )}
          {active === 'presensi' && (
            <>
              <Select value={presPeriod} onValueChange={setPresPeriod}>
                <SelectTrigger aria-label="Periode kehadiran" className="min-w-[340px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRES_PERIOD_IDS.map((id) => <SelectItem key={id} value={id}>{presPeriodLabel(periodForId(id))}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={presDept} onValueChange={setPresDept}>
                <SelectTrigger aria-label="Department" className="min-w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_DEPT}>Semua Department</SelectItem>
                  {DEPARTMENTS.slice(1).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          )}
          {active === 'koperasi' && (
            <Select value={coopMonth} onValueChange={setCoopMonth}>
              <SelectTrigger aria-label="Bulan" className="min-w-[190px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COOP_MONTHS.map((m) => <SelectItem key={m} value={m}>{periodLabel(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Tabs value={active} onValueChange={(v) => onTabChange(v as TabId)} className="gap-6">
        {tabs.length > 1 && (
          <TabsList className="h-auto max-w-full flex-wrap justify-start">
            {tabs.map((t) => <TabsTrigger key={t} value={t}>{TAB_LABEL[t]}</TabsTrigger>)}
          </TabsList>
        )}

        {tabs.includes('umum') && (
          <TabsContent value="umum" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Menampilkan 248 karyawan aktif di semua department per Oktober 2026, termasuk {expiringContracts().length} karyawan dengan kontrak berakhir dalam 45 hari.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Karyawan Aktif" value="248" icon={Users} delta="+12%" trend="up" summary="Naik dari tahun lalu" onClick={() => openDirectory({ tab: 'aktif' })} />
            <StatCard label="Pelamar" value={String(fun['Seleksi Administrasi'])} icon={FileText} hint="Semua lamaran yang masuk" />
            <StatCard label="Interview" value={String(fun.Interview)} icon={CalendarClock} hint="Pernah mencapai tahap Interview" />
            <StatCard label="Lolos" value={String(fun.Diterima)} icon={BadgeCheck} hint="Penawaran diterima kandidat" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7"><EmployeeTrendChart /></div>
            <div className="lg:col-span-5"><DepartmentChart /></div>
          </div>

          <ContractsTable user={user} leaves={requests} />

          <DemografiSection user={user} dept={dept} />
          <PergerakanSection user={user} dept={dept} onNavigate={onNavigate} />
          </TabsContent>
        )}
        {tabs.includes('produksi') && (
          <TabsContent value="produksi">
            <ProduksiTab
              user={user}
              year={prodYear}
              section={user.role === 'supervisor' ? 'Injection' : prodSection}
              onNavigate={onNavigate}
            />
          </TabsContent>
        )}
        {tabs.includes('presensi') && (
          <TabsContent value="presensi">
            <PresensiTab records={records} requests={requests} user={user} periodId={presPeriod} dept={presDept} onNavigate={onNavigate} />
          </TabsContent>
        )}
        {tabs.includes('koperasi') && (
          <TabsContent value="koperasi">
            <KoperasiTab bulan={coopMonth} onNavigate={onNavigate} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
