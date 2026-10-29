import { Check, Lock, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import type { PageId } from '@/App'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { RunCtx, PayPeriod, PeriodId, Run, Totals } from '@/data/payroll/runs'
import type { CurrentUser } from '@/data/users'
import { cn } from '@/lib/utils'

export type StepProps = {
  run: Run
  period: PayPeriod
  user: CurrentUser
  ctx: RunCtx
  closed: { at: string; by: string } | null
  otPending: number
  /** Payroll Officer: menjalankan langkah 1–4 dan 6. */
  officer: boolean
  onGo: (step: number) => void
  onNavigate: (page: PageId, period?: PeriodId) => void
}

export const idr = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
export const pctText = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

/** Bar aksi menempel di bawah kartu langkah. Tombol terblokir aturan memakai `disabled` + Tooltip alasan. */
export function StepFooter({ children, left }: { children: ReactNode; left?: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t bg-card px-6 py-3">
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function Blocked({ reason, children }: { reason: string | null; children: ReactNode }) {
  if (!reason) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">{children}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{reason}</TooltipContent>
    </Tooltip>
  )
}

export function BackButton({ step, onGo }: { step: number; onGo: (s: number) => void }) {
  return (
    <Button variant="outline" disabled={step <= 1} onClick={() => onGo(step - 1)}>
      Kembali
    </Button>
  )
}

export type StepState = 'done' | 'current' | 'todo' | 'locked'
export type StepInfo = { label: string; status: string; state: StepState; reachable: boolean }

/** Stepper 7 tahap: grid 6 kolom sama lebar mulai lg; di bawahnya satu baris kartu sama lebar yang bisa digeser. */
export function RunStepper({ steps, active, onSelect }: { steps: StepInfo[]; active: number; onSelect: (n: number) => void }) {
  return (
    <ol className="-mx-1 flex gap-3 overflow-x-auto p-1 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:p-0" aria-label="Tahapan payroll">
      {steps.map((s, i) => {
        const n = i + 1
        const isActive = active === n
        return (
          <li key={s.label} className="min-w-[160px] flex-1 lg:min-w-0">
            <button
              type="button"
              disabled={!s.reachable}
              aria-current={isActive ? 'step' : undefined}
              onClick={() => onSelect(n)}
              className={cn(
                'flex h-full min-h-[72px] w-full items-center gap-3 rounded-lg border bg-card p-3 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
                s.reachable ? 'cursor-pointer hover:bg-accent/50' : 'cursor-not-allowed opacity-70',
                isActive && 'ring-2 ring-ring',
              )}
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums',
                  s.state === 'done' && 'border-success/30 bg-success/10 text-success',
                  s.state === 'current' && 'border-ring bg-foreground text-background',
                  (s.state === 'todo' || s.state === 'locked') && 'bg-muted text-muted-foreground',
                )}
              >
                {s.state === 'done' ? <Check className="size-4" aria-hidden /> : s.state === 'locked' ? <Lock className="size-4" aria-hidden /> : n}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-medium">{s.label}</span>
                <span className={cn('block truncate text-xs', s.state === 'done' ? 'text-success' : s.status === 'Perlu tindakan' ? 'text-warning' : 'text-muted-foreground')}>{s.status}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export function Delta({ now, prev }: { now: number; prev?: number }) {
  if (prev === undefined || prev === 0) return <span className="text-xs text-muted-foreground">—</span>
  const d = ((now - prev) / prev) * 100
  // Selisih 0,0% (setelah pembulatan) tidak diberi panah naik/turun.
  const Icon = Math.abs(d) < 0.05 ? Minus : d > 0 ? TrendingUp : TrendingDown
  return (
    <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
      <Icon className="size-3.5" aria-hidden />
      {pctText(d)} dari periode lalu
    </span>
  )
}

/** Ringkasan total payroll dan pembandingnya dengan periode sebelumnya. */
export function RunTotals({ totals, prev, prevLabel }: { totals: Totals; prev?: Totals; prevLabel?: string }) {
  const items: { label: string; value: string; now: number; before?: number }[] = [
    { label: 'Pegawai', value: totals.pegawai.toLocaleString('id-ID'), now: totals.pegawai, before: prev?.pegawai },
    { label: 'Total pendapatan', value: idr(totals.pendapatan), now: totals.pendapatan, before: prev?.pendapatan },
    { label: 'Total potongan', value: idr(totals.potongan), now: totals.potongan, before: prev?.potongan },
    { label: 'Total neto (transfer)', value: idr(totals.neto), now: totals.neto, before: prev?.neto },
    { label: 'Beban perusahaan BPJS', value: idr(totals.bebanBpjs), now: totals.bebanBpjs, before: prev?.bebanBpjs },
  ]
  return (
    <div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {items.map((i) => (
          <div key={i.label} className="h-full space-y-1 rounded-lg border p-4">
            <dt className="text-sm font-medium text-muted-foreground">{i.label}</dt>
            <dd className="whitespace-nowrap text-base font-bold tabular-nums tracking-tight">{i.value}</dd>
            <Delta now={i.now} prev={i.before} />
          </div>
        ))}
      </dl>
      {prevLabel && <p className="mt-2 text-xs text-muted-foreground">Pembanding: payroll {prevLabel} (final).</p>}
    </div>
  )
}
