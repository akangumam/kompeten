import { CircleCheck, CircleX, Lock, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { BackButton, Blocked, StepFooter, type StepProps } from '@/components/payroll/run/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { closingChecks } from '@/data/payroll/disbursement'
import { closePeriod, type PayRow } from '@/data/payroll/runs'

const ICON = { ok: CircleCheck, blocking: CircleX, warn: TriangleAlert }
const TONE = { ok: 'text-success', blocking: 'text-danger', warn: 'text-warning' }

/** Langkah 7: periode ditutup setelah gaji dibayar dan potongan Koperasi dikirim. */
export function StepClosing(props: StepProps & { rows: PayRow[] }) {
  const { run, period, officer, rows } = props
  const [confirm, setConfirm] = useState(false)

  if (run.status === 'closed') {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          <Lock />
          <AlertDescription>
            Run {run.group} {period.label} closed pada {run.closed?.at} oleh {run.closed?.by}.
          </AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground">Koreksi atas periode ini hanya lewat penyesuaian di periode berikutnya.</p>
      </div>
    )
  }

  const checks = closingChecks(period.id, rows)
  const blockers = checks.filter((c) => c.tone === 'blocking')
  const ready = run.status === 'final'
  const reason = !ready ? 'Finalisasi payroll dulu.' : blockers.length ? `Selesaikan dulu: ${blockers.map((b) => b.text).join('; ')}.` : null
  const nav = (page: (typeof checks)[number]['page']) => props.onNavigate(page, page === 'payroll-components' ? undefined : period.id)

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-lg border">
        {checks.map((c) => {
          const Icon = ICON[c.tone]
          return (
            <li key={c.text} className="flex flex-wrap items-start gap-3 p-4">
              <Icon className={`mt-0.5 size-4 shrink-0 ${TONE[c.tone]}`} aria-hidden />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-medium">
                  {c.text}
                  <span className="sr-only">{c.tone === 'blocking' ? ' (memblokir)' : c.tone === 'warn' ? ' (peringatan)' : ' (selesai)'}</span>
                </p>
                <p className="text-sm text-muted-foreground">{c.detail}</p>
              </div>
              {c.tone !== 'ok' && (
                <Button variant="link" className="h-auto p-0" onClick={() => nav(c.page)}>{c.label}</Button>
              )}
            </li>
          )
        })}
      </ul>
      {!ready && (
        <Alert variant="info"><AlertDescription>Closing tersedia setelah payroll difinalisasi.</AlertDescription></Alert>
      )}
      {officer && (
        <StepFooter left={<BackButton step={7} onGo={props.onGo} />}>
          <Blocked reason={reason}>
            <Button disabled={!!reason} onClick={() => setConfirm(true)}><Lock /> Closing Periode</Button>
          </Blocked>
        </StepFooter>
      )}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tutup periode payroll {period.label}?</AlertDialogTitle>
            <AlertDialogDescription>Setelah closing, koreksi hanya lewat penyesuaian di periode berikutnya.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => { closePeriod(run.id, props.user.nama); toast.success(`Run ${run.group} ${period.label} closed`) }}>Closing Periode</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
