import { useEffect, useMemo, useRef, useState } from 'react'
import { DEMO_TODAY } from '@/lib/today'
import { BadgeCheck, CalendarCheck, CircleCheck, GraduationCap, Printer, Save, ArrowLeft, TriangleAlert, UserX, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  FORMAT_FIELDS,
  FORMAT_TAB,
  emptyPersonal,
  emptyRequired,
  formatErrors,
  PERSONAL_MESSAGES,
  validate,
  type DraftForm,
  type DraftRecord,
  type FormatField,
  type PersonalKey,
  type RequiredKey,
} from '@/data/employees'
import { formatTenure } from '@/data/directory'
import type { CurrentUser } from '@/data/users'
import { PengembanganTab } from '@/components/employee/pengembangan-tab'
import { canAccessCompetency } from '@/data/competency/assessments'
import { KepegawaianTab } from '@/components/employee/kepegawaian-tab'
import { RiwayatTab } from '@/components/employee/riwayat-tab'
import { PersonalTab } from '@/components/employee/personal-tab'
import { ProfileCard } from '@/components/employee/profile-card'
import { TaxTab } from '@/components/employee/tax-tab'
import type { Candidate } from '@/data/candidates'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@/lib/format'

type Props = {
  /** Lamaran asal; kosong untuk pegawai roster dan draft "Input langsung". */
  candidate?: Candidate
  record: DraftRecord
  user: CurrentUser
  /** Nama atasan langsung (untuk tampilan pegawai aktif). */
  atasan?: string
  /** Terisi bila pegawai sudah nonaktif; profil hanya dapat dilihat. */
  exit?: { tanggal: string; alasan: string; keterangan?: string }
  backLabel: string
  onBack: () => void
  onSave: (record: DraftRecord) => void
  onDirtyChange: (dirty: boolean) => void
  onOpenApplication: () => void
  generateNik: () => string
}

function EmptyTab({ icon: Icon, title, activated }: { icon: LucideIcon; title: string; activated: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{activated ? 'Dibuat di tahap berikutnya' : 'Tersedia setelah pegawai diaktifkan'}</h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{title}</p>
      </div>
    </div>
  )
}

