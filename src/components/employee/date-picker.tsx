import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { id as idLocale } from 'react-day-picker/locale'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

type Props = {
  id: string
  value: string
  onChange: (iso: string) => void
  invalid?: boolean
  hintDate?: string
  placeholder?: string
  min?: string
  max?: string
  'aria-describedby'?: string
}

export function DatePicker({ id, value, onChange, invalid, hintDate, placeholder = 'Pilih tanggal', min, max, ...rest }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={invalid || undefined}
          aria-describedby={rest['aria-describedby']}
          className={cn(
            'w-full justify-start font-normal aria-invalid:border-destructive aria-invalid:ring-destructive/20',
            !value && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="size-4" />
          {value ? formatDate(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={idLocale}
          captionLayout="dropdown"
          startMonth={min ? fromIso(min) : new Date(1960, 0)}
          endMonth={max ? fromIso(max) : new Date(2035, 11)}
          disabled={[...(min ? [{ before: fromIso(min) }] : []), ...(max ? [{ after: fromIso(max) }] : [])]}
          defaultMonth={value ? fromIso(value) : hintDate ? fromIso(hintDate) : undefined}
          selected={value ? fromIso(value) : undefined}
          onSelect={(d) => {
            if (d) {
              onChange(toIso(d))
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
