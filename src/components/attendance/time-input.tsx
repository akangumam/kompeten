import { Input } from '@/components/ui/input'

export const maskTime = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}.${d.slice(2)}` : d
}

type Props = {
  id: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  invalid?: boolean
  'aria-describedby'?: string
}

export function TimeInput({ id, value, onChange, onBlur, invalid, ...rest }: Props) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      placeholder="HH.MM"
      maxLength={5}
      className="tabular-nums"
      value={value}
      aria-invalid={invalid || undefined}
      aria-describedby={rest['aria-describedby']}
      onChange={(e) => onChange(maskTime(e.target.value))}
      onBlur={onBlur}
    />
  )
}
