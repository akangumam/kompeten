import { Copy } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from './date-picker'
import { Field } from './field'
import { FORMAT_RULE, PERSONAL_REQUIRED, type DraftForm, type FormatField, type PersonalKey } from '@/data/employees'
import { RULES } from '@/lib/validators'
import { formatDate } from '@/lib/format'
import { FormatInput } from './format-input'

type Props = {
  form: DraftForm
  /** Nomor lamaran asal data; kosong bila tidak disalin dari lamaran. */
  source?: string
  errors: Partial<Record<FormatField, string>>
  /** Draft "Input langsung": field Personal wajib diisi. */
  required?: boolean
  requiredErrors?: Partial<Record<PersonalKey, string>>
  /** Tampilan baca saja (Atasan, pegawai nonaktif). */
  readOnly?: boolean
  /** Sembunyikan NIK (KTP) dan Alamat KTP (data identitas pribadi). */
  hideIds?: boolean
  onBlurField: (k: FormatField) => void
  onChange: (patch: Partial<DraftForm>) => void
}

function Section({ title, source, children }: { title: string; source?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {source && (
          <StatusBadge variant="neutral">
            <Copy aria-hidden />
            Disalin dari {source}
          </StatusBadge>
        )}
      </div>
      {children}
    </section>
  )
}

const grid = 'grid grid-cols-1 gap-4 md:grid-cols-2'
const head = 'text-xs font-medium text-muted-foreground'

const roCls = 'resize-none bg-muted/50 text-foreground'

export function PersonalTab({ form, source, errors, required, requiredErrors = {}, readOnly, hideIds, onBlurField, onChange }: Props) {
  const isReq = (k: string) => !!required && (PERSONAL_REQUIRED as readonly string[]).includes(k)
  const reqErr = (k: string) => requiredErrors[k as PersonalKey]
  const ro = (id: string, label: string, value: string, area = false) => (
    <Field id={`p-${id}`} label={label}>
      {area ? (
        <Textarea id={`p-${id}`} readOnly value={value || '—'} className={roCls} />
      ) : (
        <Input id={`p-${id}`} readOnly value={value || '—'} className={roCls} />
      )}
    </Field>
  )
  const fmt = (k: FormatField, label: string) =>
    readOnly ? (
      ro(k, label, RULES[FORMAT_RULE[k]].display(form[k]))
    ) : (
    <FormatInput
      id={`p-${k}`}
      label={label}
      rule={FORMAT_RULE[k]}
      value={form[k]}
      required={isReq(k)}
      error={errors[k] ?? reqErr(k)}
      onChange={(v) => onChange({ [k]: v })}
      onBlur={() => onBlurField(k)}
    />
  )
  const text = (id: keyof DraftForm, label: string, extra?: React.ComponentProps<typeof Input>) =>
    readOnly ? (
      ro(id, label, form[id] as string)
    ) : (
    <Field id={`p-${id}`} label={label} required={isReq(id)} error={reqErr(id)}>
      <Input
        aria-invalid={reqErr(id) ? true : undefined}
        id={`p-${id}`}
        value={form[id] as string}
        onChange={(e) => onChange({ [id]: e.target.value })}
        {...extra}
      />
    </Field>
  )
  const select = (id: 'gender' | 'pernikahan', label: string, options: string[]) =>
    readOnly ? (
      ro(id, label, form[id])
    ) : (
    <Field id={`p-${id}`} label={label} required={isReq(id)} error={reqErr(id)}>
      <Select value={form[id]} onValueChange={(v) => onChange({ [id]: v })}>
        <SelectTrigger id={`p-${id}`} className="w-full" aria-invalid={reqErr(id) ? true : undefined}>
          <SelectValue placeholder="Pilih" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )

  return (
    <div className="space-y-8">
      <Section title="Identitas" source={source}>
        <div className={grid}>
          {text('nama', 'Nama Lengkap')}
          {!hideIds && fmt('ktp', 'NIK (KTP)')}
          {text('tempatLahir', 'Tempat Lahir')}
          {readOnly ? (
            ro('tanggalLahir', 'Tanggal Lahir', form.tanggalLahir ? formatDate(form.tanggalLahir) : '')
          ) : (
            <Field id="p-tanggalLahir" label="Tanggal Lahir" required={isReq('tanggalLahir')} error={reqErr('tanggalLahir')}>
              <DatePicker
                id="p-tanggalLahir"
                value={form.tanggalLahir}
                invalid={!!reqErr('tanggalLahir')}
                max="2008-12-31"
                onChange={(tanggalLahir) => onChange({ tanggalLahir })}
              />
            </Field>
          )}
          {select('gender', 'Jenis Kelamin', ['Laki-laki', 'Perempuan'])}
          {select('pernikahan', 'Status Pernikahan', ['Belum Menikah', 'Menikah', 'Cerai'])}
        </div>
      </Section>

      <Section title="Kontak" source={source}>
        <div className={grid}>
          {fmt('hp', 'No. HP')}
          {fmt('email', 'Email')}
          {!hideIds &&
            (readOnly ? (
              ro('alamatKtp', 'Alamat sesuai KTP', form.alamatKtp, true)
            ) : (
              <Field id="p-alamatKtp" label="Alamat sesuai KTP" required={isReq('alamatKtp')} error={reqErr('alamatKtp')}>
                <Textarea
                  id="p-alamatKtp"
                  value={form.alamatKtp}
                  aria-invalid={reqErr('alamatKtp') ? true : undefined}
                  onChange={(e) => onChange({ alamatKtp: e.target.value })}
                />
              </Field>
            ))}
          {readOnly ? (
            ro('alamatDomisili', 'Alamat Domisili', form.alamatDomisili, true)
          ) : (
            <Field id="p-alamatDomisili" label="Alamat Domisili">
              <Textarea
                id="p-alamatDomisili"
                value={form.alamatDomisili}
                onChange={(e) => onChange({ alamatDomisili: e.target.value })}
              />
            </Field>
          )}
        </div>
      </Section>

      <Section title="Kontak Darurat" source={source}>
        <div className={grid}>
          {text('daruratNama', 'Nama')}
          {text('daruratHubungan', 'Hubungan')}
          {fmt('daruratHp', 'No. HP')}
        </div>
      </Section>

      <Section title="Riwayat Pendidikan" source={source}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={head}>Jenjang</TableHead>
              <TableHead className={head}>Institusi</TableHead>
              <TableHead className={head}>Jurusan</TableHead>
              <TableHead className={`text-right ${head}`}>Tahun Lulus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {form.pendidikan.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-12 text-center text-sm text-muted-foreground">
                  Belum ada riwayat pendidikan.
                </TableCell>
              </TableRow>
            )}
            {form.pendidikan.map((e) => (
              <TableRow key={e.institusi} className="h-12 hover:bg-muted/50">
                <TableCell>{e.jenjang}</TableCell>
                <TableCell className="font-medium">{e.institusi}</TableCell>
                <TableCell>{e.jurusan}</TableCell>
                <TableCell className="text-right tabular-nums">{e.tahun}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </div>
  )
}
