import { useEffect, useState } from 'react'
import { FileText, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { JenisBadge, TrxStatusCell } from '@/components/transactions/shared'
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
import { isPending, type LeaveRequest } from '@/data/leave'
import { tunjanganAt } from '@/data/payroll/components'
import { idr } from '@/data/payroll/salaries'
import { canReview, changeLine, currentStep, empOf, impactLines, supName, showsPay, type Trx } from '@/data/transactions'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { DEMO_TODAY } from '@/lib/today'
import { AlasanField } from '@/components/ui/alasan-field'

const NO_PAY = 'Rincian gaji hanya untuk HR & GA Manager'

type DiffRow = { label: string; a: string; b: string }

function diffRows(t: Trx, showPay: boolean): DiffRow[] {
  const { sebelum: x, sesudah: y } = t
  const rows: DiffRow[] = [
    { label: 'Department', a: x.department, b: y.department },
    { label: 'Section', a: x.section || '—', b: y.section || '—' },
    { label: 'Posisi', a: x.posisi, b: y.posisi },
    { label: 'Level', a: x.level, b: y.level },
    { label: 'Grade', a: x.grade, b: y.grade },
    { label: 'Jenis Karyawan', a: x.jenis, b: y.jenis },
    { label: 'Status Kerja', a: x.statusKerja, b: y.statusKerja },
    { label: 'Group Kerja', a: x.kelompok, b: y.kelompok },
    { label: 'Atasan', a: supName(x.atasanId), b: supName(y.atasanId) },
  ]
  if (x.tanggalAkhir || y.tanggalAkhir) rows.push({ label: 'Berakhir kontrak', a: x.tanggalAkhir ? formatDate(x.tanggalAkhir) : '—', b: y.tanggalAkhir ? formatDate(y.tanggalAkhir) : '—' })
  if (t.kontrak) rows.push({ label: `Kontrak ke-${t.kontrak.ke}`, a: '—', b: `${formatDate(t.kontrak.mulai)} – ${formatDate(t.kontrak.akhir)} (${t.kontrak.bulan} bulan)` })
  if (t.gaji) rows.push({ label: 'Gaji Pokok', a: showPay ? idr(t.gaji.lama) : NO_PAY, b: showPay ? idr(t.gaji.baru) : NO_PAY })
  if (x.level !== y.level) {
    const a = tunjanganAt(x.level, t.efektif)
    const b = tunjanganAt(y.level, t.efektif)
    if (a !== b) rows.push({ label: 'Tunjangan Jabatan', a: showPay ? idr(a) : NO_PAY, b: showPay ? idr(b) : NO_PAY })
  }
  return rows
}

export function TrxReviewSheet({
  trx,
  mode,
  user,
  leaves,
  onClose,
  onApprove,
  onReject,
  onLetter,
}: {
  trx: Trx | null
  mode: 'review' | 'detail'
  user: CurrentUser
  leaves: LeaveRequest[]
  onClose: () => void
  onApprove: (t: Trx) => void
  onReject: (t: Trx, alasan: string) => void
  onLetter: (t: Trx) => void
}) {
  const [alasan, setAlasan] = useState('')
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    setAlasan('')
    setError('')
    setConfirm(false)
  }, [trx?.no, mode])

  const emp = trx ? empOf(trx.nik) : undefined
  const pay = showsPay(user)
  const decide = mode === 'review' && !!trx && canReview(trx, user)
  const step = trx ? currentStep(trx) : undefined
  const pendingNos = trx ? leaves.filter((r) => r.nik === trx.nik && isPending(r.status)).map((r) => r.no) : []
  const lines = trx ? impactLines(trx, pendingNos) : []

  return (
    <Sheet open={trx !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {trx && emp && (
          <>
            <SheetHeader>
              <SheetTitle>{decide ? 'Tinjau Transaksi' : 'Detail Transaksi'} · {trx.no}</SheetTitle>
              <SheetDescription className="tabular-nums">{emp.nama} · {emp.nik} · {emp.department}</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4">
              <div className="flex flex-wrap items-start gap-3">
                <JenisBadge jenis={trx.jenis} />
                <TrxStatusCell t={trx} />
                <p className="text-sm text-muted-foreground">
                  Diajukan oleh <span className="font-medium text-foreground">{trx.diajukan.by}</span> · <span className="tabular-nums">{trx.diajukan.at}</span>
                </p>
              </div>
              {decide && user.role === 'manager' && step && step.personId !== 'manager' && (
                <p className="rounded-md border border-info/20 bg-info/10 px-3 py-2 text-sm text-info">Anda menyetujui mewakili {step.person}</p>
              )}
              {decide && step && step.personId === 'manager' && trx.steps.length === 1 && (
                <p className="rounded-md border border-info/20 bg-info/10 px-3 py-2 text-sm text-info">Penyetuju 1 menurut Matriks Penyetuju adalah HR & GA Manager, sehingga hanya ada satu langkah persetujuan.</p>
              )}

              <section className="space-y-2" aria-label="Alur persetujuan">
                <h3 className="text-sm font-medium">Alur persetujuan</h3>
                <ol className="space-y-2">
                  {trx.steps.map((s, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{s.label}: {s.person}</p>
                        {s.mewakili && <p className="text-xs text-muted-foreground">Disetujui {s.by} mewakili {s.mewakili}</p>}
                        {s.alasan && <p className="text-xs text-muted-foreground">Alasan: {s.alasan}</p>}
                      </div>
                      <span className={cn('shrink-0 text-xs tabular-nums', s.status === 'disetujui' ? 'text-success' : s.status === 'ditolak' ? 'text-danger' : 'text-muted-foreground')}>
                        {s.status === 'disetujui' ? `Disetujui · ${s.at}` : s.status === 'ditolak' ? `Ditolak · ${s.at}` : trx.status === 'menunggu' && step === s ? 'Menunggu' : trx.status === 'menunggu' ? 'Belum' : '—'}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="space-y-2" aria-label="Data asli dan usulan">
                <h3 className="text-sm font-medium">Data saat ini dan usulan</h3>
                <div className="overflow-hidden rounded-md border text-sm">
                  <div className="grid grid-cols-[130px_1fr_1fr] gap-3 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Data</span><span>Saat ini</span><span>Usulan</span>
                  </div>
                  <div className="divide-y">
                    {diffRows(trx, pay).map((r) => {
                      const changed = r.a !== r.b
                      return (
                        <div key={r.label} className="grid grid-cols-[130px_1fr_1fr] gap-3 px-3 py-2">
                          <span className="text-muted-foreground">{r.label}</span>
                          <span className="tabular-nums">{r.a}</span>
                          <span className={cn('tabular-nums', changed && 'font-medium')}>{r.b}</span>
                        </div>
                      )
                    })}
                    <div className="grid grid-cols-[130px_1fr] gap-3 px-3 py-2">
                      <span className="text-muted-foreground">Tanggal efektif</span>
                      <span className="font-medium tabular-nums">{formatDate(trx.efektif)}{trx.periodeId ? ` · periode payroll ${periodLabel(trx.efektif)}` : ''}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{changeLine(trx, pay)}</p>
              </section>

              <section className="space-y-2" aria-label="Dampak">
                <h3 className="text-sm font-medium">Dampak</h3>
                {lines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada dampak tambahan.</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {lines.filter((l) => pay || !l.pay).map((l) => <li key={l.text}>{l.text}</li>)}
                    {!pay && lines.some((l) => l.pay) && <li className="text-muted-foreground">{NO_PAY}</li>}
                  </ul>
                )}
                {trx.perubahanGajiNo && pay && <p className="text-xs text-muted-foreground">Perubahan Gaji tertaut: {trx.perubahanGajiNo} (Disetujui, alasan {trx.jenis === 'Promosi' ? 'Promosi' : 'Lainnya'}).</p>}
              </section>

              <section className="space-y-1">
                <h3 className="text-sm font-medium">{trx.alasanDemosi ? 'Alasan demosi dan keterangan' : 'Alasan'}</h3>
                {trx.alasanDemosi && <p className="text-sm font-medium">{trx.alasanDemosi}</p>}
                <p className="text-sm text-muted-foreground">{trx.alasan}</p>
              </section>

              <section className="space-y-1">
                <h3 className="text-sm font-medium">Lampiran</h3>
                {trx.lampiran ? (
                  <p className="flex items-center gap-2 text-sm">
                    <Paperclip className="size-4 text-muted-foreground" aria-hidden />
                    <button type="button" className="rounded-sm underline underline-offset-4 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={() => toast.info(`Pratinjau ${trx.lampiran} (simulasi)`)}>{trx.lampiran}</button>
                  </p>
                ) : <p className="text-sm text-muted-foreground">Tidak ada lampiran</p>}
              </section>

              <section className="flex items-center justify-between gap-3 rounded-md border bg-muted/50 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{trx.jenis === 'Perpanjangan Kontrak' ? 'Perjanjian Kerja Waktu Tertentu' : 'Surat Keputusan'}</p>
                  <p className="truncate text-xs text-muted-foreground tabular-nums">{trx.suratNo}{trx.status === 'disetujui' ? '' : ' · DRAFT sampai Disetujui'}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => onLetter(trx)}><FileText /> Pratinjau Surat</Button>
              </section>

              {trx.keputusan && trx.status !== 'disetujui' && (
                <section className="space-y-1">
                  <h3 className="text-sm font-medium">{trx.status === 'ditolak' ? 'Ditolak' : 'Dibatalkan'} oleh {trx.keputusan.by}</h3>
                  <p className="text-xs text-muted-foreground tabular-nums">{trx.keputusan.at}</p>
                  {trx.keputusan.alasan && <p className="text-sm text-muted-foreground">Alasan: {trx.keputusan.alasan}</p>}
                </section>
              )}

              {decide && (
                <AlasanField id="trx-tolak" label="Alasan penolakan" required={false} value={alasan} onChange={(v) => { setAlasan(v); setError('') }} error={error} placeholder="Tulis alasan jika transaksi ditolak…" />
              )}
            </div>
            {decide && (
              <SheetFooter className="flex-row justify-end gap-2">
                <Button variant="destructive" onClick={() => (validAlasan(alasan) ? setConfirm(true) : setError(ALASAN_ERROR))}>Tolak</Button>
                <Button onClick={() => onApprove(trx)}>Setujui</Button>
              </SheetFooter>
            )}
            <AlertDialog open={confirm} onOpenChange={setConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tolak transaksi {trx.no}?</AlertDialogTitle>
                  <AlertDialogDescription>Transaksi menjadi Ditolak dan tidak mengubah data pegawai. Alasan dicatat: “{alasan.trim()}”.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => onReject(trx, alasan.trim())}>Tolak Transaksi</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

import { periodContaining } from '@/data/master/attendance-rules'
const periodLabel = (iso: string) => periodContaining(iso || DEMO_TODAY).label
