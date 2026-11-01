import { CircleAlert, CircleArrowUp, CircleCheck, CircleDashed, Clock, Lock, Pencil, TriangleAlert, type LucideIcon } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { gapLabel, gapKind, STATUS_LABEL, type AssessStatus, type GapKind } from '@/data/competency/assessments'
import { cn } from '@/lib/utils'

export const pctText = (n: number | null | undefined) => (n == null ? '—' : `${n.toFixed(1).replace('.', ',')}%`)
export const dec1 = (n: number) => n.toFixed(1).replace('.', ',')

type KindStyle = { icon: LucideIcon; cell: string; text: string; label: string }
export const KIND: Record<GapKind, KindStyle> = {
  melebihi: { icon: CircleArrowUp, cell: 'border-info/20 bg-info/10 text-info dark:bg-info/15', text: 'text-info', label: 'Melebihi Standar' },
  sesuai: { icon: CircleCheck, cell: 'border-success/20 bg-success/10 text-success dark:bg-success/15', text: 'text-success', label: 'Sesuai' },
  gap1: { icon: TriangleAlert, cell: 'border-warning/20 bg-warning/10 text-warning dark:bg-warning/15', text: 'text-warning', label: 'Gap 1' },
  gap2: { icon: CircleAlert, cell: 'border-danger/20 bg-danger/10 text-danger dark:bg-danger/15', text: 'text-danger', label: 'Gap ≥ 2' },
  belum: { icon: CircleDashed, cell: 'border-border bg-muted/40 text-muted-foreground', text: 'text-muted-foreground', label: 'Belum Dinilai' },
}

/** Sel heatmap: angka level aktual + ikon + teks gap (tidak hanya warna). */
export function GapCell({ target, level }: { target: number; level: number | null }) {
  const kind = gapKind(target, level)
  const k = KIND[kind]
  const Icon = k.icon
  if (kind === 'belum') {
    return (
      <div className={cn('mx-auto flex min-h-11 w-full min-w-14 flex-col items-center justify-center rounded-md border px-1 py-1 text-xs', k.cell)} aria-label="Belum dinilai" title="Belum Dinilai">
        <span aria-hidden>—</span>
      </div>
    )
  }
  const label = gapLabel(target, level)
  return (
    <div className={cn('mx-auto flex min-h-11 w-full min-w-14 flex-col items-center justify-center rounded-md border px-1 py-1 text-xs leading-tight', k.cell)} aria-label={`Level ${level}, ${label}`} title={`Level ${level} · ${label} (target ${target})`}>
      <span className="flex items-center gap-1 font-semibold tabular-nums"><Icon className="size-3" aria-hidden />{level}</span>
      <span className="whitespace-nowrap">{label}</span>
    </div>
  )
}

export function GapLegend() {
  const kinds: GapKind[] = ['melebihi', 'sesuai', 'gap1', 'gap2', 'belum']
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Legenda gap">
      {kinds.map((kd) => {
        const k = KIND[kd]
        const Icon = k.icon
        return (
          <li key={kd} className="flex items-center gap-1.5">
            <span className={cn('flex size-5 items-center justify-center rounded border', k.cell)}><Icon className="size-3" aria-hidden /></span>
            {k.label}
          </li>
        )
      })}
    </ul>
  )
}

const STATUS_STYLE: Record<AssessStatus, { variant: 'neutral' | 'info' | 'success'; icon: LucideIcon }> = {
  belum: { variant: 'neutral', icon: CircleDashed },
  draft: { variant: 'neutral', icon: Pencil },
  diajukan: { variant: 'info', icon: Clock },
  final: { variant: 'success', icon: Lock },
}
export function AssessBadge({ status }: { status: AssessStatus }) {
  const s = STATUS_STYLE[status]
  const Icon = s.icon
  return <StatusBadge variant={s.variant}><Icon aria-hidden />{STATUS_LABEL[status]}</StatusBadge>
}
