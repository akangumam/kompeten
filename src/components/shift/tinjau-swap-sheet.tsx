import { useEffect, useState } from 'react'
import { ArrowRight, CircleCheck, CircleX } from 'lucide-react'
import { SwapStatusBadge } from '@/components/shift/swap-status'
import { SourceBadge } from '@/components/mobile/source-badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { StatusBadge } from '@/components/ui/status-badge'
import { can } from '@/lib/access'
import { DEMO_MODE, simLabel } from '@/lib/demo'
import { pendingConfirm } from '@/components/shift/use-shift-swaps'
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
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { empByNik } from '@/data/attendance'
import { atasanOf } from '@/data/employees'
import { teamLabel } from '@/data/leave'
import { restAround, restError, restSummary, SHIFT_LABEL, type Ctx } from '@/data/shift-schedule'
import { isSwapPending, type ShiftSwap } from '@/data/shift-swaps'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { AlasanField } from '@/components/ui/alasan-field'

function Change({ nama, from, to }: { nama: string; from: ShiftSwap['shiftA']; to: ShiftSwap['shiftA'] }) {
  return (
    <li className="flex flex-wrap items-center gap-1.5 text-sm">
      <span className="font-medium">{nama}:</span>
      <span className="text-muted-foreground">{SHIFT_LABEL[from]}</span>
      <ArrowRight className="size-3 text-muted-foreground" aria-hidden />
      <span className="font-medium">{SHIFT_LABEL[to]}</span>
    </li>
  )
}

