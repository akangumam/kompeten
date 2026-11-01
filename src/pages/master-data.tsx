import { Award, Briefcase, CalendarCheck, CalendarDays, Clock, History, Layers, LayoutDashboard, Network, Scale, UserCheck, UserSearch, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { AuditSheet } from '@/components/master/audit-sheet'
import { ApproverTab } from '@/components/master/approver-tab'
import { CompetencyTab } from '@/components/master/competency-tab'
import { DashboardTab } from '@/components/master/dashboard-tab'
import { GradeTab } from '@/components/master/grade-tab'
import { HolidayTab } from '@/components/master/holiday-tab'
import { IndustrialTab } from '@/components/master/industrial-tab'
import { LeaveRulesTab } from '@/components/master/leave-rules-tab'
import { OrgTab } from '@/components/master/org-tab'
import { PositionTab } from '@/components/master/position-tab'
import { RecruitmentTab } from '@/components/master/recruitment-tab'
import { ShiftTab } from '@/components/master/shift-tab'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { COMPETENCIES } from '@/data/master/competencies'
import { APPROVER_RULES } from '@/data/master/approvers'
import { EXIT_REASONS } from '@/data/master/exit-reasons'
import { GRADES } from '@/data/master/grades'
import { HOLIDAYS } from '@/data/master/holidays'
import { LEAVE_RULES } from '@/data/master/leave-rules'
import { LEVEL_DEFS } from '@/data/master/levels'
import { ORG } from '@/data/master/organization'
import { POSITIONS } from '@/data/master/positions'
import { POLA_DEFS, SHIFT_DEFS } from '@/data/master/shifts'
import { AGE_TIERS, TENURE_TIERS } from '@/data/master/tier-ranges'
import type { Role } from '@/data/users'
import { masterAccess, type MasterTab } from '@/lib/access'

type TabId = MasterTab

export default function MasterDataPage({ role }: { role: Role }) {
  const [tab, setTab] = useState<TabId>('org')
  const [hist, setHist] = useState(false)
  const [query, setQuery] = useState('')
  const allItems: { id: TabId; label: string; icon: LucideIcon; count: number }[] = [
    { id: 'org', label: 'Organisasi', icon: Network, count: ORG.length },
    { id: 'pos', label: 'Posisi & Level', icon: Briefcase, count: POSITIONS.length + LEVEL_DEFS.length + 9 },
    { id: 'grade', label: 'Grade', icon: Layers, count: GRADES.length },
    { id: 'shift', label: 'Shift & Pola Kerja', icon: Clock, count: SHIFT_DEFS.length + POLA_DEFS.length },
    { id: 'holiday', label: 'Kalender Libur', icon: CalendarDays, count: HOLIDAYS.length },
    { id: 'leave', label: 'Aturan Cuti', icon: CalendarCheck, count: 3 + LEAVE_RULES.khusus.length },
    { id: 'approver', label: 'Penyetuju', icon: UserCheck, count: APPROVER_RULES.length },
    { id: 'industrial', label: 'Industrial', icon: Scale, count: EXIT_REASONS.length },
    { id: 'recruit', label: 'Rekrutmen', icon: UserSearch, count: 5 },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, count: TENURE_TIERS.length + AGE_TIERS.length },
    { id: 'competency', label: 'Kompetensi', icon: Award, count: COMPETENCIES.length },
  ]
  const items = allItems.filter((it) => masterAccess(role, it.id))
  const first = items[0]?.id ?? 'org'
  const cur: TabId = items.some((it) => it.id === tab) ? tab : first
  const canEdit = masterAccess(role, cur) === 'edit'
  const onHistory = (q: string) => {
    setQuery(q)
    setHist(true)
  }
  const props = { canEdit, onHistory }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Data Master</h1>
          <p className="text-sm text-muted-foreground">Struktur organisasi, posisi, grade, jadwal kerja, kalender libur, aturan cuti, penyetuju, alasan keluar, parameter rekrutmen, dan standar kompetensi</p>
        </div>
        <Button variant="outline" onClick={() => onHistory('')}>
          <History /> Riwayat Perubahan
        </Button>
      </div>
      {!canEdit && (
        <Alert variant="info">
          <AlertDescription>Mode baca untuk kelompok data ini. Organisasi, posisi, jadwal, dan kalender diubah HR Personalia; kompetensi, KPI, dan parameter Hubungan Industrial diubah HR Development &amp; Industrial.</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit p-2 max-lg:overflow-x-auto">
          <nav aria-label="Data master" className="flex gap-1 lg:flex-col">
            {items.map((it) => {
              const active = cur === it.id
              return (
                <button
                  key={it.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setTab(it.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
                >
                  <it.icon className="size-4 shrink-0" />
                  <span className="flex-1 whitespace-nowrap">{it.label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{it.count}</span>
                </button>
              )
            })}
          </nav>
        </Card>
        <div className="min-w-0">
          {cur === 'org' && <OrgTab {...props} />}
          {cur === 'pos' && <PositionTab {...props} />}
          {cur === 'grade' && <GradeTab {...props} />}
          {cur === 'shift' && <ShiftTab {...props} />}
          {cur === 'holiday' && <HolidayTab {...props} />}
          {cur === 'leave' && <LeaveRulesTab {...props} />}
          {cur === 'approver' && <ApproverTab {...props} />}
          {cur === 'industrial' && <IndustrialTab {...props} />}
          {cur === 'recruit' && <RecruitmentTab {...props} />}
          {cur === 'dashboard' && <DashboardTab {...props} />}
          {cur === 'competency' && <CompetencyTab {...props} />}
        </div>
      </div>
      <AuditSheet open={hist} onOpenChange={setHist} query={query} onQuery={setQuery} />
    </div>
  )
}
