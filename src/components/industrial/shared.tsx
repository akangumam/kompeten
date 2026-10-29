import { useMemo, useState } from 'react'
import { Ban, Check, ChevronsUpDown, CircleCheck, CircleX, FileText, Hourglass, Mail, MessageSquare, Search, TimerOff, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { StatusBadge } from '@/components/ui/status-badge'
import { DISC_STATUS_LABEL, statusOf, type Disc, type DiscJenis } from '@/data/discipline'
import type { RosterEmployee } from '@/data/employees'
import { personOf } from '@/data/offboarding'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('')

export const DISC_ICON: Record<DiscJenis, LucideIcon> = {
  'Teguran Lisan': MessageSquare,
  'Teguran Tertulis': FileText,
  SP1: TriangleAlert,
  SP2: TriangleAlert,
  SP3: TriangleAlert,
  'Surat Panggilan': Mail,
}

export function DiscJenisBadge({ jenis }: { jenis: DiscJenis }) {
  const Icon = DISC_ICON[jenis]
  return <StatusBadge variant="neutral"><Icon aria-hidden />{jenis}</StatusBadge>
}

export function DiscStatusCell({ d }: { d: Disc }) {
  const s = statusOf(d)
  const sub =
    s === 'aktif' ? (d.jenis === 'Surat Panggilan' ? `hadir paling lambat ${formatDate(d.panggilan!.hadir)}` : `berlaku s/d ${formatDate(d.berlakuSampai!)}`) : s === 'menunggu' ? `Menunggu ${d.step?.person ?? ''}` : s === 'kedaluwarsa' ? `berakhir ${formatDate(d.berlakuSampai!)}` : null
  return (
    <div className="flex flex-col items-start gap-1">
      {s === 'menunggu' && <StatusBadge variant="info"><Hourglass aria-hidden />{DISC_STATUS_LABEL[s]}</StatusBadge>}
      {s === 'aktif' && <StatusBadge variant="success"><CircleCheck aria-hidden />{DISC_STATUS_LABEL[s]}</StatusBadge>}
      {s === 'kedaluwarsa' && <StatusBadge variant="neutral"><TimerOff aria-hidden />{DISC_STATUS_LABEL[s]}</StatusBadge>}
      {s === 'ditolak' && <StatusBadge variant="danger"><CircleX aria-hidden />{DISC_STATUS_LABEL[s]}</StatusBadge>}
      {s === 'dibatalkan' && <StatusBadge variant="neutral"><Ban aria-hidden />{DISC_STATUS_LABEL[s]}</StatusBadge>}
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}

export function PersonLine({ nik }: { nik: string }) {
  const p = personOf(nik)
  if (!p) return null
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-8">
        <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">{initials(p.nama)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col leading-tight">
        <span className="whitespace-nowrap font-medium">{p.nama}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{p.nik}</span>
      </div>
    </div>
  )
}

/** Combobox pegawai dengan alasan nonaktif per pegawai (mis. sudah ada proses keluar). */
export function EmployeeCombo({
  id,
  value,
  options,
  reasonOf,
  onChange,
  invalid,
}: {
  id: string
  value: string
  options: RosterEmployee[]
  reasonOf?: (e: RosterEmployee) => string | null
  onChange: (nik: string) => void
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const chosen = options.find((e) => e.nik === value)
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return options.filter((e) => !t || `${e.nama} ${e.nik}`.toLowerCase().includes(t)).sort((a, b) => a.nama.localeCompare(b.nama, 'id')).slice(0, 40).map((e) => ({ e, reason: reasonOf?.(e) ?? null }))
  }, [q, options, reasonOf])
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setQ('') }}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" role="combobox" aria-expanded={open} aria-invalid={invalid || undefined} variant="outline" className={cn('w-full justify-between font-normal aria-invalid:border-destructive', !chosen && 'text-muted-foreground')}>
          <span className="truncate">{chosen ? `${chosen.nama} · ${chosen.nik}` : 'Pilih pegawai'}</span>
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="relative border-b">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Cari pegawai" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau NIP…" className="rounded-b-none border-0 pl-9 shadow-none focus-visible:ring-0" />
        </div>
        <ul role="listbox" aria-label="Daftar pegawai" className="max-h-64 overflow-y-auto p-1">
          {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Pegawai tidak ditemukan.</li>}
          {list.map(({ e, reason }) => (
            <li key={e.nik} role="option" aria-selected={e.nik === value} aria-disabled={!!reason}>
              <button type="button" disabled={!!reason} onClick={() => { onChange(e.nik); setOpen(false) }} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent">
                <Check className={cn('size-4 shrink-0', e.nik === value ? 'opacity-100' : 'opacity-0')} aria-hidden />
                <span className="flex flex-col leading-tight">
                  <span className="font-medium">{e.nama}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{e.nik} · {e.posisi} · {e.department}</span>
                  {reason && <span className="text-xs text-warning">{reason}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/** Bingkai dokumen cetak: watermark DRAFT diagonal sampai disetujui. */
export function DocDialog({ open, onClose, title, description, draft, children }: { open: boolean; onClose: () => void; title: string; description: string; draft: boolean; children: React.ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="relative overflow-hidden rounded-md border bg-card p-8 text-sm leading-relaxed text-foreground" aria-label="Pratinjau surat">
          {draft && (
            <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="-rotate-[30deg] select-none text-8xl font-bold tracking-widest text-muted-foreground/20">DRAFT</span>
            </div>
          )}
          <div className="relative space-y-5">
            <header className="border-b pb-3 text-center">
              <p className="text-base font-semibold tracking-wide">PT PRIMAPLAST INDONESIA</p>
              <p className="text-xs text-muted-foreground">Human Resources & General Affairs</p>
            </header>
            {children}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DocRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">: {value}</dd>
    </div>
  )
}