export default function EmployeeDraftPage({
  candidate,
  record,
  user,
  atasan,
  exit,
  backLabel,
  onBack,
  onSave,
  onDirtyChange,
  onOpenApplication,
  generateNik,
}: Props) {
  const [form, setForm] = useState<DraftForm>(record.form)
  const [tab, setTab] = useState(record.status === 'aktif' ? 'personal' : 'kepegawaian')
  const [showErrors, setShowErrors] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const focusKey = useRef<RequiredKey | null>(null)
  const [touched, setTouched] = useState<FormatField[]>([])
  const [showAllFormat, setShowAllFormat] = useState(false)

  const activated = record.status === 'aktif'
  const isSpv = user.role === 'supervisor'
  // Atasan dan pegawai nonaktif hanya melihat; Atasan juga tidak melihat identitas pribadi dan tab Asset, Tax & Bank.
  const viewOnly = isSpv || !!exit || user.role === 'payroll'
  const direct = record.source === 'langsung'
  const joining = activated && form.tanggalMasuk > DEMO_TODAY
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(record.form), [form, record.form])
  const empty = emptyRequired(form)
  const personalEmpty = direct && !activated ? emptyPersonal(form) : []
  const personalErrors: Partial<Record<PersonalKey, string>> = showErrors
    ? Object.fromEntries(personalEmpty.map((k) => [k, PERSONAL_MESSAGES[k]]))
    : {}
  const errors = showErrors ? validate(form) : {}
  const allFormat = formatErrors(form)
  const formatInvalid = Object.keys(allFormat).length > 0
  const shownFormat = Object.fromEntries(
    Object.entries(allFormat).filter(([k]) => showAllFormat || touched.includes(k as FormatField)),
  ) as Partial<Record<FormatField, string>>
  const onBlurField = (k: FormatField) => setTouched((t) => (t.includes(k) ? t : [...t, k]))

  const blockOnFormat = () => {
    const keys = FORMAT_FIELDS.filter((k) => allFormat[k])
    if (keys.length === 0) return false
    setShowAllFormat(true)
    const first = keys[0]
    setTab(FORMAT_TAB[first])
    setTimeout(() => document.getElementById(`${FORMAT_TAB[first] === 'tax' ? 't' : 'p'}-${first}`)?.focus(), 80)
    toast.error(`Perbaiki ${keys.length} kolom dengan format tidak valid`)
    return true
  }

  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  useEffect(() => {
    if (tab === 'kepegawaian' && focusKey.current) {
      const key = focusKey.current
      focusKey.current = null
      requestAnimationFrame(() => document.getElementById(`f-${key}`)?.focus())
    }
  }, [tab, showErrors])

  const patch = (p: Partial<DraftForm>) => setForm((f) => ({ ...f, ...p }))

  const save = () => {
    if (blockOnFormat()) return
    onSave({ ...record, form })
    toast.success('Draft disimpan')
  }

  const activate = () => {
    const errs = validate(form)
    const keys = Object.keys(errs) as RequiredKey[]
    setShowErrors(true)
    if (personalEmpty.length > 0) {
      setTab('personal')
      const first = personalEmpty[0]
      setTimeout(() => document.getElementById(`p-${first}`)?.focus(), 80)
      toast.error(`Lengkapi ${personalEmpty.length + keys.length} kolom wajib sebelum aktivasi`)
      return
    }
    if (keys.length > 0) {
      const first = (['jenis', 'department', 'section', 'posisi', 'level', 'statusKerja', 'kelompok', 'tanggalMasuk', 'tanggalAkhir'] as RequiredKey[]).find(
        (k) => errs[k],
      )!
      focusKey.current = first
      setTab('kepegawaian')
      requestAnimationFrame(() => document.getElementById(`f-${first}`)?.focus())
      toast.error(`Lengkapi ${keys.length} kolom wajib sebelum aktivasi`)
      return
    }
    if (blockOnFormat()) return
    setConfirmOpen(true)
  }

  const saveChanges = activated && !viewOnly && (
    <div className="flex justify-end border-t pt-6">
      <Button
        variant="outline"
        disabled={!dirty || formatInvalid}
        onClick={() => {
          if (blockOnFormat()) return
          onSave({ ...record, form })
          toast.success('Perubahan disimpan')
        }}
      >
        <Save className="size-4" />
        Simpan Perubahan
      </Button>
    </div>
  )

  const confirmActivate = (nik: string) => {
    onSave({ form, status: 'aktif', nik, activatedAt: DEMO_TODAY })
    toast.success(`Pegawai berhasil diaktifkan · NIP ${nik}`)
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{activated ? 'Data Pegawai' : 'Draft Pegawai'}</h1>
          <p className="text-sm text-muted-foreground">
            {activated
              ? `${form.nama || 'Pegawai baru'} · ${form.posisi}`
              : 'Lengkapi penempatan kerja lalu verifikasi untuk menerbitkan NIP'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activated ? (
            <>
              {form.statusKerja === 'Kontrak' && !viewOnly && (
                <Button variant="outline" onClick={() => toast('Cetak kontrak dibuat di tahap berikutnya')}>
                  <Printer className="size-4" />
                  Cetak Kontrak
                </Button>
              )}
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="size-4" />
                {backLabel}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={save}>
                <Save className="size-4" />
                Simpan Draft
              </Button>
              <Button onClick={activate}>
                <BadgeCheck className="size-4" />
                Verifikasi & Aktifkan
              </Button>
            </>
          )}
        </div>
      </div>

      {exit ? (
        <Alert variant="info">
          <UserX />
          <AlertDescription>
            Pegawai nonaktif sejak {formatDate(exit.tanggal)} ({exit.alasan}{exit.keterangan ? ` · ${exit.keterangan}` : ''}). Data hanya dapat dilihat.
          </AlertDescription>
        </Alert>
      ) : activated ? (
        <Alert variant="success">
          <CircleCheck />
          <AlertDescription>
            {candidate || direct
              ? `Pegawai ${joining ? 'akan bergabung' : 'aktif'} mulai ${formatDate(form.tanggalMasuk)}. NIP ${record.nik} diterbitkan pada ${formatDate(record.activatedAt ?? DEMO_TODAY)} oleh Admin HRD.`
              : `Pegawai aktif sejak ${formatDate(form.tanggalMasuk)}. NIP ${record.nik}.`}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertTitle>Menunggu Verifikasi HRD</AlertTitle>
          <AlertDescription>
            {candidate
              ? `Draft dibuat dari lamaran ${candidate.id} pada ${formatDate(candidate.draftCreatedAt ?? DEMO_TODAY)}. Lengkapi data Kepegawaian sebelum aktivasi.`
              : `Draft dibuat dari input langsung pada ${formatDate(record.createdAt ?? DEMO_TODAY)}. Lengkapi data Personal dan Kepegawaian sebelum aktivasi.`}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <ProfileCard
            candidate={candidate}
            nama={form.nama}
            posisi={form.posisi}
            statusKerja={form.statusKerja}
            jenis={form.jenis}
            emptyCount={empty.length}
            personalEmpty={personalEmpty.length}
            direct={direct ? { createdAt: record.createdAt ?? DEMO_TODAY } : undefined}
            employee={
              activated && !candidate
                ? {
                    nik: record.nik ?? '',
                    tanggalMasuk: form.tanggalMasuk,
                    masaKerja: formatTenure(form.tanggalMasuk, exit?.tanggal ?? DEMO_TODAY),
                    atasan: atasan ?? '—',
                  }
                : undefined
            }
            exit={exit}
            activated={activated}
            onOpenApplication={onOpenApplication}
          />
        </div>
        <div className="min-w-0 lg:col-span-8">
          <Card>
            <CardContent>
              <Tabs value={tab} onValueChange={setTab} className="gap-6">
                <div className="-mx-6 overflow-x-auto overflow-y-hidden border-b px-6">
                  <TabsList variant="line" className="h-auto w-max justify-start gap-2 p-0 pb-1.5">
                    <TabsTrigger value="personal" className="flex-none px-3 py-2">Personal</TabsTrigger>
                    <TabsTrigger value="kepegawaian" className="flex-none px-3 py-2">Kepegawaian</TabsTrigger>
                    {activated && record.nik && <TabsTrigger value="riwayat" className="flex-none px-3 py-2">Riwayat Kepegawaian</TabsTrigger>}
                    <TabsTrigger value="pengembangan" className="flex-none px-3 py-2">Pengembangan</TabsTrigger>
                    {!isSpv && <TabsTrigger value="tax" className="flex-none px-3 py-2">Asset, Tax &amp; Bank</TabsTrigger>}
                    <TabsTrigger value="kehadiran" className="flex-none px-3 py-2">Kehadiran &amp; Cuti</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="personal" className="space-y-6">
                  <PersonalTab
                    form={form}
                    source={candidate?.id}
                    errors={shownFormat}
                    required={direct && !activated}
                    requiredErrors={personalErrors}
                    readOnly={viewOnly}
                    hideIds={isSpv}
                    onBlurField={onBlurField}
                    onChange={patch}
                  />
                  {saveChanges}
                </TabsContent>
                <TabsContent value="kepegawaian">
                  <KepegawaianTab form={form} errors={errors} nik={record.nik} locked={activated} atasan={atasan} showPay={!isSpv} onChange={patch} />
                </TabsContent>
                {activated && record.nik && (
                  <TabsContent value="riwayat">
                    <RiwayatTab nik={record.nik} user={user} />
                  </TabsContent>
                )}
                {!isSpv && (
                  <TabsContent value="tax" className="space-y-6">
                    <TaxTab form={form} errors={shownFormat} readOnly={viewOnly} onBlurField={onBlurField} onChange={patch} />
                    {saveChanges}
                  </TabsContent>
                )}
                <TabsContent value="pengembangan">
                  {activated && record.nik && canAccessCompetency(user.role) ? (
                    <PengembanganTab nik={record.nik} user={user} />
                  ) : (
                    <EmptyTab activated={activated} icon={GraduationCap} title="Kompetensi, riwayat training, dan evaluasi KPI akan muncul di sini." />
                  )}
                </TabsContent>
                <TabsContent value="kehadiran">
                  <EmptyTab activated={activated} icon={CalendarCheck} title="Rekap absensi, saldo cuti, dan riwayat izin akan muncul di sini." />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verifikasi & aktifkan {form.nama}?</AlertDialogTitle>
            <AlertDialogDescription>
              NIP akan dibuat otomatis dan status berubah menjadi Karyawan Aktif mulai Tanggal Masuk{' '}
              {form.tanggalMasuk ? formatDate(form.tanggalMasuk) : ''}. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmActivate(generateNik())}>Verifikasi & Aktifkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
