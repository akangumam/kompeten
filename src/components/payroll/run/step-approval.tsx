import { CircleCheck, Clock } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { RunTotals, StepFooter, BackButton, type StepProps } from '@/components/payroll/run/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { approveRun, flaggedOf, periodById, rejectRun, totalsOf, type PayRow, type Totals } from '@/data/payroll/runs'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { AlasanField } from '@/components/ui/alasan-field'

export function StepApproval(props: StepProps & { rows: PayRow[]; prevTotals?: Totals }) {
  const { run, period, user, rows, prevTotals } = props
  const isApprover = user.role === 'manager'
  const [tolak, setTolak] = useState(false)
  const [setuju, setSetuju] = useState(false)
  const [alasan, setAlasan] = useState('')
  const [err, setErr] = useState('')
  const flagged = flaggedOf(run)
  const prevLabel = period.prev ? periodById(period.prev).label : undefined

  if (run.status === 'belum' || (run.status === 'draft' && !run.submitted)) {
    return (
      <Alert variant="info">
        <Clock />
        <AlertDescription>Payroll belum diajukan. Approval tersedia setelah Payroll Officer mengajukan dari langkah Review.</AlertDescription>
      </Alert>
    )
  }

  const body = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Diajukan oleh <span className="font-medium text-foreground">{run.submitted?.by}</span> · <span className="tabular-nums">{run.submitted?.at}</span>
      </p>
      <RunTotals totals={totalsOf(rows)} prev={prevTotals} prevLabel={prevLabel} />
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Baris ditandai ({flagged.length})</h3>
        {flagged.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada baris ditandai.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {flagged.map((r) => (
              <li key={r.nik} className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm">
                <div className="space-y-1">
                  <p className="font-medium">{r.nama} <span className="text-xs font-normal tabular-nums text-muted-foreground">{r.nik}</span></p>
                  <div className="flex flex-wrap gap-1">{r.reasons.map((x) => <StatusBadge key={x} variant="neutral">{x}</StatusBadge>)}</div>
                </div>
                <p className="max-w-md text-muted-foreground">
                  {run.checks[r.nik]?.checked ? 'Sudah dicek' : 'Belum dicek'}
                  {run.checks[r.nik]?.note ? ` · ${run.checks[r.nik].note}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Button variant="link" className="h-auto p-0" onClick={() => props.onGo(4)}>Lihat tabel Review (baca saja)</Button>
    </div>
  )

  if (run.status === 'menunggu') {
    if (!isApprover) {
      return (
        <div className="space-y-4">
          <Alert variant="info">
            <Clock />
            <AlertTitle>Menunggu approval Lestari Wulandari</AlertTitle>
            <AlertDescription>Diajukan {run.submitted?.at}. Payroll Officer tidak dapat menyetujui payroll sendiri.</AlertDescription>
          </Alert>
          {body}
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Tinjau Payroll {period.label}</h3>
        {body}
        <StepFooter left={<BackButton step={5} onGo={props.onGo} />}>
          <Button variant="destructive" onClick={() => { setAlasan(''); setErr(''); setTolak(true) }}>Tolak</Button>
          <Button onClick={() => setSetuju(true)}>Setujui</Button>
        </StepFooter>

        <AlertDialog open={tolak} onOpenChange={setTolak}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tolak payroll {period.label}?</AlertDialogTitle>
              <AlertDialogDescription>Payroll kembali ke Draft di langkah Review. Alasan akan terlihat oleh Mira Andriani.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlasanField id="tolak-alasan" label="Alasan penolakan" value={alasan} onChange={setAlasan} error={err} />
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={(e) => {
                  if (!validAlasan(alasan)) { e.preventDefault(); setErr(ALASAN_ERROR); return }
                  rejectRun(run.id, user.nama, alasan.trim())
                  toast.success('Payroll ditolak dan dikembalikan ke Review')
                  props.onGo(4)
                }}
              >
                Tolak
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={setuju} onOpenChange={setSetuju}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Setujui payroll {period.label}?</AlertDialogTitle>
              <AlertDialogDescription>Setelah disetujui, Mira Andriani dapat melakukan Finalisasi & Kunci.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={() => { approveRun(run.id, user.nama); toast.success(`Payroll ${period.label} disetujui`); props.onGo(6) }}>Setujui</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Alert variant="success">
        <CircleCheck />
        <AlertDescription>Disetujui {run.approved?.by} · {run.approved?.at}.</AlertDescription>
      </Alert>
      {body}
    </div>
  )
}
