import { useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { RosterEmployee } from '@/data/employees'
import { teamLabel } from '@/data/leave'
import { cn } from '@/lib/utils'

export function EmployeeMulti({
  id,
  value,
  options,
  onChange,
}: {
  id: string
  value: string[]
  options: RosterEmployee[]
  onChange: (niks: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const list = options.filter((e) => `${e.nama} ${e.nik}`.toLowerCase().includes(q.trim().toLowerCase()))
  const toggle = (nik: string) => onChange(value.includes(nik) ? value.filter((n) => n !== nik) : [...value, nik])
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setQ('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          variant="outline"
          className={cn('w-full justify-between font-normal', value.length === 0 && 'text-muted-foreground')}
        >
          <span className="truncate">{value.length ? `${value.length} pegawai dipilih` : 'Cari nama atau NIP…'}</span>
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="relative border-b">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            aria-label="Cari pegawai"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama atau NIP…"
            className="rounded-b-none border-0 pl-9 shadow-none focus-visible:ring-0"
          />
        </div>
        <ul role="listbox" aria-multiselectable aria-label="Daftar pegawai" className="max-h-56 overflow-y-auto p-1">
          {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Pegawai tidak ditemukan.</li>}
          {list.map((e) => {
            const on = value.includes(e.nik)
            return (
              <li key={e.nik} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => toggle(e.nik)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <Check className={cn('size-4 shrink-0', on ? 'opacity-100' : 'opacity-0')} aria-hidden />
                  <span className="flex flex-col leading-tight">
                    <span className="font-medium">{e.nama}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{e.nik} · {teamLabel(e)}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
