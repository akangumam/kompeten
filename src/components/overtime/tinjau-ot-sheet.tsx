import { useEffect, useMemo, useState } from 'react'
import { CircleCheck, CircleX, Info } from 'lucide-react'
import { OtStatusBadge } from '@/components/overtime/status'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import type { Scan } from '@/data/attendance'
import { empOf, longDate, teamLabel, type LeaveRequest } from '@/data/leave'
import {
  breakdownOf,
  canDecide,
  canVerify,
  dayTypeLabel,
  dayTypeOf,
  durJam,
  effStatus,
  employeeCheck,
  fj,
  isAwaitingValidation,
  ISTIRAHAT_OPTIONS,
  maxWorkdayWeek,
  roundMinutes,
  nominalOf,
  onBehalfOf,
  polaOf,
  realisasiOf,
  rencanaText,
  rp,
  upahSejam,
  type OtRecord,
} from '@/data/overtime'
import { atasanOf, isApprover, supervisorLabel } from '@/data/employees'
import type { CurrentUser } from '@/data/users'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { AlasanField } from '@/components/ui/alasan-field'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Box({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums leading-tight">{children}</p>
      {sub && <p className="text-xs text-muted-foreground tabular-nums">{sub}</p>}
    </div>
  )
}

export function TinjauOtSheet({
  rec,
  mode,
  records,
  scans,
  leaves,
  user,
  onClose,
  onApprove,
  onReject,
  onValidate,
  onVerify,
  onTidak,
}: {
  rec: OtRecord | null
  mode: 'review' | 'verify' | 'detail'
  records: OtRecord[]
  scans: Scan[]
  leaves: LeaveRequest[]
  user: CurrentUser
  onClose: () => void
  onApprove: (r: OtRecord) => void
  onReject: (r: OtRecord, alasan: string) => void
  onValidate: (r: OtRecord, dibayar: number, kelebihan: string | undefined, istirahat: number) => void
  onVerify: (r: OtRecord, dibayar: number, istirahat: number) => void
  onTidak: (r: OtRecord) => void
}) {
  const [choice, setChoice] = useState<'rencana' | 'lebih'>('rencana')
  const [alasan, setAlasan] = useState('')
  const [tolak, setTolak] = useState('')
  const [error, setError] = useState('')
  const [confirmTolak, setConfirmTolak] = useState(false)
  const [confirmTidak, setConfirmTidak] = useState(false)
  const [istirahat, setIstirahat] = useState(0)
  useEffect(() => {
    setChoice('rencana'); setAlasan(''); setTolak(''); setError(''); setConfirmTolak(false); setConfirmTidak(false); setIstirahat(rec?.istirahat ?? 0)
  }, [rec?.id, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const emp = rec ? empOf(rec.nik) : null
  const status = rec ? effStatus(rec) : null
  const real = useMemo(() => (rec ? realisasiOf(rec, scans, istirahat) : null), [rec, scans, istirahat])
  const showPay = user.role !== 'supervisor'

  if (!rec || !emp || !status || !real) {
    return <Sheet open={false}><SheetContent /></Sheet>
  }

  const plan = durJam(rec)
  const type = dayTypeOf(emp, rec.date)
  const review = mode === 'review' && canDecide(user, emp, status)
  const approval = review && status === 'menunggu-approval'
  const validation = review && isAwaitingValidation(status)
  const verifying = mode === 'verify' && canVerify(user, status)
  const excess = real.aktual > plan
  const noReal = real.aktual === 0
  // Verifikasi HRD: bila istirahat diubah, jam dibayar mengikuti realisasi baru (kelebihan yang sudah disetujui tetap dibayar penuh).
  const changedBreak = verifying && istirahat !== (rec.istirahat ?? 0)
  const verifyPay = changedBreak ? (rec.kelebihan ? real.aktual : Math.min(plan, real.aktual)) : (rec.dibayar ?? Math.min(plan, real.aktual))
  const chosen = verifying ? verifyPay : rec.dibayar ?? (excess && choice === 'lebih' ? real.aktual : Math.min(plan, real.aktual))
  const proxy = onBehalfOf(user, emp)
  const check = employeeCheck(emp, rec.date, rec.start, rec.end, records.filter((r) => r.id !== rec.id), leaves)
  const showReal = isAwaitingValidation(status) || status === 'menunggu-verifikasi' || status === 'tervalidasi' || status === 'tidak-terealisasi'
  const bd = breakdownOf(chosen, type, polaOf(emp))

  const doValidate = () => {
    if (excess && choice === 'lebih') {
      if (!validAlasan(alasan)) return setError(ALASAN_ERROR)
      return onValidate(rec, real.aktual, alasan.trim(), istirahat)
    }
    onValidate(rec, Math.min(plan, real.aktual), undefined, istirahat)
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {approval ? 'Tinjau SPL' : validation ? 'Validasi Lembur' : verifying ? 'Verifikasi Lembur' : 'Detail Lembur'} · {rec.no}
          </SheetTitle>
          <SheetDescription className="tabular-nums">
            {emp.nama} · {emp.nik} · {teamLabel(emp)}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <OtStatusBadge status={status} />
            <p className="text-sm text-muted-foreground">
              Diajukan oleh <span className="font-medium text-foreground">{rec.by}</span> · <span className="tabular-nums">{rec.at}</span>
            </p>
          </div>
          {review && proxy && (
            <p className="rounded-md border border-info/20 bg-info/10 px-3 py-2 text-sm text-info">
              {approval ? 'Anda menyetujui' : 'Anda memvalidasi'} mewakili {proxy}
            </p>
          )}
          {status === 'menunggu-validasi-manager' && isApprover(emp.nik) && (
            <p className="rounded-md border border-info/20 bg-info/10 px-3 py-2 text-sm text-info">
              Diteruskan ke {supervisorLabel(atasanOf(emp))} karena diajukan oleh approver
            </p>
          )}

          <dl className="space-y-3 rounded-md border p-4">
            <Row label="Tanggal">
              <span className="tabular-nums">{longDate(rec.date)}</span>{' '}
              <StatusBadge variant="neutral" className="ml-1">{dayTypeLabel(type)}</StatusBadge>
            </Row>
            <Row label="Rencana"><span className="font-medium tabular-nums">{rencanaText(rec)}</span></Row>
            <Row label="Pekerjaan">{rec.pekerjaan}</Row>
            {(approval || status === 'terjadwal' || status === 'menunggu-approval') && (
              <>
                {type === 'kerja' && (
                  <Row label="Minggu ini">
                    <span className="tabular-nums">
                      {fj(check.week + plan)} dari {maxWorkdayWeek()} jam lembur hari kerja
                    </span>
                  </Row>
                )}
                <Row label="Syarat">
                  {check.error ? (
                    <span className="flex items-start gap-1.5 text-danger"><CircleX className="mt-0.5 size-4 shrink-0" aria-hidden />{check.error}</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-success"><CircleCheck className="size-4 shrink-0" aria-hidden />Istirahat ≥ 8 jam dan tidak bentrok cuti</span>
                  )}
                </Row>
              </>
            )}
          </dl>

          {showReal && (
            <section className="space-y-3" aria-label="Realisasi">
              <h3 className="text-sm font-medium">Realisasi dari scan absen</h3>
              <div className="grid grid-cols-2 gap-3">
                <Box label="Rencana">{fj(plan)} j</Box>
                <Box label="Scan" sub={real.masuk ? `masuk ${real.masuk}` : undefined}>
                  {real.hasScan ? `pulang ${real.pulang}` : '—'}
                </Box>
                <Box label="Realisasi (dibulatkan)" sub={`per ${roundMinutes()} menit`}>{fj(real.aktual)} j</Box>
                <Box label="Dibayar">{status === 'tidak-terealisasi' ? '0 j' : `${fj(chosen)} j`}</Box>
              </div>

              {(validation || verifying) && (
                <div className="space-y-2">
                  <Label htmlFor="ot-istirahat">Istirahat (menit)</Label>
                  <Select value={String(istirahat)} onValueChange={(v) => setIstirahat(Number(v))}>
                    <SelectTrigger id="ot-istirahat" className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{ISTIRAHAT_OPTIONS.map((m) => <SelectItem key={m} value={String(m)}>{m} menit</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Kelipatan 15 menit; dikurangkan dari realisasi.</p>
                </div>
              )}
              {showReal && real.hasScan && (
                <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground tabular-nums">
                  Realisasi = (scan pulang {real.pulang} − mulai {real.mulai}) − istirahat {real.istirahat} menit = {real.aktualMin} menit, dibulatkan ke bawah per {roundMinutes()} menit = <span className="font-medium text-foreground">{fj(real.aktual)} j</span>
                </p>
              )}
              {validation && excess && (
                <div className="space-y-3">
                  <RadioGroup value={choice} onValueChange={(v) => { setChoice(v as 'rencana' | 'lebih'); setError('') }} aria-label="Jam yang dibayar">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="rencana" id="ot-rencana" />
                      <Label htmlFor="ot-rencana" className="font-normal">Bayar sesuai rencana ({fj(plan)} j)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="lebih" id="ot-lebih" />
                      <Label htmlFor="ot-lebih" className="font-normal">Setujui kelebihan, bayar {fj(real.aktual)} j</Label>
                    </div>
                  </RadioGroup>
                  {choice === 'lebih' && (
                    <AlasanField id="ot-alasan" label="Alasan kelebihan" value={alasan} onChange={(v) => { setAlasan(v); setError('') }} error={error} />
                  )}
                </div>
              )}
              {validation && !excess && real.hasScan && !noReal && real.aktual < plan && (
                <p className="flex items-start gap-2 rounded-md border border-info/20 bg-info/10 px-3 py-2 text-sm text-info">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Dibayar sesuai realisasi ({fj(real.aktual)} j)
                </p>
              )}
              {validation && noReal && (
                <div className="space-y-3">
                  <p className="flex items-start gap-2 rounded-md border border-info/20 bg-info/10 px-3 py-2 text-sm text-info">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {real.hasScan ? 'Scan pulang kurang dari ${roundMinutes()} menit setelah jadwal mulai. ' : 'Tidak ada scan setelah shift. '}
                    Realisasi 0 jam. Ajukan koreksi di Absensi bila pegawai benar-benar lembur.
                  </p>
                  <Button variant="outline" className="border-destructive text-destructive hover:text-destructive" onClick={() => setConfirmTidak(true)}>
                    Tandai Tidak Terealisasi
                  </Button>
                </div>
              )}

              {showPay && status !== 'tidak-terealisasi' && chosen > 0 && (
                <p className="rounded-md bg-muted/50 px-3 py-2 text-sm tabular-nums">
                  {bd.text} = {fj(bd.pengali)} jam-pengali × {rp(upahSejam(emp))} ={' '}
                  <span className="font-semibold">{rp(nominalOf(emp, bd))}</span>
                </p>
              )}
            </section>
          )}

          {rec.decision && (
            <section className="space-y-1">
              <h3 className="text-sm font-medium">
                {status === 'tervalidasi' || status === 'menunggu-verifikasi' ? 'Divalidasi Atasan' : status === 'ditolak' ? 'Ditolak' : status === 'dibatalkan' ? 'Dibatalkan' : status === 'tidak-terealisasi' ? 'Ditandai tidak terealisasi' : 'Disetujui'} oleh {rec.decision.by}
              </h3>
              <p className="text-xs text-muted-foreground tabular-nums">{rec.decision.at}</p>
              {rec.decision.alasan && <p className="text-sm text-muted-foreground">Alasan: {rec.decision.alasan}</p>}
            </section>
          )}

          {rec.verif && (
            <section className="space-y-1">
              <h3 className="text-sm font-medium">Diverifikasi HRD oleh {rec.verif.by}</h3>
              <p className="text-xs text-muted-foreground tabular-nums">{rec.verif.at}{rec.istirahat ? ` · istirahat ${rec.istirahat} menit` : ''}</p>
            </section>
          )}

          {approval && (
            <AlasanField id="ot-tolak" label="Alasan penolakan" value={tolak} onChange={(v) => { setTolak(v); setError('') }} error={error} placeholder="Tulis alasan jika SPL ditolak…" />
          )}
        </div>

        {approval && (
          <SheetFooter className="flex-row justify-end gap-2">
            <Button variant="destructive" onClick={() => (validAlasan(tolak) ? setConfirmTolak(true) : setError(ALASAN_ERROR))}>Tolak</Button>
            <Button onClick={() => onApprove(rec)}>Setujui</Button>
          </SheetFooter>
        )}
        {validation && (
          <SheetFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button disabled={noReal} onClick={doValidate}>Validasi</Button>
          </SheetFooter>
        )}
        {verifying && (
          <SheetFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={() => onVerify(rec, verifyPay, istirahat)}>Verifikasi</Button>
          </SheetFooter>
        )}

        <AlertDialog open={confirmTolak} onOpenChange={setConfirmTolak}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tolak SPL {rec.no}?</AlertDialogTitle>
              <AlertDialogDescription>Alasan penolakan dicatat: “{tolak.trim()}”.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => onReject(rec, tolak.trim())}>Tolak SPL</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={confirmTidak} onOpenChange={setConfirmTidak}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tandai {emp.nama} tidak terealisasi?</AlertDialogTitle>
              <AlertDialogDescription>
                Lembur {rec.no} tidak dibayar dan tidak masuk slip. Ajukan koreksi di Absensi bila pegawai ternyata lembur.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => onTidak(rec)}>Tandai Tidak Terealisasi</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  )
}

export function CancelOtDialog({
  rec,
  onClose,
  onConfirm,
}: {
  rec: OtRecord | null
  onClose: () => void
  onConfirm: (r: OtRecord, alasan: string) => void
}) {
  const [alasan, setAlasan] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    setAlasan('')
    setError('')
  }, [rec?.id])
  return (
    <AlertDialog open={rec !== null} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan SPL {rec?.no}?</AlertDialogTitle>
          <AlertDialogDescription>
            {rec && `${empOf(rec.nik).nama} · ${longDate(rec.date)} · ${rencanaText(rec)}. `}SPL yang dibatalkan tidak bisa diaktifkan lagi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlasanField id="ot-batal" label="Alasan pembatalan" value={alasan} onChange={(v) => { setAlasan(v); setError('') }} error={error} />
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              if (!validAlasan(alasan)) return setError(ALASAN_ERROR)
              if (rec) onConfirm(rec, alasan.trim())
            }}
          >
            Batalkan SPL
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
