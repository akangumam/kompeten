import { Field } from '@/components/employee/field'
import { Textarea } from '@/components/ui/textarea'
import { validAlasan } from '@/lib/validators'

/** Bidang "Alasan" bersama di seluruh HRIS dan Payroll: minimal 10 karakter dengan penghitung "{n}/10"; error menggantikan helper. */
export const alasanOk = (v: string) => validAlasan(v)
export function AlasanField({ id, label = 'Alasan', value, onChange, error, disabled, placeholder, required = true, onBlur }: {
  id: string
  label?: string
  value: string
  onChange: (v: string) => void
  error?: string
  disabled?: boolean
  placeholder?: string
  required?: boolean
  onBlur?: () => void
}) {
  const n = value.trim().length
  return (
    <Field id={id} label={label} required={required} error={error || undefined} helper={`Minimal 10 karakter · ${n}/10`}>
      <Textarea id={id} value={value} disabled={disabled} placeholder={placeholder} aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-err` : `${id}-help`} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}
