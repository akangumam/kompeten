import { Lock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { PageId } from '@/App'
import { StepApproval } from '@/components/payroll/run/step-approval'
import { StepClosing } from '@/components/payroll/run/step-closing'
import { StepFinal } from '@/components/payroll/run/step-final'
import { StepInsidental } from '@/components/payroll/run/step-insidental'
import { InfoItemRow, StepPrasyarat, trxInfoItem, useChecklist } from '@/components/payroll/run/step-prasyarat'
import { StepReview } from '@/components/payroll/run/step-review'
import { StepTarik } from '@/components/payroll/run/step-tarik'
import { RunStepper, type StepInfo, type StepProps } from '@/components/payroll/run/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { periodSelectLabel } from '@/data/master/attendance-rules'
import { TransitionAlert } from '@/components/transition-alert'
import { ROSTER } from '@/data/employees'
import type { Kelompok } from '@/data/master/levels'
import { unvalidatedCount } from '@/data/overtime'
import { cn } from '@/lib/utils'
import {
  cutoffText,
  isFinalized,
  isLocked,
  PAY_PERIODS,
  periodById,
  periodStatusText,
  RUN_GROUPS,
  runKey,
  runOf,
  runRows,
  STATUS_LABEL,
  totalsOf,
  type PayRow,
  type PeriodId,
  type RunCtx,
  type RunStatus,
} from '@/data/payroll/runs'
import { usePayroll } from '@/data/payroll/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'

// Label stepper satu baris; judul isi langkah memakai nama lengkap.
const LABELS = ['Prasyarat', 'Insidental', 'Tarik Gaji', 'Review', 'Approval', 'Finalisasi', 'Closing']
const TITLES = ['Prasyarat', 'Komponen Insidental', 'Tarik Gaji', 'Review', 'Approval', 'Finalisasi', 'Closing Periode']
const DESC = [
  'Pastikan data sumber siap sebelum gaji dihitung.',
  'Bonus, rapel, dan potongan lain yang berlaku hanya di periode ini.',
  'Hitung gaji seluruh pegawai dari data kehadiran, lembur, BPJS, PPh 21, dan Koperasi.',
  'Periksa total, bandingkan dengan periode lalu, dan cek baris yang ditandai.',
  'Persetujuan HR & GA Manager atas payroll yang diajukan.',
  'Kunci payroll, terbitkan slip, dan kirim daftar pembayaran ke Finance.',
  'Tutup periode setelah gaji dibayar dan potongan Koperasi dikirim.',
]
const BADGE: Record<RunStatus, 'neutral' | 'info' | 'success'> = { belum: 'neutral', draft: 'info', menunggu: 'info', disetujui: 'success', final: 'success', closed: 'neutral' }

type Props = {
  user: CurrentUser
  ctx: RunCtx
  closed: { at: string; by: string } | null
  onNavigate: (page: PageId, period?: PeriodId) => void
}

/** Lima kartu sama lebar: satu run per Group Kerja pada periode terpilih. */
function GroupOverview({ periodId, group, ctx, onSelect }: { periodId: PeriodId; group: Kelompok; ctx: RunCtx; onSelect: (g: Kelompok) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" role="group" aria-label="Run per Group Kerja">
      {RUN_GROUPS.map((g) => {
        const r = runOf(runKey(periodId, g))
        const has = !!r.draft || isFinalized(r)
        const neto = has ? totalsOf(runRows(r.id, ctx)).neto : null
        const n = ROSTER.filter((e) => e.kelompok === g).length
        return (
          <button
            key={g}
            type="button"
            aria-pressed={g === group}
            aria-label={`Run ${g}`}
            onClick={() => onSelect(g)}
            className={cn('flex h-full min-h-[116px] flex-col justify-between gap-2 rounded-xl border bg-card p-4 text-left shadow-xs transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', g === group && 'ring-2 ring-ring')}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold">{g}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{n.toLocaleString('id-ID')} pegawai</span>
            </div>
            <span className="whitespace-nowrap text-base font-bold tabular-nums">{neto === null ? 'Belum dihitung' : `Rp ${neto.toLocaleString('id-ID')}`}</span>
            <StatusBadge variant={BADGE[r.status]} className="w-fit">{STATUS_LABEL[r.status]}</StatusBadge>
          </button>
        )
      })}
    </div>
  )
}

export default function PayrollRunPage({ user, ctx, closed, onNavigate }: Props) {
  usePayroll()
  const [periodId, setPeriodId] = useState<PeriodId>('2026-10')
  const [group, setGroup] = useState<Kelompok>('Non Staff')
  const period = periodById(periodId)
  const run = runOf(runKey(periodId, group))
  const officer = user.role === 'payroll'
  const locked = isLocked(period)
  const otPending = unvalidatedCount(ctx.otRecords, period.dari, period.sampai)

  const defaultView = () => (run.status === 'menunggu' && user.role === 'manager' ? 5 : Math.min(run.reached, 7))
  const [view, setView] = useState(defaultView)
  useEffect(() => setView(defaultView()), [periodId, group, user.role]) // eslint-disable-line react-hooks/exhaustive-deps

  const base = { run, period, user, ctx, closed, otPending, officer, onGo: setView, onNavigate } satisfies StepProps
  const lockedTrx = locked ? trxInfoItem(period, onNavigate) : null
  const blocking = useChecklist(base).some((i) => i.tone === 'blocking')

  // Baris untuk Review/Approval: draft run, atau hitungan periode final (September).
  const finalRows = useMemo<PayRow[] | null>(
    () => (isFinalized(run) && !run.draft ? runRows(run.id, ctx) : null),
    [run, ctx],
  )
  const rows = run.draft?.rows ?? finalRows ?? []
  const prevTotals = run.draft?.prev
  const stale = !!run.draft?.stale && run.status === 'draft'

  const isFinal = isFinalized(run)
  const complete = isFinal ? [true, true, true, true, true, true, run.status === 'closed'] : [
    run.reached >= 2,
    run.reached >= 3,
    !!run.draft,
    ['menunggu', 'disetujui', 'final', 'closed'].includes(run.status),
    ['disetujui', 'final', 'closed'].includes(run.status),
    false,
    false,
  ]
  const steps: StepInfo[] = LABELS.map((label, i) => {
    const n = i + 1
    const reachable = n <= run.reached
    const state = complete[i] ? 'done' : n === run.reached ? 'current' : n > run.reached ? 'locked' : 'todo'
    let status = state === 'done' ? 'Selesai' : state === 'locked' ? 'Terkunci' : 'Perlu aksi'
    if (n === 5 && state === 'current') status = 'Menunggu'
    return { label, status, state, reachable }
  })

  const content = () => {
    switch (view) {
      case 1: return <StepPrasyarat {...base} />
      case 2: return <StepInsidental {...base} />
      case 3: return <StepTarik {...base} />
      case 4: return <StepReview {...base} rows={rows} prevTotals={prevTotals} stale={stale} />
      case 5: return <StepApproval {...base} rows={rows} prevTotals={prevTotals} />
      case 6: return <StepFinal {...base} count={rows.length || ROSTER.filter((e) => e.kelompok === group).length} />
      default: return <StepClosing {...base} rows={rows} />
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-[420px]">
          <h1 className="text-2xl font-semibold tracking-tight">Proses &amp; Closing Payroll</h1>
          <p className="text-sm text-muted-foreground">
            Periode {period.label} · kehadiran {cutoffText(period)} · dibayar {formatDate(period.bayar)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodId} onValueChange={(v) => setPeriodId(v as PeriodId)}>
            <SelectTrigger aria-label="Periode" className="min-w-[460px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAY_PERIODS.map((p) => (
                <SelectItem key={p.id} value={p.id}>{periodSelectLabel(p.leave)} · {periodStatusText(p.id)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={group} onValueChange={(v) => setGroup(v as Kelompok)}>
            <SelectTrigger aria-label="Group Kerja" className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RUN_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <StatusBadge variant={locked ? 'neutral' : BADGE[run.status]}>
            {run.status === 'closed' && <Lock aria-hidden />}
            {locked ? 'Belum dibuka' : STATUS_LABEL[run.status]}
          </StatusBadge>
        </div>
      </div>

      <TransitionAlert period={period.leave} />

      {locked ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted"><Lock className="size-5 text-muted-foreground" aria-hidden /></span>
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Belum dibuka</h2>
              <p className="text-sm text-muted-foreground">Periode kehadiran belum berakhir (cut-off {formatDate(period.sampai).replace(/ 2026$/, '')}).</p>
            </div>
            {lockedTrx && (
              <ul className="w-full max-w-2xl divide-y rounded-lg border text-left" aria-label="Informasi periode">
                <InfoItemRow item={lockedTrx} />
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <GroupOverview periodId={periodId} group={group} ctx={ctx} onSelect={setGroup} />
          <RunStepper steps={steps} active={view} onSelect={setView} />
          <Card>
            <CardHeader>
              <CardTitle>{view}. {TITLES[view - 1]}</CardTitle>
              <CardDescription>{DESC[view - 1]}</CardDescription>
            </CardHeader>
            <CardContent>{content()}</CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
