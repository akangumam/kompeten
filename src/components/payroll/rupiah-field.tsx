import { Field, descId } from '@/components/employee/field'
import { Input } from '@/components/ui/input'
import { RULES } from '@/lib/validators'

/** Input nominal Rupiah: hanya digit, tampil "Rp 1.000.000" saat mengetik. `value` disimpan sebagai digit. */
export function RupiahField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  helper,
  required = true,
  readOnly,
  className,
}: {
  id: string
  label: string
  value: string
  onChange: (digits: string) => void
  onBlur?: () => void
  error?: string
  helper?: string
  required?: boolean
  readOnly?: boolean
  className?: string
}) {
  const r = RULES.rupiah
  return (
    <Field id={id} label={label} required={required && !readOnly} error={error} helper={helper ?? r.helper} className={className}>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        className={`tabular-nums ${readOnly ? 'bg-muted/50 text-foreground' : ''}`}
        readOnly={readOnly}
        value={r.display(value)}
        aria-invalid={!!error || undefined}
        aria-describedby={descId(id, true, !!error)}
        onChange={(e) => onChange(r.sanitize(e.target.value))}
        onBlur={onBlur}
      />
    </Field>
  )
}