export function TinjauSwapSheet({
  swap,
  mode,
  ctx,
  user,
  onClose,
  onApprove,
  onReject,
  onConfirm,
}: {
  swap: ShiftSwap | null
  mode: 'review' | 'detail'
  ctx: Ctx
  user: CurrentUser
  onClose: () => void
  onApprove: (s: ShiftSwap) => void
  onReject: (s: ShiftSwap, alasan: string) => void
  onConfirm: (s: ShiftSwap, nik: string, setuju: boolean, via: 'aplikasi' | 'dicatat-hr', keterangan?: string) => void
}) {
  const [alasan, setAlasan] = useState('')
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [catat, setCatat] = useState<{ nik: string; setuju: boolean } | null>(null)
  const [ket, setKet] = useState('')
  const [ketErr, setKetErr] = useState('')
  useEffect(() => {
    setCatat(null); setKet(''); setKetErr('')
    setAlasan('')
    setError('')
    setConfirm(false)
  }, [swap?.no, mode])

  const a = swap ? empByNik(swap.nikA) : null
  const b = swap ? empByNik(swap.nikB) : null
  const review = mode === 'review' && !!swap && isSwapPending(swap.status)
  const waitingNames = swap ? pendingConfirm(swap).map((n) => empByNik(n)?.nama ?? n) : []
  const blocked = !!swap && swap.status === 'menunggu-konfirmasi'
  const rests =
    swap && a && b
      ? [
          { e: a, r: restAround(a, swap.date, swap.shiftB, ctx, swap.no) },
          { e: b, r: restAround(b, swap.date, swap.shiftA, ctx, swap.no) },
        ]
      : []

  return (
    <Sheet open={swap !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {swap && a && b && (
          <>
            <SheetHeader>
              <SheetTitle>{review ? 'Tinjau Tukar Shift' : 'Detail Tukar Shift'} · {swap.no}</SheetTitle>
              <SheetDescription className="tabular-nums">{teamLabel(a)} · {formatDate(swap.date)}</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4">
              <div className="flex flex-wrap items-center gap-2">
                <SwapStatusBadge status={swap.status} />
                <p className="text-sm text-muted-foreground">
                  Diajukan oleh <span className="font-medium text-foreground">{swap.by}</span> {swap.diajukanOleh === 'pegawai' && <SourceBadge sumber="aplikasi" className="ml-1 align-middle" />} · <span className="tabular-nums">{swap.at}</span>
                </p>
              </div>
              {review && user.role === 'manager' && a.atasanId !== 'manager' && (
                <p className="rounded-md border border-info/20 bg-info/10 px-3 py-2 text-sm text-info">
                  Anda menyetujui mewakili {atasanOf(a).nama}
                </p>
              )}
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Perubahan shift pada {formatDate(swap.date)}</h3>
                <ul className="space-y-1.5 rounded-md border p-4">
                  <Change nama={a.nama} from={swap.shiftA} to={swap.shiftB} />
                  <Change nama={b.nama} from={swap.shiftB} to={swap.shiftA} />
                </ul>
              </section>
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Cek waktu istirahat (minimal 8 jam)</h3>
                <ul className="space-y-1.5 text-sm">
                  {rests.map(({ e, r }) => {
                    const err = restError(r)
                    return (
                      <li key={e.nik} className={err ? 'flex items-start gap-2 text-danger' : 'flex items-start gap-2 text-success'}>
                        {err ? <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />}
                        <span>{err ?? <><span className="font-medium">{e.nama.split(' ')[0]}:</span> {restSummary(r)}</>}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>
              <section className="space-y-1">
                <h3 className="text-sm font-medium">Ketersediaan shift</h3>
                <p className="text-sm text-muted-foreground">
                  Jumlah operator per shift pada {formatDate(swap.date)} tidak berubah.
                </p>
              </section>
              <section className="space-y-2" aria-label="Konfirmasi pegawai">
                <h3 className="text-sm font-medium">Konfirmasi pegawai</h3>
                <ul className="space-y-2 rounded-md border p-4">
                  {[a, b].map((e) => {
                    const c = swap.konfirmasi[e.nik] ?? { status: 'menunggu' as const }
                    return (
                      <li key={e.nik} className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium">{e.nama}{swap.pemohon === e.nik && <span className="font-normal text-muted-foreground"> · pemohon</span>}</span>
                          <StatusBadge variant={c.status === 'setuju' ? 'success' : c.status === 'menolak' ? 'danger' : 'warning'}>
                            {c.status === 'setuju' ? 'Setuju' : c.status === 'menolak' ? 'Menolak' : 'Menunggu'}
                          </StatusBadge>
                        </div>
                        {c.at && (
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {c.at} · {c.via === 'aplikasi' ? 'Dari aplikasi' : `Dicatat HR Personalia${c.oleh ? ` (${c.oleh})` : ''}`}
                            {c.keterangan ? ` · ${c.keterangan}` : ''}
                          </p>
                        )}
                        {swap.status === 'menunggu-konfirmasi' && c.status === 'menunggu' && (
                          <div className="flex flex-wrap gap-2">
                            {can(user, 'attendance.manage') && <Button size="sm" variant="outline" onClick={() => { setCatat({ nik: e.nik, setuju: true }); setKet(''); setKetErr('') }}>Catat konfirmasi</Button>}
                            {DEMO_MODE && <Button size="sm" variant="outline" onClick={() => onConfirm(swap, e.nik, true, 'aplikasi')}>{simLabel}{e.nama.split(' ')[0]} setuju di aplikasi</Button>}
                            {DEMO_MODE && <Button size="sm" variant="outline" onClick={() => { setCatat({ nik: e.nik, setuju: false }); setKet(''); setKetErr('') }}>{simLabel}{e.nama.split(' ')[0]} menolak</Button>}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
              <section className="space-y-1">
                <h3 className="text-sm font-medium">Alasan</h3>
                <p className="text-sm text-muted-foreground">{swap.alasan}</p>
              </section>
              {swap.decision && (
                <section className="space-y-1">
                  <h3 className="text-sm font-medium">
                    {swap.decision.by.endsWith('(konfirmasi pegawai)')
                      ? `Ditolak ${swap.decision.by}`
                      : `${swap.status === 'disetujui' ? 'Disetujui' : swap.status === 'ditolak' ? 'Ditolak' : 'Dibatalkan'} oleh ${swap.decision.by}`}
                  </h3>
                  <p className="text-xs text-muted-foreground tabular-nums">{swap.decision.at}</p>
                  {swap.decision.alasan && <p className="text-sm text-muted-foreground">Alasan: {swap.decision.alasan}</p>}
                </section>
              )}
              {review && (
                <AlasanField id="tks-tolak" label="Alasan penolakan" value={alasan} onChange={(v) => { setAlasan(v); setError('') }} error={error} placeholder="Tulis alasan jika pengajuan ditolak…" />
              )}
            </div>
            {review && (
              <SheetFooter className="flex-row justify-end gap-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!validAlasan(alasan)) return setError(ALASAN_ERROR)
                    setConfirm(true)
                  }}
                >
                  Tolak
                </Button>
                {blocked ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}><Button disabled className="pointer-events-none">Setujui</Button></span>
                    </TooltipTrigger>
                    <TooltipContent>Menunggu konfirmasi {waitingNames.join(' dan ')}</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button onClick={() => onApprove(swap)}>Setujui</Button>
                )}
              </SheetFooter>
            )}
            <AlertDialog open={catat !== null} onOpenChange={(o) => !o && setCatat(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{catat?.setuju ? 'Catat konfirmasi' : 'Catat penolakan'} · {catat ? empByNik(catat.nik)?.nama : ''}</AlertDialogTitle>
                  <AlertDialogDescription>{catat?.setuju ? 'Konfirmasi pegawai yang tidak memakai aplikasi dicatat HR Personalia beserta keterangannya.' : 'Pengajuan menjadi Ditolak karena pegawai menolak.'}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlasanField id="tks-ket" label="Keterangan" value={ket} onChange={(v) => { setKet(v); setKetErr('') }} error={ketErr} placeholder={catat?.setuju ? 'Mis. Setuju lewat telepon dengan HR' : 'Mis. Tidak bersedia bertukar shift'} />
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <Button
                    onClick={() => {
                      if (!validAlasan(ket)) return setKetErr(ALASAN_ERROR)
                      if (catat) onConfirm(swap, catat.nik, catat.setuju, catat.setuju ? 'dicatat-hr' : 'aplikasi', ket.trim())
                      setCatat(null)
                    }}
                  >
                    {catat?.setuju ? 'Catat konfirmasi' : 'Catat penolakan'}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={confirm} onOpenChange={setConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tolak pengajuan {swap.no}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Jadwal {a.nama} dan {b.nama} tetap seperti semula. Alasan penolakan dicatat: “{alasan.trim()}”.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => onReject(swap, alasan.trim())}>
                    Tolak Pengajuan
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export function CancelSwapDialog({
  swap,
  onClose,
  onConfirm,
}: {
  swap: ShiftSwap | null
  onClose: () => void
  onConfirm: (s: ShiftSwap, alasan: string) => void
}) {
  const [alasan, setAlasan] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    setAlasan('')
    setError('')
  }, [swap?.no])
  return (
    <AlertDialog open={swap !== null} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan pengajuan {swap?.no}?</AlertDialogTitle>
          <AlertDialogDescription>
            {swap && `Tukar shift ${empByNik(swap.nikA)?.nama} dan ${empByNik(swap.nikB)?.nama} pada ${formatDate(swap.date)}. `}
            Jadwal tetap seperti semula dan pengajuan tidak bisa diaktifkan lagi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlasanField id="tks-batal" label="Alasan pembatalan" value={alasan} onChange={(v) => { setAlasan(v); setError('') }} error={error} />
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              if (!validAlasan(alasan)) return setError(ALASAN_ERROR)
              if (swap) onConfirm(swap, alasan.trim())
            }}
          >
            Batalkan Pengajuan
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
