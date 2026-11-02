import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Info, Lock, Search } from 'lucide-react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/employee/date-picker'
import { Field } from '@/components/employee/field'
import { LetterDialog, type LetterData } from '@/components/transactions/letter-dialog'
import { JENIS_ICON } from '@/components/transactions/shared'
import { RupiahField } from '@/components/payroll/rupiah-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { departments, KELOMPOK, posisiOptions, ROSTER, SUPERVISORS } from '@/data/employees'
import { contractsOf } from '@/data/contracts'
import { isPending, type LeaveRequest } from '@/data/leave'
import { contractLimitMonths, monthsText } from '@/data/master/contract-limit'
import { statusOptionsOf, JENIS_LIST } from '@/data/master/jenis'
import { LEVEL_DEFS } from '@/data/master/levels'
import { sectionNodesOf } from '@/data/master/organization'
import { POSITIONS } from '@/data/master/positions'
import { idr, salaryAt } from '@/data/payroll/salaries'
import {
  DEMOSI_ALASAN,
  JENIS_NOTE,
  TRX_JENIS,
  impactLines,
  ineligibleReason,
  isActive,
  nextSuratNo,
  payrollPeriodOptions,
  placeText,
  previewTrx,
  submitTrx,
  supName,
  type TrxInput,
  type TrxJenis,
} from '@/data/transactions'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { DEMO_TODAY } from '@/lib/today'
import { AlasanField } from '@/components/ui/alasan-field'

const levelIdx = (l: string) => LEVEL_DEFS.findIndex((x) => x.nama === l)
const SAME = '__same'

type Form = {
  nik: string
  efektif: string
  periodeId: string
  posisi: string
  kelompok: string
  gaji: string
  department: string
  section: string
  atasanId: string
  durasi: string
  jenisBaru: string
  statusBaru: string
  alasanDemosi: string
  alasan: string
  lampiran: PickedFile | null
}
const blank = (): Form => ({ nik: '', efektif: '', periodeId: '', posisi: '', kelompok: '', gaji: '', department: '', section: '', atasanId: '', durasi: '12', jenisBaru: '', statusBaru: '', alasanDemosi: '', alasan: '', lampiran: null })

function Pair({ id, label, current, required, error, helper, children }: { id: string; label: string; current: string; required?: boolean; error?: string; helper?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field id={`${id}-cur`} label={`${label} saat ini`}>
        <Input id={`${id}-cur`} readOnly value={current || '—'} className="bg-muted/50 text-foreground" />
      </Field>
      <Field id={id} label={`${label} usulan`} required={required} error={error} helper={helper}>
        {children}
      </Field>
    </div>
  )
}

function ReadOnly({ id, value }: { id: string; value: string }) {
  return (
    <div className="relative">
      <Input id={id} readOnly value={value || '—'} className="bg-muted/50 pr-9 text-foreground" />
      <Lock className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  )
}

