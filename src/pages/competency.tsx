import { Hourglass, Target, TrendingDown, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AssessmentSheet } from '@/components/competency/assessment-sheet'
import { AssessmentTab } from '@/components/competency/assessment-tab'
import { RecommendSheet } from '@/components/competency/recommend-sheet'
import { GapTab, gapRecap } from '@/components/competency/gap-tab'
import { MatrixTab } from '@/components/competency/matrix-tab'
import { pctText } from '@/components/competency/shared'
import { StatCard } from '@/components/dashboard/stat-card'
import { KPI_GRID, PageHeader } from '@/components/payroll/pay/shared'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DEFAULT_PERIOD, PERIODS, periodOf, rowsFor, scoreOfRow, statusOf, useCompetency, type CompRow } from '@/data/competency/assessments'
import { departments, posisiOptions, sectionNames } from '@/data/employees'
import { competencyOf, standardOf } from '@/data/master/competencies'
import { useMaster } from '@/data/master/store'
import type { CurrentUser } from '@/data/users'

const ALL = 'all'
const DEFAULT_POSISI = 'Operator Injection'

export default function CompetencyPage({ user }: { user: CurrentUser }) {
  useCompetency()
  useMaster()
  const [periodId, setPeriodId] = useState(DEFAULT_PERIOD)
  const [dept, setDept] = useState('Produksi')
  const [section, setSection] = useState('Injection')
  const [posisi, setPosisi] = useState(DEFAULT_POSISI)
  const [tab, setTab] = useState('matrix')
  const [open, setOpen] = useState<CompRow | null>(null)
  const [rec, setRec] = useState<{ kode: string; nama: string } | null>(null)

  const period = periodOf(periodId)
  const sections = sectionNames(dept)
  const posisiList = posisiOptions(dept, section === ALL ? '' : section)

  const pickDept = (d: string) => {
    setDept(d)
    setSection(ALL)
    const list = posisiOptions(d, '')
    setPosisi(list.find((p) => standardOf(p)) ?? list[0] ?? '')
  }
  const pickSection = (s: string) => {
    setSection(s)
    const list = posisiOptions(dept, s === ALL ? '' : s)
    setPosisi(list.find((p) => standardOf(p)) ?? list[0] ?? '')
  }

  const rows = rowsFor(periodId, posisi, user)
  const recap = gapRecap(rows, periodId, (k) => competencyOf(k)?.nama ?? k)
  const top = recap.find((g) => g.pegawai > 0)
  const stats = useMemo(() => {
    const done = rows.filter((r) => ['diajukan', 'final'].includes(statusOf(r)))
    const scores = done.map((r) => scoreOfRow(r, periodId))
    const pcts = scores.map((s) => s.pct).filter((x): x is number => x != null)
    return {
      dinilai: done.length,
      avg: pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null,
      menunggu: rows.filter((r) => statusOf(r) === 'diajukan').length,
    }
  }, [rows, periodId])

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Penilaian & Matrix Kompetensi" subtitle="Gap kompetensi pegawai terhadap standar posisi per semester">
        <Select value={periodId} onValueChange={setPeriodId}>
          <SelectTrigger aria-label="Periode" className="min-w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{PERIODS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label} ({p.status === 'Berjalan' ? 'berjalan' : 'Final'})</SelectItem>)}</SelectContent>
        </Select>
        <Select value={dept} onValueChange={pickDept}>
          <SelectTrigger aria-label="Department" className="min-w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{departments().map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={section} onValueChange={pickSection}>
          <SelectTrigger aria-label="Section" className="min-w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Section</SelectItem>
            {sections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={posisi} onValueChange={setPosisi}>
          <SelectTrigger aria-label="Posisi" className="min-w-52"><SelectValue placeholder="Pilih posisi" /></SelectTrigger>
          <SelectContent>{posisiList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>

      {user.role === 'supervisor' && <p className="text-sm text-muted-foreground">Menampilkan tim Anda saja.</p>}

      <div className={KPI_GRID}>
        <StatCard label="Pegawai dinilai" icon={Users} value={`${stats.dinilai} / ${rows.length}`} hint="Penilaian Diajukan atau Final" />
        <StatCard label="Rata-rata pemenuhan standar" icon={Target} value={pctText(stats.avg)} hint="Dari pegawai yang sudah dinilai" />
        <StatCard label="Kompetensi dengan gap terbanyak" icon={TrendingDown} value={top?.nama ?? '—'} hint={top ? `${top.pegawai} pegawai bergap` : 'Belum ada gap'} />
        <StatCard label="Menunggu verifikasi" icon={Hourglass} value={stats.menunggu} hint="Diajukan Atasan, menunggu HR Development & Industrial" />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
          <TabsTrigger value="penilaian">Penilaian</TabsTrigger>
          <TabsTrigger value="gap">Rekap Gap</TabsTrigger>
        </TabsList>
        <TabsContent value="matrix"><MatrixTab rows={rows} posisi={posisi} periodId={periodId} periodLabel={period.label} onOpen={setOpen} /></TabsContent>
        <TabsContent value="penilaian"><AssessmentTab rows={rows} posisi={posisi} periodId={periodId} periodLabel={period.label} user={user} onOpen={setOpen} /></TabsContent>
        <TabsContent value="gap"><GapTab recap={recap} posisi={posisi} periodLabel={period.label} onRecommend={(g) => setRec({ kode: g.kode, nama: g.nama })} /></TabsContent>
      </Tabs>

      <RecommendSheet target={rec} rows={rows} periodId={periodId} user={user} onClose={() => setRec(null)} />
      <AssessmentSheet row={open} periodId={periodId} user={user} onClose={() => setOpen(null)} />
    </div>
  )
}
