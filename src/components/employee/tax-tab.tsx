import { Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field } from './field'
import { BANKS, FORMAT_RULE, PTKP, type DraftForm, type FormatField } from '@/data/employees'
import { FormatInput } from './format-input'
import { RULES } from '@/lib/validators'

type Props = {
  form: DraftForm
  errors: Partial<Record<FormatField, string>>
  readOnly?: boolean
  onBlurField: (k: FormatField) => void
  onChange: (patch: Partial<DraftForm>) => void
}

const roCls = 'bg-muted/50 text-foreground'

export function TaxTab({ form, errors, readOnly, onBlurField, onChange }: Props) {
  const ro = (id: string, label: string, value: string) => (
    <Field id={`t-${id}`} label={label}>
      <Input id={`t-${id}`} readOnly value={value || '—'} className={roCls} />
    </Field>
  )
  const fmt = (k: FormatField, label: string) =>
    readOnly ? (
      ro(k, label, RULES[FORMAT_RULE[k]].display(form[k]))
    ) : (
    <FormatInput
      id={`t-${k}`}
      label={label}
      rule={FORMAT_RULE[k]}
      value={form[k]}
      error={errors[k]}
      onChange={(v) => onChange({ [k]: v })}
      onBlur={() => onBlurField(k)}
    />
  )
  const text = (id: 'rekeningNama', label: string) =>
    readOnly ? (
      ro(id, label, form[id])
    ) : (
    <Field id={`t-${id}`} label={label}>
      <Input
        id={`t-${id}`}
        value={form[id]}
        onChange={(e) => onChange({ [id]: e.target.value })}
      />
    </Field>
  )
  const select = (id: 'ptkp' | 'bank', label: string, options: string[], placeholder: string) =>
    readOnly ? (
      ro(id, label, form[id])
    ) : (
    <Field id={`t-${id}`} label={label}>
      <Select value={form[id]} onValueChange={(v) => onChange({ [id]: v })}>
        <SelectTrigger id={`t-${id}`} className="w-full">
          <SelectValue placeholder={placeholder} />
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
    <div className="space-y-6">
      {!readOnly && (
        <Alert variant="info">
          <Info />
          <AlertDescription>Boleh dilengkapi setelah aktivasi. Wajib sebelum payroll pertama.</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fmt('npwp', 'NPWP')}
        {select('ptkp', 'Status PTKP', PTKP, 'Pilih status PTKP')}
        {fmt('bpjsKes', 'No. BPJS Kesehatan')}
        {fmt('bpjsTk', 'No. BPJS Ketenagakerjaan')}
        {select('bank', 'Bank', BANKS, 'Pilih bank')}
        {fmt('rekening', 'Nomor Rekening')}
        {text('rekeningNama', 'Nama Pemilik Rekening')}
      </div>
    </div>
  )
}
