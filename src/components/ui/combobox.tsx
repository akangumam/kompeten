import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type ComboItem = { value: string; label: string; sub?: string; disabledReason?: string }

/** Combobox dengan pencarian: Popover + daftar; dipakai untuk pilihan dari master (posisi, pewawancara, …). */
export function Combobox({ id, value, items, onChange, placeholder, searchPlaceholder = 'Cari…', ariaLabel, invalid }: {
  id: string
  value: string
  items: ComboItem[]
  onChange: (value: string) => void
  placeholder: string
  searchPlaceholder?: string
  ariaLabel?: string
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const chosen = items.find((i) => i.value === value)
  const list = items.filter((i) => `${i.label} ${i.sub ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setQ('') }}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" role="combobox" aria-expanded={open} aria-label={ariaLabel} aria-invalid={invalid || undefined} variant="outline" className={cn('w-full justify-between font-normal aria-invalid:border-destructive', !chosen && 'text-muted-foreground')}>
          <span className="truncate">{chosen ? chosen.label : placeholder}</span>
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="relative border-b">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label={searchPlaceholder} autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="rounded-b-none border-0 pl-9 shadow-none focus-visible:ring-0" />
        </div>
        <ul role="listbox" className="max-h-64 overflow-y-auto p-1">
          {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Tidak ditemukan.</li>}
          {list.map((i) => (
            <li key={i.value} role="option" aria-selected={i.value === value} aria-disabled={!!i.disabledReason}>
              <button
                type="button"
                disabled={!!i.disabledReason}
                onClick={() => { onChange(i.value); setOpen(false) }}
                className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
              >
                <Check className={cn('mt-0.5 size-4 shrink-0', i.value === value ? 'opacity-100' : 'opacity-0')} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{i.label}</span>
                  {(i.disabledReason ?? i.sub) && <span className="block truncate text-xs text-muted-foreground">{i.disabledReason ?? i.sub}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
