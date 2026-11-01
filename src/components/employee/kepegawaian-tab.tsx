import { Info, Lock } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatDate } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { accountOf } from '@/data/accounts'
import { SECURITY_POLICY } from '@/data/master/security-policy'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from './date-picker'
import { Field, descId } from './field'
import { JENIS_LIST, statusOptionsOf } from '@/data/master/jenis'
import {
  departments,
  CONTRACT_WARN_DAYS,
  KELOMPOK,
  levels,
  levelDefaultOf,
  STATUS_KERJA,
  daysFromToday,
  defaultKelompok,
  posisiOptions,
  sectionNames,
  type DraftForm,
  type RequiredKey,
} from '@/data/employees'

type Props = {
  form: DraftForm
  errors: Partial<Record<RequiredKey, string>>
  nik?: string
  locked?: boolean
  /** Nama atasan langsung; ditampilkan pada tampilan terkunci. */
  atasan?: string
  /** Nominal gaji dari penawaran hanya untuk HR; Atasan tidak melihat Rupiah. */
  showPay?: boolean
  /** Galat Email kantor (divalidasi saat Verifikasi & Aktifkan). */
  emailError?: string
  onChange: (patch: Partial<DraftForm>) => void
}

function SelectField({
  id,
  label,
  value,
  options,
  error,
  helper,
  warning,
  placeholder,
  disabled,
  disabledOptions,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: string[]
  error?: string
  helper?: string
  warning?: string
  placeholder: string
  disabled?: boolean
  /** Opsi yang tampil tetapi tidak bisa dipilih. */
  disabledOptions?: string[]
  onChange: (v: string) => void
}) {
  return (
    <Field id={id} label={label} required error={error} helper={helper} warning={warning}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={!!error || undefined}
          aria-describedby={descId(id, !!helper, !!error, !!warning)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o} disabled={disabledOptions?.includes(o)}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function LockedTab({ form, nik, atasan }: { form: DraftForm; nik?: string; atasan?: string }) {
  const rows: [string, string][] = [
    ['Department', form.department],
    ['Section', form.section],
    ['Posisi', form.posisi],
    ['Level', form.level],
    ['Jenis Karyawan', form.jenis || 'Organik'],
    ['Status Kerja', form.statusKerja],
    ['Group Kerja', form.kelompok],
    ['Tanggal Masuk', formatDate(form.tanggalMasuk)],
  ]
  if (form.statusKerja === 'Kontrak') rows.push(['Tanggal Berakhir Kontrak', formatDate(form.tanggalAkhir)])
  if (atasan) rows.push(['Atasan Langsung', atasan])
  const email = (nik ? accountOf(nik)?.emailKantor : undefined) ?? form.emailKantor
  if (email) rows.push(['Email kantor', email])
  return (
    <div className="space-y-6">
      <Alert variant="info">
        <Info />
        <AlertDescription>Perubahan penempatan, jabatan, atau status kerja dilakukan lewat Transaksi Kepegawaian.</AlertDescription>
      </Alert>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field id="f-nik" label="NIP" helper="Format PPI-YYYY-NNNN, terpisah dari NIK (KTP)" className="md:col-span-2">
          <div className="relative">
            <Input id="f-nik" readOnly value={nik ?? ''} aria-describedby="f-nik-help" className="bg-muted/50 pr-9 text-foreground tabular-nums" />
            <Lock className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          </div>
        </Field>
        {rows.map(([label, value]) => (
          <Field key={label} id={`f-ro-${label}`} label={label}>
            <Input id={`f-ro-${label}`} readOnly value={value} className="bg-muted/50 text-foreground" />
          </Field>
        ))}
      </div>
    </div>
  )
}

export function KepegawaianTab({ form, errors, nik, locked, atasan, showPay = true, emailError, onChange }: Props) {
  if (locked) return <LockedTab form={form} nik={nik} atasan={atasan} />
  const sections = sectionNames(form.department)
  const positions = posisiOptions(form.department, form.section)
  const pkwt = form.statusKerja === 'Kontrak'
  const remaining = form.tanggalAkhir ? daysFromToday(form.tanggalAkhir) : null
  const nearEnd = remaining !== null && remaining > 0 && remaining <= CONTRACT_WARN_DAYS

  const o = form.penawaran
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {o && (
        <Alert variant="info" className="md:col-span-2">
          <Info />
          <AlertTitle>Disalin dari penawaran {o.olNo}</AlertTitle>
          <AlertDescription>
            <dl className="mt-1 grid grid-cols-[150px_1fr] gap-x-3 gap-y-1">
              <dt>Grade</dt><dd className="font-medium">{o.grade}</dd>
              <dt>Kontrak</dt><dd className="font-medium">{form.statusKerja === 'Kontrak' ? `${o.durasi} bulan` : 'Tetap'}</dd>
              {showPay && (
                <>
                  <dt>Gaji Pokok</dt><dd className="font-medium tabular-nums">Rp {o.gajiPokok.toLocaleString('id-ID')}</dd>
                  <dt>Tunjangan Jabatan</dt><dd className="font-medium tabular-nums">Rp {o.tunjangan.toLocaleString('id-ID')}</dd>
                  <dt>Makan / Transport</dt><dd className="font-medium tabular-nums">Rp {o.makan.toLocaleString('id-ID')} / Rp {o.transport.toLocaleString('id-ID')} per hari hadir</dd>
                </>
              )}
            </dl>
          </AlertDescription>
        </Alert>
      )}
      <Field
        id="f-nik"
        label="NIP"
        helper="Format PPI-YYYY-NNNN, terpisah dari NIK (KTP)"
        className="md:col-span-2"
      >
        <div className="relative">
          <Input
            id="f-nik"
            readOnly
            value={nik ?? 'Dibuat otomatis saat aktivasi'}
            aria-describedby="f-nik-help"
            className="bg-muted/50 pr-9 text-foreground disabled:opacity-100"
          />
          <Lock className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        </div>
      </Field>

      <SelectField
        id="f-jenis"
        label="Jenis Karyawan"
        placeholder="Pilih jenis karyawan"
        value={form.jenis}
        options={JENIS_LIST}
        error={errors.jenis}
        helper="Organik: Tetap atau Kontrak. Harian, Magang, dan Outsourcing selalu Kontrak."
        onChange={(jenis) =>
          onChange({
            jenis,
            statusKerja: jenis === 'Organik' ? (form.statusKerja === 'Tetap' || form.statusKerja === 'Kontrak' ? form.statusKerja : '') : 'Kontrak',
            tanggalAkhir: jenis === 'Organik' && form.statusKerja !== 'Kontrak' ? '' : form.tanggalAkhir,
            kelompok: defaultKelompok(form.level, jenis, form.posisi),
          })
        }
      />
      <SelectField
        id="f-department"
        label="Department"
        placeholder="Pilih department"
        value={form.department}
        options={departments()}
        error={errors.department}
        onChange={(department) => {
          const sec = sectionNames(department).includes(form.section) ? form.section : ''
          const pos = posisiOptions(department, sec).includes(form.posisi) ? form.posisi : ''
          onChange({ department, section: sec, posisi: pos })
        }}
      />
      <SelectField
        id="f-section"
        label="Section"
        placeholder="Pilih section"
        value={form.section}
        options={sections}
        error={errors.section}
        disabled={!form.department}
        onChange={(section) => {
          const pos = posisiOptions(form.department, section).includes(form.posisi) ? form.posisi : ''
          onChange({ section, posisi: pos })
        }}
      />
      <SelectField
        id="f-posisi"
        label="Posisi"
        placeholder="Pilih posisi"
        value={form.posisi}
        options={positions}
        error={errors.posisi}
        disabled={!form.department}
        onChange={(posisi) => {
          const lv = levelDefaultOf(posisi)
          onChange(lv ? { posisi, level: lv, kelompok: defaultKelompok(lv, form.jenis || 'Organik', posisi) } : { posisi })
        }}
      />
      <SelectField
        id="f-level"
        label="Level"
        placeholder="Pilih level"
        value={form.level}
        options={levels()}
        error={errors.level}
        warning={
          form.posisi && form.level && levelDefaultOf(form.posisi) && form.level !== levelDefaultOf(form.posisi)
            ? `Tidak sesuai level default posisi (${levelDefaultOf(form.posisi)}).`
            : undefined
        }
        onChange={(level) => onChange({ level, kelompok: defaultKelompok(level, form.jenis || 'Organik', form.posisi) })}
      />
      <SelectField
        id="f-statusKerja"
        label="Status Kerja"
        placeholder="Pilih status kerja"
        value={form.statusKerja}
        options={STATUS_KERJA}
        disabledOptions={statusOptionsOf(form.jenis).length === 1 ? ['Tetap'] : []}
        error={errors.statusKerja}
        helper={form.jenis && form.jenis !== 'Organik' ? `Tetap hanya untuk Organik. ${form.jenis} selalu Kontrak.` : undefined}
        onChange={(statusKerja) => onChange({ statusKerja, tanggalAkhir: statusKerja === 'Kontrak' ? form.tanggalAkhir : '' })}
      />
      <SelectField
        id="f-kelompok"
        label="Group Kerja"
        placeholder="Pilih group kerja"
        value={form.kelompok}
        options={KELOMPOK}
        error={errors.kelompok}
        helper="Otomatis dari Jenis Karyawan, posisi, dan level. Pembagi potongan kehadiran: Staff 21 hari, Non Staff 25 hari."
        warning={
          (form.level || form.jenis) && form.kelompok && form.kelompok !== defaultKelompok(form.level, form.jenis || 'Organik', form.posisi)
            ? `Berbeda dari group otomatis (${defaultKelompok(form.level, form.jenis || 'Organik', form.posisi)}). Pastikan sesuai, karena memengaruhi cara hitung gaji di Payroll.`
            : undefined
        }
        onChange={(kelompok) => onChange({ kelompok })}
      />
      <Field id="f-emailKantor" label="Email kantor" required error={emailError} helper={`Untuk login KOMPETEN; domain @${SECURITY_POLICY.domain}`} className="md:col-span-2">
        <Input
          id="f-emailKantor"
          type="email"
          value={form.emailKantor ?? ''}
          aria-invalid={!!emailError || undefined}
          aria-describedby={descId('f-emailKantor', true, !!emailError)}
          placeholder={`nama@${SECURITY_POLICY.domain}`}
          onChange={(e) => onChange({ emailKantor: e.target.value })}
        />
      </Field>
      <Field id="f-tanggalMasuk" label="Tanggal Masuk" required error={errors.tanggalMasuk}>
        <DatePicker
          id="f-tanggalMasuk"
          value={form.tanggalMasuk}
          invalid={!!errors.tanggalMasuk}
          aria-describedby={descId('f-tanggalMasuk', false, !!errors.tanggalMasuk)}
          onChange={(tanggalMasuk) => onChange({ tanggalMasuk })}
        />
      </Field>
      {pkwt && (
        <Field
          id="f-tanggalAkhir"
          label="Tanggal Berakhir Kontrak"
          required
          error={errors.tanggalAkhir}
          helper="Dipakai untuk peringatan kontrak H-45 di Dashboard"
          warning={nearEnd ? 'Kontrak ≤ 45 hari: pegawai akan langsung masuk daftar peringatan kontrak.' : undefined}
        >
          <DatePicker
            id="f-tanggalAkhir"
            value={form.tanggalAkhir}
            invalid={!!errors.tanggalAkhir}
            hintDate={form.tanggalMasuk || undefined}
            aria-describedby={descId('f-tanggalAkhir', true, !!errors.tanggalAkhir, nearEnd)}
            onChange={(tanggalAkhir) => onChange({ tanggalAkhir })}
          />
        </Field>
      )}
    </div>
  )
}
