import { CircleCheck, Clock, Lock } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { BackButton, Blocked, StepFooter, type StepProps } from '@/components/payroll/run/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { finalizeRun, isFinalized } from '@/data/payroll/runs'

export function StepFinal(props: StepProps & { count: number }) {
  const { run, period, officer, count } = props
  const [confirm, setConfirm] = useState(false)
  const bayar = formatDate(period.bayar)
  const checklist = [
    `Slip gaji ${period.label} diterbitkan (Final) untuk ${count.toLocaleString('id-ID')} pegawai.`,
    `Daftar Pembayaran dikirim ke Finance (transfer ${bayar}).`,
    'Potongan Koperasi dikirim untuk rekonsiliasi.',
    `Data payroll ${period.label} dikunci.`,
  ]

  if (isFinalized(run)) {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          <CircleCheck />
          <AlertDescription>
            Payroll {period.label} final pada {run.final?.at} oleh {run.final?.by}. Disetujui {run.approved?.by} {run.approved?.at}.
          </AlertDescription>
        </Alert>
        <ul className="space-y-2 text-sm">
          {checklist.map((c) => (
            <li key={c} className="flex items-start gap-2"><CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{c}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-4">
          <Button variant="link" className="h-auto p-0" onClick={() => props.onNavigate('payslips', period.id)}>Lihat Slip Gaji</Button>
          <Button variant="link" className="h-auto p-0" onClick={() => props.onNavigate('payments', period.id)}>Daftar Pembayaran</Button>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4" aria-hidden /> Payroll final bersifat baca saja di setiap langkah.</p>
      </div>
    )
  }

  const ready = run.status === 'disetujui'
  return (
    <div className="space-y-4">
      {!ready && (
        <Alert variant="info">
          <Clock />
          <AlertDescription>Finalisasi tersedia setelah payroll disetujui Lestari Wulandari.</AlertDescription>
        </Alert>
      )}
      {ready && run.approved && (
        <Alert variant="success">
          <CircleCheck />
          <AlertDescription>Disetujui {run.approved.by} · {run.approved.at}.</AlertDescription>
        </Alert>
      )}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Yang terjadi saat Finalisasi & Kunci</h3>
        <ul className="space-y-2 text-sm">
          {checklist.map((c) => (
            <li key={c} className="flex items-start gap-2"><CircleCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />{c}</li>
          ))}
        </ul>
      </section>
      {officer && (
        <StepFooter left={<BackButton step={6} onGo={props.onGo} />}>
          <Blocked reason={ready ? null : 'Menunggu approval Lestari Wulandari'}>
            <Button disabled={!ready} onClick={() => setConfirm(true)}>Finalisasi & Kunci</Button>
          </Blocked>
        </StepFooter>
      )}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalisasi payroll {period.label}?</AlertDialogTitle>
            <AlertDialogDescription>Setelah dikunci, perubahan hanya melalui koreksi di periode berikutnya.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => { finalizeRun(run.id, props.user.nama); toast.success(`Payroll ${period.label} final`) }}>Finalisasi & Kunci</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
