import { Lock, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SELECTABLE_PERIODS } from '@/data/payroll/disbursement'
import type { Kelompok } from '@/data/master/levels'
import { KELOMPOK_LIST } from '@/data/master/levels'
import type { PeriodId } from '@/data/payroll/runs'
import { cn } from '@/lib/utils'

export const idr = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

export { StatCard } from '@/components/dashboard/stat-card'

export const KPI_GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'

export function PeriodSelect({ value, onChange }: { value: PeriodId; onChange: (v: PeriodId) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PeriodId)}>
      <SelectTrigger aria-label="Periode" className="min-w-48"><SelectValue /></SelectTrigger>
      <SelectContent>
        {SELECTABLE_PERIODS.map((p) => (
          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export type GroupFilter = 'all' | Kelompok
/** Filter Group Kerja untuk Slip Gaji, Daftar Pembayaran, dan Rekonsiliasi; default Semua. */
export function GroupSelect({ value, onChange }: { value: GroupFilter; onChange: (v: GroupFilter) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as GroupFilter)}>
      <SelectTrigger aria-label="Group Kerja" className="w-[180px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Group</SelectItem>
        {KELOMPOK_LIST.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

/** Periode yang belum Final: slip, pembayaran, dan rekonsiliasi belum tersedia. */
export function NotFinal({ title, action }: { title: string; action: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted"><Lock className="size-5 text-muted-foreground" aria-hidden /></span>
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </CardContent>
    </Card>
  )
}

export function GoRun({ onClick }: { onClick: () => void }) {
  return <Button variant="link" className="h-auto p-0" onClick={onClick}>Buka Proses &amp; Closing</Button>
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1 basis-[420px]">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export const initialsOf = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('')

/** Sel Pegawai: avatar inisial + nama + NIP. */
export function PersonCell({ nama, nik }: { nama: string; nik: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-8">
        <AvatarFallback className="bg-muted text-xs font-semibold">{initialsOf(nama)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col leading-tight">
        <span className="whitespace-nowrap font-medium">{nama}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{nik}</span>
      </div>
    </div>
  )
}

export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
