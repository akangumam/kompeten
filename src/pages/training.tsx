import { can } from '@/lib/access'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { StatCard } from '@/components/dashboard/stat-card'
import { KPI_GRID, PageHeader } from '@/components/payroll/pay/shared'
import { AttendanceSheet } from '@/components/training/attendance-sheet'
import { DetailSheet } from '@/components/training/detail-sheet'
import { ParticipantsTab } from '@/components/training/participants-tab'
import { ProgramSheet } from '@/components/training/program-sheet'
import { ProgramTab } from '@/components/training/program-tab'
import { ProposeDialog } from '@/components/training/propose-dialog'
import { ScheduleTab } from '@/components/training/schedule-tab'
import { CertificateDialog } from '@/components/training/shared'
import { UjiDialog } from '@/components/training/uji-dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { COMPETENCIES } from '@/data/master/competencies'
import { PROGRAMS, TRAINING_TYPES, trainingStats, useTraining, type Program } from '@/data/training/store'
import type { CurrentUser } from '@/data/users'
import { CalendarDays, GraduationCap, Percent, Users } from 'lucide-react'

const ALL = 'all'

export default function TrainingPage({ user }: { user: CurrentUser }) {
  useTraining()
  const admin = can(user, 'dev.manage')
  const [tahun, setTahun] = useState('2026')
  const [tipe, setTipe] = useState(ALL)
  const [komp, setKomp] = useState(ALL)
  const [tab, setTab] = useState('program')
  const [sheet, setSheet] = useState<{ program?: Program; readOnly: boolean } | null>(null)
  const [detail, setDetail] = useState<{ kode: string; nik: string } | null>(null)
  const [uji, setUji] = useState<{ kode: string; nik: string } | null>(null)
  const [hadir, setHadir] = useState<{ kode: string; sesiId: string } | null>(null)
  const [cert, setCert] = useState<string | null>(null)
  const [propose, setPropose] = useState<{ program?: Program } | null>(null)

  const programs = PROGRAMS
    .filter((p) => String(p.tahun) === tahun)
    .filter((p) => tipe === ALL || p.tipe === tipe)
    .filter((p) => komp === ALL || p.kompetensi.some((k) => k.kode === komp))
    .filter((p) => admin || user.role !== 'supervisor' || p.status !== 'Draft')
    .sort((a, b) => a.kode.localeCompare(b.kode))
  const st = trainingStats(user, Number(tahun))

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Program & Offline Training" subtitle="Program pelatihan, jadwal, kehadiran, dan uji kompetensi">
        <Select value={tahun} onValueChange={setTahun}>
          <SelectTrigger aria-label="Tahun" className="min-w-28"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="2026">2026</SelectItem></SelectContent>
        </Select>
        <Select value={tipe} onValueChange={setTipe}>
          <SelectTrigger aria-label="Tipe" className="min-w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>Semua Tipe</SelectItem>{TRAINING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={komp} onValueChange={setKomp}>
          <SelectTrigger aria-label="Kompetensi" className="min-w-56"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>Semua Kompetensi</SelectItem>{COMPETENCIES.map((c) => <SelectItem key={c.kode} value={c.kode}>{c.kode} · {c.nama}</SelectItem>)}</SelectContent>
        </Select>
        {admin && <Button onClick={() => setSheet({ readOnly: false })}><Plus />Buat Program</Button>}
      </PageHeader>

      {user.role === 'supervisor' && <p className="text-sm text-muted-foreground">Progres peserta menampilkan tim Anda saja.</p>}

      <div className={KPI_GRID}>
        <StatCard label="Program aktif" icon={GraduationCap} value={st.aktif} hint={`Tahun ${tahun}`} />
        <StatCard label="Peserta berjalan" icon={Users} value={st.berjalan} hint="Belum selesai pada program aktif" />
        <StatCard label="Sesi offline bulan ini" icon={CalendarDays} value={st.sesi} hint="Berdasarkan jadwal sesi" />
        <StatCard label="Tingkat kelulusan uji" icon={Percent} value={st.rate == null ? '—' : `${st.rate.toFixed(1).replace('.', ',')}%`} hint={`${st.lulus} dari ${st.taken} peserta yang diuji (${tahun})`} />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList>
          <TabsTrigger value="program">Program</TabsTrigger>
          <TabsTrigger value="jadwal">Jadwal Offline</TabsTrigger>
          <TabsTrigger value="peserta">Peserta &amp; Progres</TabsTrigger>
        </TabsList>
        <TabsContent value="program">
          <ProgramTab programs={programs} user={user} onOpen={(p, edit) => setSheet({ program: p, readOnly: !edit })} onPropose={(p) => setPropose({ program: p })} />
        </TabsContent>
        <TabsContent value="jadwal"><ScheduleTab programs={programs} user={user} onAttend={(kode, sesiId) => setHadir({ kode, sesiId })} /></TabsContent>
        <TabsContent value="peserta">
          <ParticipantsTab programs={programs} user={user} onDetail={(kode, nik) => setDetail({ kode, nik })} onUji={(kode, nik) => setUji({ kode, nik })} onCert={setCert} onPropose={() => setPropose({})} />
        </TabsContent>
      </Tabs>

      <ProgramSheet open={!!sheet} program={sheet?.program} readOnly={sheet?.readOnly ?? true} onClose={() => setSheet(null)} />
      <DetailSheet target={detail} user={user} onClose={() => setDetail(null)} onUji={(kode, nik) => setUji({ kode, nik })} />
      <UjiDialog target={uji} onClose={() => setUji(null)} />
      <AttendanceSheet target={hadir} onClose={() => setHadir(null)} />
      <CertificateDialog no={cert} onClose={() => setCert(null)} />
      <ProposeDialog open={!!propose} program={propose?.program} user={user} onClose={() => setPropose(null)} />
    </div>
  )
}
