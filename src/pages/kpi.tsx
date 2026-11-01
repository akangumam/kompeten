import { ClipboardCheck, Gauge, Hourglass, UserX } from 'lucide-react'
import { useState } from 'react'
import { ApprovalTab } from '@/components/kpi/approval-tab'
import { KpiSheet } from '@/components/kpi/input-sheet'
import { InputTab } from '@/components/kpi/input-tab'
import { ReportTab } from '@/components/kpi/report-tab'
import { n1 } from '@/components/kpi/shared'
import { StatCard } from '@/components/dashboard/stat-card'
import { KPI_GRID, PageHeader } from '@/components/payroll/pay/shared'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DayRecord } from '@/data/attendance'
import { departments, posisiOptions, sectionNames } from '@/data/employees'
import { DEFAULT_MONTH, monthIds, monthLabel, rowsFor, scoreOfRow, statusOf, useKpi, type KpiRow } from '@/data/kpi/records'
import { predikatOf, templateOf, useKpiMaster } from '@/data/master/kpi'
import type { CurrentUser } from '@/data/users'

const ALL = 'all'

export default function KpiPage({ user, attendance, onNavigate }: { user: CurrentUser; attendance: DayRecord[]; onNavigate: () => void }) {
  useKpi()
  useKpiMaster()
  const [tahun, setTahun] = useState('2026')
  const [bulan, setBulan] = useState(DEFAULT_MONTH)
  const [dept, setDept] = useState('Produksi')
  const [section, setSection] = useState('Injection')
  const [posisi, setPosisi] = useState('Operator Injection')
  const [tab, setTab] = useState('input')
  const [open, setOpen] = useState<KpiRow | null>(null)

  const sections = sectionNames(dept)
  const posisiList = posisiOptions(dept, section === ALL ? '' : section)
  const hasTpl = (p: string) => !!templateOf(p, Number(tahun))
  const pickDept = (d: string) => { setDept(d); setSection(ALL); const l = posisiOptions(d, ''); setPosisi(l.find(hasTpl) ?? l[0] ?? '') }
  const pickSection = (s: string) => { setSection(s); const l = posisiOptions(dept, s === ALL ? '' : s); setPosisi(l.find(hasTpl) ?? l[0] ?? '') }
  const pickTahun = (t: string) => { setTahun(t); setBulan(`${t}-${bulan.slice(5)}`) }

  const rows = rowsFor(bulan, posisi, user)
  const done = rows.filter((r) => ['diajukan', 'disetujui'].includes(statusOf(r)))
  const nilai = done.map((r) => scoreOfRow(r, bulan, attendance).nilai).filter((n): n is number => n != null)
  const avg = nilai.length ? nilai.reduce((a, b) => a + b, 0) / nilai.length : null
  const kurang = nilai.filter((n) => predikatOf(n).key === 'kurang').length
  const menunggu = rows.filter((r) => statusOf(r) === 'diajukan').length

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Evaluasi KPI" subtitle="Realisasi KPI bulanan per pegawai terhadap target">
        <Select value={tahun} onValueChange={pickTahun}>
          <SelectTrigger aria-label="Tahun" className="min-w-28"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="2026">2026</SelectItem></SelectContent>
        </Select>
        <Select value={bulan} onValueChange={setBulan}>
          <SelectTrigger aria-label="Bulan" className="min-w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{monthIds(Number(tahun)).map((m) => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={dept} onValueChange={pickDept}>
          <SelectTrigger aria-label="Department" className="min-w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{departments().map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={section} onValueChange={pickSection}>
          <SelectTrigger aria-label="Section" className="min-w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>Semua Section</SelectItem>{sections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={posisi} onValueChange={setPosisi}>
          <SelectTrigger aria-label="Posisi" className="min-w-52"><SelectValue placeholder="Pilih posisi" /></SelectTrigger>
          <SelectContent>{posisiList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>

      {user.role === 'supervisor' && <p className="text-sm text-muted-foreground">Menampilkan tim Anda saja.</p>}

      <div className={KPI_GRID}>
        <StatCard label="Sudah diinput" icon={ClipboardCheck} value={`${done.length} / ${rows.length}`} hint={`Diajukan atau Disetujui · ${monthLabel(bulan)}`} />
        <StatCard label="Menunggu persetujuan" icon={Hourglass} value={menunggu} hint="Diajukan, menunggu penyetuju" />
        <StatCard label="Rata-rata nilai bulan ini" icon={Gauge} value={avg == null ? '—' : n1(avg)} hint="Dari KPI yang sudah diinput" />
        <StatCard label="Pegawai predikat Kurang" icon={UserX} value={kurang} hint="Nilai di bawah batas Cukup" />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList>
          <TabsTrigger value="input">Input Bulanan</TabsTrigger>
          <TabsTrigger value="persetujuan">Persetujuan{menunggu ? ` (${menunggu})` : ''}</TabsTrigger>
          <TabsTrigger value="laporan">Laporan Tahunan</TabsTrigger>
        </TabsList>
        <TabsContent value="input"><InputTab rows={rows} bulan={bulan} posisi={posisi} user={user} attendance={attendance} onOpen={setOpen} /></TabsContent>
        <TabsContent value="persetujuan"><ApprovalTab rows={rows} bulan={bulan} user={user} attendance={attendance} onOpen={setOpen} /></TabsContent>
        <TabsContent value="laporan"><ReportTab rows={rows} tahun={Number(tahun)} posisi={posisi} department={dept} /></TabsContent>
      </Tabs>

      <KpiSheet row={open} bulan={bulan} user={user} attendance={attendance} onClose={() => setOpen(null)} onNavigate={() => { setOpen(null); onNavigate() }} />
    </div>
  )
}
