import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Field } from '@/components/employee/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import type { ChangeStatus, RegStatus, WdStatus } from '@/data/koperasi/requests'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ALASAN_ERROR, digitsOnly, validAlasan } from '@/lib/validators'

export const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
export const SHEET_W = 'w-full overflow-y-auto sm:max-w-[560px]'

export const WD_LABEL: Record<WdStatus, string> = {
  'menunggu-ketua': 'Menunggu Ketua',
  disetujui: 'Disetujui, menunggu pencairan',
  dicairkan: 'Dicairkan',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
}
const WD_VARIANT: Record<WdStatus, 'info' | 'success' | 'danger' | 'neutral'> = { 'menunggu-ketua': 'info', disetujui: 'info', dicairkan: 'success', ditolak: 'danger', dibatalkan: 'neutral' }
export const WdBadge = ({ s }: { s: WdStatus }) => <StatusBadge variant={WD_VARIANT[s]}>{WD_LABEL[s]}</StatusBadge>

const REQ_LABEL: Record<RegStatus | ChangeStatus, string> = { menunggu: 'Menunggu', disetujui: 'Disetujui', ditolak: 'Ditolak' }
const REQ_VARIANT = { menunggu: 'info', disetujui: 'success', ditolak: 'danger' } as const
export const ReqBadge = ({ s }: { s: RegStatus | ChangeStatus }) => <StatusBadge variant={REQ_VARIANT[s]}>{REQ_LABEL[s]}</StatusBadge>

/** Input nominal Rupiah yang boleh Rp 0: hanya digit, tampil "Rp 1.000.000". `value` berupa digit. */
export function MoneyField({ id, label, value, onChange, error, helper, required = true, disabled }: { id: string; label: string; value: string; onChange: (digits: string) => void; error?: string; helper?: string; required?: boolean; disabled?: boolean }) {
  return (
    <Field id={id} label={label} required={required} error={error} helper={helper}>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        className="tabular-nums"
        disabled={disabled}
        value={value === '' ? '' : rp(Number(value))}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-err` : helper ? `${id}-help` : undefined}
        onChange={(e) => onChange(digitsOnly(e.target.value).replace(/^0+(?=\d)/, ''))}
      />
    </Field>
  )
}

export type ComboOption = { key: string; label: string; sub: string; reason?: string }
/** Combobox pegawai; opsi yang tidak memenuhi syarat tampil nonaktif dengan alasannya. */
export function CoopCombobox({ id, value, options, onChange, placeholder, invalid }: { id: string; value: string; options: ComboOption[]; onChange: (key: string) => void; placeholder: string; invalid?: boolean }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const chosen = options.find((o) => o.key === value)
  const list = options.filter((o) => `${o.label} ${o.key}`.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setQ('') }}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" role="combobox" aria-expanded={open} aria-invalid={invalid || undefined} variant="outline" className={cn('w-full justify-between font-normal aria-invalid:border-destructive', !chosen && 'text-muted-foreground')}>
          <span className="truncate">{chosen ? `${chosen.label} · ${chosen.key}` : placeholder}</span>
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="relative border-b">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Cari pegawai" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau NIP…" className="rounded-b-none border-0 pl-9 shadow-none focus-visible:ring-0" />
        </div>
        <ul role="listbox" aria-label="Daftar pegawai" className="max-h-64 overflow-y-auto p-1">
          {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Tidak ditemukan.</li>}
          {list.map((o) => (
            <li key={o.key} role="option" aria-selected={o.key === value} aria-disabled={!!o.reason}>
              <button
                type="button"
                disabled={!!o.reason}
                onClick={() => { onChange(o.key); setOpen(false) }}
                className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
              >
                <Check className={cn('mt-0.5 size-4 shrink-0', o.key === value ? 'opacity-100' : 'opacity-0')} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{o.label} <span className="font-normal text-muted-foreground">· {o.key}</span></span>
                  <span className="block truncate text-xs text-muted-foreground">{o.reason ?? o.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/** Perbandingan nilai lama dan usulan berdampingan; nilai yang berubah ditebalkan. */
export function Compare({ rows }: { rows: { label: string; lama: ReactNode; baru: ReactNode; changed?: boolean }[] }) {
  return (
    <div className="overflow-hidden rounded-lg border text-sm">
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
        <span>Data</span>
        <span>Saat ini</span>
        <span>Usulan</span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[1fr_1fr_1fr] gap-3 border-b px-3 py-2 last:border-b-0">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="tabular-nums">{r.lama}</span>
          <span className={cn('tabular-nums', r.changed && 'font-medium')}>{r.baru}</span>
        </div>
      ))}
    </div>
  )
}

export { AlasanField, alasanOk } from '@/components/ui/alasan-field'
import { AlasanField } from '@/components/ui/alasan-field'

export const Meta = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>

/** Sheet tinjau (pola Approvals): Diajukan oleh + waktu, data, alasan, footer Tolak (alasan wajib) + Setujui. */
export function ReviewSheet({
  open, onOpenChange, title, description, diajukan, oleh, note, children, onApprove, onReject, approveLabel = 'Setujui', rejectTitle, canAct = true,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: string
  diajukan: string
  oleh: string
  note: string | null
  children: ReactNode
  onApprove: () => void
  onReject: (alasan: string) => void
  approveLabel?: string
  rejectTitle: string
  canAct?: boolean
}) {
  const [tolak, setTolak] = useState(false)
  const [alasan, setAlasan] = useState('')
  const [err, setErr] = useState('')
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={SHEET_W}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          {note && <p className="rounded-md border bg-muted/50 p-3 text-sm">{note}</p>}
          <Meta>Diajukan oleh <span className="font-medium text-foreground">{oleh}</span> · <span className="tabular-nums">{formatDate(diajukan)}</span></Meta>
          {children}
        </div>
        {canAct && (
          <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t p-4">
            <Button variant="destructive" onClick={() => { setAlasan(''); setErr(''); setTolak(true) }}>Tolak</Button>
            <Button onClick={onApprove}>{approveLabel}</Button>
          </SheetFooter>
        )}
        <AlertDialog open={tolak} onOpenChange={setTolak}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{rejectTitle}</AlertDialogTitle>
              <AlertDialogDescription>Alasan akan terlihat oleh pengaju.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlasanField id="tolak-alasan" label="Alasan penolakan" value={alasan} onChange={(v) => { setAlasan(v); setErr('') }} error={err} />
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={(e) => {
                  if (!validAlasan(alasan)) { e.preventDefault(); setErr(ALASAN_ERROR); return }
                  onReject(alasan.trim())
                  setTolak(false)
                }}
              >
                Tolak
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  )
}