function PickSelect({ id, value, onChange, options, placeholder, invalid, disabled }: { id: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string; invalid?: boolean; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid || undefined}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

/** Combobox pegawai: yang tidak memenuhi syarat jenis transaksi tetap tampil, dinonaktifkan dengan alasannya. */
function EmployeePicker({ jenis, value, onChange, invalid }: { jenis: TrxJenis; value: string; onChange: (nik: string) => void; invalid?: boolean }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const chosen = ROSTER.find((e) => e.nik === value)
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return ROSTER.filter((e) => isActive(e) && (!t || `${e.nama} ${e.nik}`.toLowerCase().includes(t)))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
      .slice(0, 40)
      .map((e) => ({ e, reason: ineligibleReason(jenis, e) }))
  }, [q, jenis])
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setQ('') }}>
      <PopoverTrigger asChild>
        <Button id="trx-pegawai" type="button" role="combobox" aria-expanded={open} aria-invalid={invalid || undefined} variant="outline" className={cn('w-full justify-between font-normal aria-invalid:border-destructive', !chosen && 'text-muted-foreground')}>
          <span className="truncate">{chosen ? `${chosen.nama} · ${chosen.nik}` : 'Pilih pegawai'}</span>
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="relative border-b">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Cari pegawai" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau NIP…" className="rounded-b-none border-0 pl-9 shadow-none focus-visible:ring-0" />
        </div>
        <ul role="listbox" aria-label="Daftar pegawai" className="max-h-64 overflow-y-auto p-1">
          {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Pegawai tidak ditemukan.</li>}
          {list.map(({ e, reason }) => (
            <li key={e.nik} role="option" aria-selected={e.nik === value} aria-disabled={!!reason}>
              <button
                type="button"
                disabled={!!reason}
                onClick={() => { onChange(e.nik); setOpen(false) }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
              >
                <Check className={cn('size-4 shrink-0', e.nik === value ? 'opacity-100' : 'opacity-0')} aria-hidden />
                <span className="flex flex-col leading-tight">
                  <span className="font-medium">{e.nama}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{e.nik} · {e.posisi} · {e.statusKerja}</span>
                  {reason && <span className="text-xs text-warning">{reason}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

export function TrxCreateSheet({
  open,
  onOpenChange,
  user,
  leaves,
  initial,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  user: CurrentUser
  leaves: LeaveRequest[]
  initial?: { jenis?: TrxJenis; nik?: string }
  onCreated?: (no: string) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[640px]">
        {open && <Body key={`${initial?.jenis ?? ''}|${initial?.nik ?? ''}`} user={user} leaves={leaves} initial={initial} onClose={() => onOpenChange(false)} onCreated={onCreated} />}
      </SheetContent>
    </Sheet>
  )
}

function Body({ user, leaves, initial, onClose, onCreated }: { user: CurrentUser; leaves: LeaveRequest[]; initial?: { jenis?: TrxJenis; nik?: string }; onClose: () => void; onCreated?: (no: string) => void }) {
  const [jenis, setJenis] = useState<TrxJenis>(initial?.jenis ?? 'Promosi')
  const [f, setF] = useState<Form>(() => ({ ...blank(), nik: initial?.nik ?? '' }))
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [letter, setLetter] = useState<LetterData | null>(null)
  const patch = (p: Partial<Form>) => setF((cur) => ({ ...cur, ...p }))
  const touch = (k: string) => setTouched((s) => new Set(s).add(k))

  const input: TrxInput = {
    jenis,
    nik: f.nik,
    efektif: f.efektif || undefined,
    periodeId: f.periodeId || undefined,
    posisi: f.posisi || undefined,
    kelompok: f.kelompok || undefined,
    gaji: f.gaji ? Number(f.gaji) : undefined,
    department: f.department || undefined,
    section: f.section || undefined,
    atasanId: f.atasanId || undefined,
    durasi: Number(f.durasi) || 0,
    jenisBaru: f.jenisBaru || undefined,
    statusBaru: f.statusBaru || undefined,
    alasanDemosi: f.alasanDemosi || undefined,
    alasan: f.alasan,
    lampiran: f.lampiran?.name,
  }
  const p = previewTrx(input)
  const emp = p?.emp
  const reason = emp ? ineligibleReason(jenis, emp) : null
  const err = (k: string) => (p && (submitted || touched.has(k)) ? p.errors[k] : undefined)
  const periods = payrollPeriodOptions()
  const payType = jenis === 'Promosi' || jenis === 'Demosi' || jenis === 'Pindah Kategori'

  const changeJenis = (j: TrxJenis) => {
    setJenis(j)
    setSubmitted(false)
    setTouched(new Set())
    setF((cur) => {
      const e = ROSTER.find((x) => x.nik === cur.nik)
      return { ...blank(), nik: e && !ineligibleReason(j, e) ? cur.nik : '', alasan: cur.alasan, lampiran: cur.lampiran }
    })
  }
  const changeNik = (nik: string) => {
    const e = ROSTER.find((x) => x.nik === nik)
    setSubmitted(false)
    setTouched(new Set())
    setF((cur) => ({ ...blank(), nik, alasan: cur.alasan, lampiran: cur.lampiran, gaji: jenis === 'Pindah Kategori' && e?.kelompok === 'Harian' ? String(e.gajiPokok) : '' }))
  }

  const pending = emp ? leaves.filter((r) => r.nik === emp.nik && isPending(r.status)).map((r) => r.no) : []
  const lines = p && emp && !reason
    ? impactLines({ jenis, sebelum: p.before, sesudah: p.after, efektif: p.efektif || DEMO_TODAY, gaji: p.gaji, kontrak: p.kontrak, nik: emp.nik }, pending)
    : []
  const noPayCan = user.role !== 'supervisor'

  const letterData = (): LetterData | null =>
    p && emp
      ? { jenis, nik: emp.nik, suratNo: nextSuratNo(jenis), tanggal: DEMO_TODAY, efektif: p.efektif || DEMO_TODAY, sebelum: p.before, sesudah: p.after, gaji: p.gaji, kontrak: p.kontrak, alasanDemosi: f.alasanDemosi || undefined, alasan: f.alasan.trim(), disetujui: false, showPay: noPayCan }
      : null

  const submit = () => {
    setSubmitted(true)
    const res = submitTrx(input, user)
    if (res.no) {
      toast.success(`Transaksi ${res.no} diajukan dan menunggu approval`)
      onCreated?.(res.no)
      onClose()
    } else toast.error('Lengkapi isian yang ditandai terlebih dahulu')
  }

  const dept = emp?.department ?? ''
  const cur = p?.before
  // ---- opsi per jenis ----
  const posOptions = emp
    ? POSITIONS.filter((x) => x.status === 'Aktif' && (!x.department || x.department === emp.department) && (jenis === 'Promosi' ? levelIdx(x.level) > levelIdx(emp.level) : jenis === 'Demosi' ? levelIdx(x.level) < levelIdx(emp.level) : true))
        .map((x) => ({ value: x.nama, label: `${x.nama} · ${x.level} · ${x.grade}` }))
    : []
  const sectionOptions = (d: string, exclude?: string) => sectionNodesOf(d).filter((s) => s.status === 'Aktif' && s.id !== exclude).map((s) => ({ value: s.nama, label: s.nama }))
  const targetDept = jenis === 'Mutasi' ? f.department : dept
  const optionalPosisi = targetDept && f.section ? [{ value: SAME, label: `Tidak berubah (${emp?.posisi ?? ''})` }, ...posisiOptions(targetDept, f.section).filter((x) => x !== emp?.posisi).map((x) => ({ value: x, label: x }))] : []
  const atasanOptions = SUPERVISORS.filter((s) => s.id !== emp?.nik).map((s) => ({ value: s.id, label: s.nama }))
  const statusOpts = f.jenisBaru ? statusOptionsOf(f.jenisBaru) : []
  const showKontrakFields = jenis === 'Pindah Kategori' && p?.after.statusKerja === 'Kontrak'
  const harianToBulanan = jenis === 'Pindah Kategori' && !!emp && emp.kelompok === 'Harian' && !!f.jenisBaru && p?.after.kelompok !== 'Harian'

  return (
    <>
      <SheetHeader>
        <SheetTitle>Buat Transaksi Kepegawaian</SheetTitle>
        <SheetDescription>Perubahan berlaku pada tanggal efektif setelah disetujui. NIP dan Tanggal Masuk tidak pernah berubah.</SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4">
        <section className="space-y-2" aria-label="Jenis transaksi">
          <p className="text-sm font-medium">Jenis transaksi</p>
          <RadioGroup value={jenis} onValueChange={(v) => changeJenis(v as TrxJenis)} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TRX_JENIS.map((j) => {
              const Icon = JENIS_ICON[j]
              return (
                <label key={j} htmlFor={`trx-j-${j}`} className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-accent/50', jenis === j && 'ring-2 ring-ring')}>
                  <RadioGroupItem id={`trx-j-${j}`} value={j} className="mt-0.5" />
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="flex items-center gap-1.5 text-sm font-medium"><Icon className="size-4 text-muted-foreground" aria-hidden />{j}</span>
                    <span className="mt-1 text-xs text-muted-foreground">{JENIS_NOTE[j]}</span>
                  </span>
                </label>
              )
            })}
          </RadioGroup>
        </section>

        <section className="space-y-2">
          <Field id="trx-pegawai" label="Pegawai" required error={submitted && !f.nik ? 'Pegawai wajib dipilih' : (submitted && reason) || undefined} helper="Pegawai yang tidak memenuhi syarat tampil nonaktif beserta alasannya.">
            <EmployeePicker jenis={jenis} value={f.nik} onChange={changeNik} invalid={submitted && !f.nik} />
          </Field>
          {emp && cur && (
            <p className="text-sm text-muted-foreground">
              {placeText(cur)} · {cur.posisi} · Level {cur.level} · Grade {cur.grade} · {cur.jenis} {cur.statusKerja} · Atasan {supName(cur.atasanId)}
            </p>
          )}
        </section>

        {emp && cur && p && !reason && (
          <>
            <section className="space-y-4" aria-label="Perubahan">
              <h3 className="text-sm font-medium">Perubahan: saat ini dan usulan</h3>

              {(jenis === 'Promosi' || jenis === 'Demosi') && (
                <>
                  <Pair id="trx-posisi" label="Posisi" current={cur.posisi} required error={err('posisi')} helper={jenis === 'Promosi' ? 'Hanya posisi dengan level lebih tinggi.' : 'Hanya posisi dengan level lebih rendah.'}>
                    <PickSelect id="trx-posisi" value={f.posisi} onChange={(v) => { patch({ posisi: v, kelompok: '' }); touch('posisi') }} options={posOptions} placeholder={posOptions.length ? 'Pilih posisi' : 'Tidak ada posisi yang sesuai'} invalid={!!err('posisi')} disabled={posOptions.length === 0} />
                  </Pair>
                  <Pair id="trx-level" label="Level" current={cur.level}><ReadOnly id="trx-level" value={f.posisi ? p.after.level : ''} /></Pair>
                  <Pair id="trx-grade" label="Grade" current={cur.grade}><ReadOnly id="trx-grade" value={f.posisi ? p.after.grade : ''} /></Pair>
                  <Pair id="trx-kelompok" label="Group Kerja" current={cur.kelompok} helper="Diturunkan dari Level; dapat diubah. Pembagi: Staff 21, Non Staff 25.">
                    <PickSelect id="trx-kelompok" value={f.posisi ? (f.kelompok || p.after.kelompok) : ''} onChange={(v) => patch({ kelompok: v })} options={KELOMPOK.map((k) => ({ value: k, label: k }))} placeholder="Ikuti Level" disabled={!f.posisi} />
                  </Pair>
                  {emp.kelompok === 'Harian' ? (
                    <p className="text-xs text-muted-foreground">Upah Harian berlaku seragam untuk Group Harian dan diatur di Komponen Gaji; tidak ada Gaji Pokok per pegawai.</p>
                  ) : (
                    noPayCan && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field id="trx-gaji-cur" label="Gaji Pokok saat ini">
                          <Input id="trx-gaji-cur" readOnly value={idr(salaryAt(emp, p.efektif || DEMO_TODAY).gajiPokok)} className="bg-muted/50 tabular-nums text-foreground" />
                        </Field>
                        <RupiahField id="trx-gaji" label="Gaji Pokok usulan" required={false} value={f.gaji} onChange={(d) => { patch({ gaji: d }); touch('gaji') }} error={err('gaji')} helper="Opsional. Bila diisi, dibuat Perubahan Gaji saat persetujuan akhir." />
                      </div>
                    )
                  )}
                  {jenis === 'Demosi' && (
                    <Field id="trx-alasan-demosi" label="Alasan demosi" required error={err('alasanDemosi')}>
                      <PickSelect id="trx-alasan-demosi" value={f.alasanDemosi} onChange={(v) => { patch({ alasanDemosi: v }); touch('alasanDemosi') }} options={DEMOSI_ALASAN.map((a) => ({ value: a, label: a }))} placeholder="Pilih alasan demosi" invalid={!!err('alasanDemosi')} />
                    </Field>
                  )}
                </>
              )}

              {jenis === 'Rotasi' && (
                <>
                  <Pair id="trx-section" label="Section" current={cur.section} required error={err('section')} helper={`Department tetap ${dept}.`}>
                    <PickSelect id="trx-section" value={f.section} onChange={(v) => { patch({ section: v, posisi: '', atasanId: '' }); touch('section') }} options={sectionOptions(dept, emp.sec)} placeholder="Pilih section" invalid={!!err('section')} />
                  </Pair>
                  <Pair id="trx-posisi" label="Posisi" current={cur.posisi} helper="Opsional.">
                    <PickSelect id="trx-posisi" value={f.posisi || (f.section ? SAME : '')} onChange={(v) => patch({ posisi: v === SAME ? '' : v })} options={optionalPosisi} placeholder="Pilih section dulu" disabled={!f.section} />
                  </Pair>
                  <Pair id="trx-atasan" label="Atasan" current={supName(cur.atasanId)} helper="Otomatis dari kepala Section baru; dapat diubah.">
                    <PickSelect id="trx-atasan" value={f.section ? (f.atasanId || p.after.atasanId) : ''} onChange={(v) => patch({ atasanId: v })} options={atasanOptions} placeholder="Pilih section dulu" disabled={!f.section} />
                  </Pair>
                </>
              )}

              {jenis === 'Mutasi' && (
                <>
                  <Pair id="trx-dept" label="Department" current={cur.department} required error={err('department')}>
                    <PickSelect id="trx-dept" value={f.department} onChange={(v) => { patch({ department: v, section: '', posisi: '', atasanId: '' }); touch('department') }} options={departments().filter((d) => d !== dept).map((d) => ({ value: d, label: d }))} placeholder="Pilih department" invalid={!!err('department')} />
                  </Pair>
                  <Pair id="trx-section" label="Section" current={cur.section} required error={err('section')}>
                    <PickSelect id="trx-section" value={f.section} onChange={(v) => { patch({ section: v, posisi: '', atasanId: '' }); touch('section') }} options={f.department ? sectionOptions(f.department) : []} placeholder="Pilih section" invalid={!!err('section')} disabled={!f.department} />
                  </Pair>
                  <Pair id="trx-posisi" label="Posisi" current={cur.posisi} helper="Opsional. Kosongkan untuk mempertahankan posisi.">
                    <PickSelect id="trx-posisi" value={f.posisi || (f.section ? SAME : '')} onChange={(v) => patch({ posisi: v === SAME ? '' : v })} options={optionalPosisi} placeholder="Pilih section dulu" disabled={!f.section} />
                  </Pair>
                  <Pair id="trx-atasan" label="Atasan" current={supName(cur.atasanId)} helper="Otomatis dari kepala Section baru; dapat diubah.">
                    <PickSelect id="trx-atasan" value={f.section ? (f.atasanId || p.after.atasanId) : ''} onChange={(v) => patch({ atasanId: v })} options={atasanOptions} placeholder="Pilih section dulu" disabled={!f.section} />
                  </Pair>
                </>
              )}

              {jenis === 'Perpanjangan Kontrak' && (
                <>
                  <Pair id="trx-kontrak-cur" label="Kontrak" current={(() => { const c = contractsOf(emp.nik).at(-1); return c ? `Ke-${c.ke} · s/d ${formatDate(c.akhir)}` : '' })()}>
                    <ReadOnly id="trx-kontrak-cur" value={p.kontrak ? `Kontrak ke-${p.kontrak.ke}` : `Kontrak ke-${contractsOf(emp.nik).length + 1}`} />
                  </Pair>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field id="trx-durasi" label="Durasi (bulan)" required error={err('durasi')} helper="1–24 bulan">
                      <Input id="trx-durasi" inputMode="numeric" value={f.durasi} aria-invalid={!!err('durasi') || undefined} onChange={(e) => { patch({ durasi: e.target.value.replace(/\D/g, '').slice(0, 2) }); touch('durasi') }} className="tabular-nums" />
                    </Field>
                    <Field id="trx-mulai" label="Mulai" helper="Sehari setelah kontrak berjalan berakhir">
                      <ReadOnly id="trx-mulai" value={p.efektif ? formatDate(p.efektif) : ''} />
                    </Field>
                    <Field id="trx-akhir" label="Berakhir" helper="Dihitung dari durasi">
                      <ReadOnly id="trx-akhir" value={p.kontrak ? formatDate(p.kontrak.akhir) : ''} />
                    </Field>
                  </div>
                  {p.totalBulan !== undefined && !p.errors.durasi && (
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {p.kontrak && `${formatDate(p.kontrak.mulai)} – ${formatDate(p.kontrak.akhir)} · `}Total masa kontrak {monthsText(p.totalBulan)} dari batas {monthsText(contractLimitMonths())}
                    </p>
                  )}
                </>
              )}

              {jenis === 'Pengangkatan Tetap' && (
                <>
                  <Pair id="trx-status" label="Status Kerja" current={cur.statusKerja}><ReadOnly id="trx-status" value="Tetap" /></Pair>
                  <Pair id="trx-akhir-cur" label="Berakhir Kontrak" current={cur.tanggalAkhir ? formatDate(cur.tanggalAkhir) : ''}><ReadOnly id="trx-akhir-cur" value="Dikosongkan" /></Pair>
                  <Alert variant="info"><Info /><AlertDescription>Masa kerja dihitung sejak tanggal masuk pertama.</AlertDescription></Alert>
                </>
              )}

              {jenis === 'Pindah Kategori' && (
                <>
                  <Pair id="trx-jenisbaru" label="Jenis Karyawan" current={cur.jenis} required error={err('jenisBaru')}>
                    <PickSelect id="trx-jenisbaru" value={f.jenisBaru} onChange={(v) => { patch({ jenisBaru: v, kelompok: '', statusBaru: '' }); touch('jenisBaru') }} options={JENIS_LIST.filter((j) => j !== cur.jenis).map((j) => ({ value: j, label: j }))} placeholder="Pilih jenis karyawan" invalid={!!err('jenisBaru')} />
                  </Pair>
                  <Pair id="trx-kelompok" label="Group Kerja" current={cur.kelompok} helper="Diturunkan dari Jenis Karyawan, Posisi, dan Level; dapat diubah.">
                    <PickSelect id="trx-kelompok" value={f.jenisBaru ? (f.kelompok || p.after.kelompok) : ''} onChange={(v) => patch({ kelompok: v })} options={KELOMPOK.map((k) => ({ value: k, label: k }))} placeholder="Pilih jenis dulu" disabled={!f.jenisBaru} />
                  </Pair>
                  <Pair id="trx-statusbaru" label="Status Kerja" current={cur.statusKerja} required error={err('statusBaru')}>
                    <PickSelect id="trx-statusbaru" value={f.jenisBaru ? (f.statusBaru || (statusOpts.length === 1 ? statusOpts[0] : '')) : ''} onChange={(v) => patch({ statusBaru: v })} options={statusOpts.map((s) => ({ value: s, label: s }))} placeholder="Pilih jenis dulu" invalid={!!err('statusBaru')} disabled={!f.jenisBaru} />
                  </Pair>
                  {showKontrakFields && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Field id="trx-durasi" label="Durasi (bulan)" required error={err('durasi')} helper="1–24 bulan">
                        <Input id="trx-durasi" inputMode="numeric" value={f.durasi} aria-invalid={!!err('durasi') || undefined} onChange={(e) => { patch({ durasi: e.target.value.replace(/\D/g, '').slice(0, 2) }); touch('durasi') }} className="tabular-nums" />
                      </Field>
                      <Field id="trx-mulai" label="Mulai" helper="Tanggal efektif"><ReadOnly id="trx-mulai" value={p.efektif ? formatDate(p.efektif) : ''} /></Field>
                      <Field id="trx-akhir" label="Berakhir" helper="Dihitung dari durasi"><ReadOnly id="trx-akhir" value={p.kontrak ? formatDate(p.kontrak.akhir) : ''} /></Field>
                    </div>
                  )}
                  {harianToBulanan && noPayCan && (
                    <RupiahField id="trx-gaji" label="Gaji Pokok baru" value={f.gaji} onChange={(d) => { patch({ gaji: d }); touch('gaji') }} error={err('gaji')} helper="Pegawai Harian beralih dari Upah Harian ke Gaji Pokok bulanan. Bila berbeda dari gaji tercatat, dibuat Perubahan Gaji." />
                  )}
                  <Alert variant="info"><Info /><AlertDescription>NIP dan masa kerja tetap; tidak dihitung turnover.</AlertDescription></Alert>
                </>
              )}
            </section>

            <section className="space-y-2" aria-label="Tanggal efektif">
              {payType ? (
                <Field id="trx-periode" label="Periode payroll" required error={err('periodeId')} helper={p.efektif ? `Tanggal efektif ${formatDate(p.efektif)}, hari pertama periode.` : 'Perubahan memengaruhi gaji, jadi berlaku mulai hari pertama periode payroll yang belum Final.'}>
                  <PickSelect id="trx-periode" value={f.periodeId} onChange={(v) => { patch({ periodeId: v }); touch('periodeId') }} options={periods.map((o) => ({ value: o.id, label: o.text }))} placeholder="Pilih periode payroll" invalid={!!err('periodeId')} />
                </Field>
              ) : jenis === 'Perpanjangan Kontrak' ? (
                <Field id="trx-efektif-ro" label="Tanggal efektif" helper="Selalu sehari setelah kontrak berjalan berakhir.">
                  <ReadOnly id="trx-efektif-ro" value={p.efektif ? formatDate(p.efektif) : ''} />
                </Field>
              ) : (
                <Field id="trx-efektif" label="Tanggal efektif" required error={err('efektif')} helper="Hari ini atau setelahnya.">
                  <DatePicker id="trx-efektif" value={f.efektif} min={DEMO_TODAY} invalid={!!err('efektif')} hintDate={DEMO_TODAY} onChange={(d) => { patch({ efektif: d }); touch('efektif') }} />
                </Field>
              )}
            </section>

            <section className="space-y-4">
              <AlasanField id="trx-alasan" label={jenis === 'Demosi' ? 'Keterangan' : 'Alasan'} value={f.alasan} onChange={(v) => patch({ alasan: v })} onBlur={() => touch('alasan')} error={err('alasan')} placeholder="Tulis dasar pertimbangan transaksi ini…" />
              <Field id="trx-lampiran" label="Lampiran" helper="Opsional. PDF, JPG, atau PNG, maksimal 5 MB.">
                <FilePicker id="trx-lampiran" accept=".pdf,.jpg,.jpeg,.png" extensions={['pdf', 'jpg', 'jpeg', 'png']} maxBytes={5 * 1048576} typeError="Format file harus PDF, JPG, atau PNG" value={f.lampiran} onChange={(v) => patch({ lampiran: v })} />
              </Field>
            </section>

            <section className="space-y-2" aria-label="Dampak">
              <h3 className="text-sm font-medium">Dampak</h3>
              {p.warnings.map((w) => (
                <Alert key={w} variant="warning"><Info /><AlertDescription>{w}</AlertDescription></Alert>
              ))}
              {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Dampak muncul setelah usulan perubahan diisi.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {lines.filter((l) => noPayCan || !l.pay).map((l) => <li key={l.text}>{l.text}</li>)}
                  {!noPayCan && lines.some((l) => l.pay) && <li className="text-muted-foreground">Rincian gaji hanya untuk HR & GA Manager</li>}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
      <SheetFooter className="flex-row justify-end gap-2">
        <Button type="button" variant="outline" disabled={!p || !!reason} onClick={() => setLetter(letterData())}>Pratinjau Surat</Button>
        <Button type="button" onClick={submit}>Ajukan</Button>
      </SheetFooter>
      <LetterDialog data={letter} onClose={() => setLetter(null)} />
    </>
  )
}
