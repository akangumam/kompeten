import { Input } from '@/components/ui/input'
import { RULES, type FormatKey } from '@/lib/validators'
import { Field, descId } from './field'

type Props = {
  id: string
  label: string
  rule: FormatKey
  value: string
  error?: string
  required?: boolean
  onChange: (stored: string) => void
  onBlur: () => void
}

export function FormatInput({ id, label, rule, value, error, required, onChange, onBlur }: Props) {
  const r = RULES[rule]
  return (
    <Field id={id} label={label} required={required} helper={r.helper} error={error}>
      <Input
        id={id}
        type={rule === 'email' ? 'email' : 'text'}
        inputMode={r.inputMode}
        autoComplete="off"
        className={rule === 'email' ? undefined : 'tabular-nums'}
        value={r.display(value)}
        aria-invalid={!!error || undefined}
        aria-describedby={descId(id, true, !!error)}
        onChange={(e) => onChange(r.sanitize(e.target.value))}
        onBlur={onBlur}
      />
    </Field>
  )
}
