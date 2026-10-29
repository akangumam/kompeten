import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BackButton, Blocked, StepFooter, type StepProps } from '@/components/payroll/run/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { isEditable, pullDraft, type RunCtx } from '@/data/payroll/runs'

const GROUP_RULE: Record<string, string> = {
  Staff: 'Gaji bulanan; potongan Alfa/Izin = (Gaji Pokok + Tunjangan Jabatan) ÷ 21 per hari; uang makan dan transport per hari hadir (Dinas dihitung hadir).',
  'Non Staff': 'Gaji bulanan; potongan Alfa/Izin dibagi 25; uang makan dan transport per hari hadir (Dinas dihitung hadir).',
  Harian: 'Upah Harian × hari hadir; tanpa potongan kehadiran dan tanpa uang makan/transport; BPJS dari upah periode; PPh 21 pegawai tidak tetap.',
  Magang: 'Gaji bulanan seperti Organik; pembagi mengikuti level default (Operator 25, lainnya 21); Sakit dengan surat dokter tetap dibayar.',
  Outsourcing: 'Dihitung seperti Non Staff (pembagi 25) dan dibayar ke PT Mitra Karya Sejahtera. BPJS, PPh 21, dan slip diurus vendor, sehingga run ini tanpa potongan BPJS, PPh 21, dan Koperasi.',
}

const PULLS = [
  'Gaji Pokok & Tunjangan Jabatan (Komponen Gaji)',
  'Hari hadir, Alfa dan Izin (Rekap Periode Absensi & Cuti)',
  'Lembur tervalidasi (Overtime)',
  'Komponen insidental (langkah 2)',
  'BPJS Kesehatan, JHT, JP, JKK, JKM dan PPh 21 TER',
  'Potongan Koperasi (tagihan periode)',
]

export function StepTarik(props: StepProps & { ctx: RunCtx }) {
  const { run, period, officer, ctx } = props
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [confirm, setConfirm] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  useEffect(() => () => clearInterval(timer.current), [])

  const canRun = officer && isEditable(run)
  const draft = run.draft
  const run1 = () => {
    setBusy(true)
    setProgress(0)
    const start = Date.now()
    timer.current = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / 2000) * 100)
      setProgress(p)
      if (p >= 100) {
        clearInterval(timer.current)
        pullDraft(run.id, ctx, props.user.nama)
        setBusy(false)
        toast.success(`Gaji ${period.label} ditarik`)
      }
    }, 80)
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Yang ditarik</h3>
        <ul className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          {PULLS.map((x) => (
            <li key={x} className="rounded-md border bg-muted/50 px-3 py-2">{x}</li>
          ))}
        </ul>
      </section>
      <Alert variant="info">
        <AlertDescription><span className="font-medium">Aturan Group {run.group}:</span> {GROUP_RULE[run.group]}</AlertDescription>
      </Alert>
      <Alert variant="info">
        <AlertDescription>Draft tidak mengubah saldo pinjaman atau kasbon Koperasi. Potongan baru tercatat setelah payroll final dan direkonsiliasi.</AlertDescription>
      </Alert>

      {busy && (
        <div className="space-y-2" role="status" aria-live="polite">
          <p className="flex items-center gap-2 text-sm font-medium"><Loader2 className="size-4 animate-spin" aria-hidden /> Menghitung gaji {period.label}…</p>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progres tarik gaji">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {!busy && draft && (
        <div className="space-y-2">
          <p className="rounded-md border p-4 text-sm" data-testid="pull-summary">
            <span className="font-semibold tabular-nums">{draft.rows.length.toLocaleString('id-ID')} pegawai dihitung</span> · Draft dibuat {draft.at}
          </p>
          {draft.stale && canRun && (
            <Alert variant="warning">
              <AlertDescription>Komponen insidental berubah setelah draft dibuat. Tarik ulang agar draft memuatnya.</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {canRun && (
        <StepFooter left={<BackButton step={3} onGo={props.onGo} />}>
          {draft && !busy ? (
            <>
              <Button variant="outline" onClick={() => setConfirm(true)}>Tarik Ulang</Button>
              <Button onClick={() => props.onGo(4)}>Lanjut ke Review</Button>
            </>
          ) : (
            <Blocked reason={null}>
              <Button disabled={busy} onClick={run1}>{busy ? 'Menarik…' : 'Tarik Gaji'}</Button>
            </Blocked>
          )}
        </StepFooter>
      )}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tarik ulang gaji {period.label}?</AlertDialogTitle>
            <AlertDialogDescription>Draft sebelumnya akan diganti. Centang "Sudah dicek" hanya dipertahankan untuk baris yang masih ditandai.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirm(false); run1() }}>Tarik Ulang</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
