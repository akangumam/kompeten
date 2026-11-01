import { Award, CircleAlert, CircleCheck, CircleDashed, Clock, Lock, Pencil, RotateCcw, TriangleAlert, type LucideIcon } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { PREDIKAT, predikatOf, type PredikatKey } from '@/data/master/kpi'
import { KPI_STATUS_LABEL, type KpiStatus } from '@/data/kpi/records'

export const n1 = (n: number) => n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const nFmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 })

const P_ICON: Record<PredikatKey, LucideIcon> = { kurang: CircleAlert, cukup: TriangleAlert, baik: CircleCheck, sangat: Award }
/** Badge predikat: ikon + teks (tidak hanya warna). */
export function PredikatBadge({ nilai, compact }: { nilai: number | null | undefined; compact?: boolean }) {
  if (nilai == null) return <span className="text-muted-foreground">—</span>
  const p = predikatOf(nilai)
  const Icon = P_ICON[p.key]
  return <StatusBadge variant={p.variant} className={compact ? 'gap-0.5 px-1.5' : undefined}><Icon aria-hidden />{compact ? n1(nilai) : p.label}<span className="sr-only"> {compact ? p.label : ''}</span></StatusBadge>
}

const S: Record<KpiStatus, { variant: 'neutral' | 'info' | 'success' | 'warning'; icon: LucideIcon }> = {
  belum: { variant: 'neutral', icon: CircleDashed },
  draft: { variant: 'neutral', icon: Pencil },
  diajukan: { variant: 'info', icon: Clock },
  disetujui: { variant: 'success', icon: Lock },
  dikembalikan: { variant: 'warning', icon: RotateCcw },
}
export function KpiStatusBadge({ status }: { status: KpiStatus }) {
  const s = S[status]
  const Icon = s.icon
  return <StatusBadge variant={s.variant}><Icon aria-hidden />{KPI_STATUS_LABEL[status]}</StatusBadge>
}

/** Chip predikat berdasarkan kunci (untuk tampilan master, bukan nilai). */
export function PredikatChip({ k }: { k: PredikatKey }) {
  const p = PREDIKAT.find((x) => x.key === k)!
  const Icon = P_ICON[k]
  return <StatusBadge variant={p.variant}><Icon aria-hidden />{p.label}</StatusBadge>
}
