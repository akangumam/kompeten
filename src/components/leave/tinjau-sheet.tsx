import { simLabel } from '@/lib/demo'
import { can } from '@/lib/access'
import { useEffect, useState } from 'react'
import { FileText, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { LeaveStatusBadge } from '@/components/leave/status'
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
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { activeSickCategories } from '@/data/master/sick-categories'
import { isApprover, supervisorLabel } from '@/data/employees'
import { chainFor } from '@/data/master/approvers'
import { NEEDS_HRD } from '@/data/leave'
import { pembagiOf } from '@/data/master/levels'
import { balanceOf, coverage, empOf, isCancelReq, isJamKerja, isPending, isVerif, rangeLabel, teamLabel, type LeaveRequest } from '@/data/leave'
import type { CurrentUser } from '@/data/users'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { AlasanField } from '@/components/ui/alasan-field'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export function TinjauSheet({
  req,
  mode,
  all,
  user,
  onClose,
  onApprove,
  onReject,
  onVerify,
  onGiveBack,
}: {
  req: LeaveRequest | null
  mode: 'review' | 'verify' | 'detail'
  all: LeaveRequest[]
  user: CurrentUser
  onClose: () => void
  onApprove: (r: LeaveRequest) => void
  onReject: (r: LeaveRequest, alasan: string) => void
  onVerify: (r: LeaveRequest, kategori?: string) => void
  onGiveBack: (r: LeaveRequest, alasan: string) => void
}) {
  const [alasan, setAlasan] = useState('')
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [kategori, setKategori] = useState('')
  useEffect(() => {
    setKategori('')
    setAlasan('')
    setError('')
    setConfirm(false)
  }, [req?.no, mode])

  const emp = req ? empOf(req.nik) : null
  const chain = emp ? chainFor(emp) : []
  const doneN = req?.approvals?.length ?? 0
  const curStep = chain[Math.min(doneN, Math.max(chain.length - 1, 0))]
  const bal = emp && req?.jenis === 'Cuti Tahunan' ? balanceOf(emp, all) : null
  const cover = req ? coverage(req, all) : []
  const cancelling = !!req && isCancelReq(req.status)
  const review = mode === 'review' && !!req && (isPending(req.status) || cancelling)
  const verify = mode === 'verify' && !!req && isVerif(req.status)
  const decide = review || verify
  // Kategori sakit = data kesehatan: hanya HR Personalia dan HR & GA Manager yang melihat dan mengisinya.
  const canSeeKategori = can(user, 'attendance.sick-category')
  const needKategori = verify && req?.jenis === 'Sakit' && canSeeKategori
  const surat = req?.jenis === 'Dinas' ? 'Surat tugas' : req?.jenis === 'Sakit' ? 'Surat dokter' : 'Lampiran'

  return (
    <Sheet open={req !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {req && emp && (
          <>
            <SheetHeader>
              <SheetTitle>{verify ? 'Verifikasi HRD' : cancelling && review ? 'Tinjau Pembatalan' : review ? 'Tinjau Pengajuan' : 'Detail Pengajuan'} · {req.no}</SheetTitle>
              <SheetDescription className="tabular-nums">
                {emp.nama} · {emp.nik} · {teamLabel(emp)}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4">
              <div className="flex flex-wrap items-center gap-2">
                <LeaveStatusBadge status={req.status} />
                <p className="text-sm text-muted-foreground">
                  Diajukan oleh <span className="font-medium text-foreground">{req.by}</span> · <span className="tabular-nums">{req.at}</span>
                </p>
              </div>
              {review && user.role === 'manager' && curStep && curStep.person.id !== 'manager' && (
                <p className="rounded-md border border-info/20 bg-info/10 px-3 py-2 text-sm text-info">
                  Anda menyetujui mewakili {curStep.person.nama}
                </p>
              )}
              {req.status === 'menunggu-manager' && isApprover(emp.nik) && chain[0] && (
                <p className="rounded-md border border-info/20 bg-info/10 px-3 py-2 text-sm text-info">
                  Diteruskan ke {supervisorLabel(chain[0].person)} karena diajukan oleh approver
                </p>
              )}
              <section className="space-y-2" aria-label="Alur persetujuan">
                <h3 className="text-sm font-medium">Alur persetujuan</h3>
                <ol className="space-y-2">
                  {chain.map((c, i) => {
                    const a = req.approvals?.find((x) => x.step === i + 1) ?? (i === chain.length - 1 && req.decision && req.status !== 'ditolak' ? { by: req.decision.by, at: req.decision.at } : undefined)
                    const rejected = req.status === 'ditolak' && !req.verif && i === Math.min(doneN, chain.length - 1)
                    return (
                      <li key={c.step} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">{c.label}: {c.person.nama}</p>
                          <p className="text-xs text-muted-foreground">{c.posisi}</p>
                        </div>
                        <span className={`shrink-0 text-xs ${a ? 'text-success' : rejected ? 'text-danger' : 'text-muted-foreground'}`}>
                          {a ? `Disetujui · ${a.at}` : rejected ? 'Ditolak' : isPending(req.status) || isCancelReq(req.status) ? (i === doneN ? 'Menunggu' : 'Belum') : '—'}
                        </span>
                      </li>
                    )
                  })}
                  {NEEDS_HRD.includes(req.jenis) && (
                    <li className="flex items-start justify-between gap-3 rounded-md border border-dashed px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">Verifikasi HRD</p>
                        <p className="text-xs text-muted-foreground">Setelah penyetuju terakhir</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{req.verif ? (req.verif.hasil === 'disetujui' ? 'Terverifikasi' : 'Dikembalikan') : isVerif(req.status) ? 'Menunggu' : 'Belum'}</span>
                    </li>
                  )}
                </ol>
              </section>
              <dl className="space-y-3 rounded-md border p-4">
                <Row label="Jenis">
                  <span className="font-medium">{req.jenis}</span>
                  {req.sub && <span className="text-muted-foreground"> · {req.sub}</span>}
                </Row>
                <Row label="Tanggal">
                  <span className="tabular-nums">{rangeLabel(req.start, req.end)}</span>
                </Row>
                {isJamKerja(req.jenis) ? (
                  <Row label={req.jenis === 'Izin Terlambat' ? 'Perkiraan jam datang' : 'Jam pulang'}>
                    <span className="font-medium tabular-nums">{req.jam}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">Tanpa potong gaji dan tanpa potong saldo cuti. Kuota gabungan Terlambat + Pulang Cepat 4 kali per bulan.</span>
                  </Row>
                ) : (
                  <Row label="Hari kerja">
                    <span className="font-medium tabular-nums">{req.hari} hari</span>
                  </Row>
                )}
                {req.tujuan && <Row label="Tujuan dinas">{req.tujuan}</Row>}
                {req.jenis === 'Sakit' && req.kategori && canSeeKategori && <Row label="Kategori sakit">{req.kategori}</Row>}
                {req.jenis === 'Izin' && (
                  <Row label="Potongan gaji">
                    <span>
                      Dipotong seperti Alfa: (Gaji Pokok + Tunjangan Jabatan) ÷ {pembagiOf(emp.kelompok, emp.level)} per hari
                    </span>
                    {user.role !== 'supervisor' && (
                      <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                        Rp {Math.round((emp.gajiPokok + emp.tunjanganTetap) / pembagiOf(emp.kelompok, emp.level)).toLocaleString('id-ID')} per hari × {req.hari} hari = Rp{' '}
                        {(Math.round((emp.gajiPokok + emp.tunjanganTetap) / pembagiOf(emp.kelompok, emp.level)) * req.hari).toLocaleString('id-ID')}
                      </span>
                    )}
                  </Row>
                )}
                {bal && (
                  <Row label="Saldo cuti tahunan">
                    {!cancelling && (
                      <span className="tabular-nums">
                        Sisa saat ini {bal.sisa} hari → setelah disetujui{' '}
                        <span className="font-medium">{bal.sisa} hari</span>
                      </span>
                    )}
                    {cancelling && <span className="tabular-nums">Sisa saat ini {bal.sisa} hari</span>}
                    {isPending(req.status) && (
                      <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                        {req.hari} hari yang Dipesan menjadi Terpakai. Jika ditolak, Sisa kembali menjadi {bal.sisa + req.hari} hari.
                      </span>
                    )}
                    {cancelling && (
                      <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                        Jika pembatalan disetujui, Terpakai berkurang {req.hari} hari dan Sisa menjadi {bal.sisa + req.hari} hari.
                      </span>
                    )}
                  </Row>
                )}
              </dl>
              <section className="space-y-1">
                <h3 className="text-sm font-medium">Alasan</h3>
                <p className="text-sm text-muted-foreground">{req.alasan}</p>
              </section>
              <section className="space-y-1">
                <h3 className="text-sm font-medium">{surat}</h3>
                {req.lampiran ? (
                  verify ? (
                    <div className="flex items-center gap-3 rounded-md border bg-muted/50 p-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card"><FileText className="size-5 text-muted-foreground" aria-hidden /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{req.lampiran}</p>
                        <p className="text-xs text-muted-foreground">Pratinjau dokumen{simLabel ? ' (simulasi)' : ''}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => toast.info(`Pratinjau ${req.lampiran}${simLabel ? ' (simulasi)' : ''}`)}>Buka</Button>
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 text-sm">
                      <Paperclip className="size-4 text-muted-foreground" aria-hidden />
                      <button
                        type="button"
                        className="rounded-sm underline underline-offset-4 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        onClick={() => toast.info(`Pratinjau ${req.lampiran}${simLabel ? ' (simulasi)' : ''}`)}
                      >
                        {req.lampiran}
                      </button>
                    </p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Tidak ada lampiran</p>
                )}
              </section>
              <section className="space-y-1">
                <h3 className="text-sm font-medium">Ketersediaan tim</h3>
                <p className="text-sm text-muted-foreground">
                  Pegawai lain di {teamLabel(emp)} yang tidak hadir pada tanggal ini:{' '}
                  <span className={cover.length ? 'font-medium text-foreground' : undefined}>{cover.length ? cover.join(', ') : 'Tidak ada'}</span>
                </p>
              </section>
              {req.decision && (
                <section className="space-y-1">
                  <h3 className="text-sm font-medium">
                    {req.status === 'ditolak' && !req.verif ? 'Ditolak' : req.status === 'dibatalkan' && !req.pembatalan ? 'Dibatalkan' : 'Disetujui Atasan'} oleh {req.decision.by}
                  </h3>
                  <p className="text-xs text-muted-foreground tabular-nums">{req.decision.at}</p>
                  {req.decision.alasan && <p className="text-sm text-muted-foreground">Alasan: {req.decision.alasan}</p>}
                </section>
              )}
              {req.verif && (
                <section className="space-y-1">
                  <h3 className="text-sm font-medium">{req.verif.hasil === 'disetujui' ? 'Diverifikasi HRD' : 'Dikembalikan HRD'} oleh {req.verif.by}</h3>
                  <p className="text-xs text-muted-foreground tabular-nums">{req.verif.at}</p>
                  {req.verif.alasan && <p className="text-sm text-muted-foreground">Alasan: {req.verif.alasan}</p>}
                </section>
              )}
              {req.pembatalan && (
                <section className="space-y-1">
                  <h3 className="text-sm font-medium">Pembatalan diajukan oleh {req.pembatalan.by}</h3>
                  <p className="text-xs text-muted-foreground tabular-nums">{req.pembatalan.at}</p>
                  <p className="text-sm text-muted-foreground">Alasan: {req.pembatalan.alasan}</p>
                  {req.pembatalan.keputusan && (
                    <p className="text-sm text-muted-foreground">
                      Pembatalan {req.pembatalan.keputusan.hasil} oleh {req.pembatalan.keputusan.by}
                      {req.pembatalan.keputusan.alasan ? ` · ${req.pembatalan.keputusan.alasan}` : ''}
                    </p>
                  )}
                </section>
              )}
              {req.riwayat && req.riwayat.length > 0 && (
                <section className="space-y-1">
                  <h3 className="text-sm font-medium">Riwayat</h3>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {[...req.riwayat].reverse().map((h, i) => <li key={i} className="tabular-nums">{h.at} · {h.by}: {h.action}</li>)}
                  </ul>
                </section>
              )}
              {needKategori && (
                <section className="space-y-2">
                  <Label htmlFor="sakit-kategori">Kategori sakit <span className="text-danger">*</span></Label>
                  <Select value={kategori} onValueChange={setKategori}>
                    <SelectTrigger id="sakit-kategori" className="w-full"><SelectValue placeholder="Pilih kategori dari surat dokter" /></SelectTrigger>
                    <SelectContent>
                      {activeSickCategories().map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Hanya terlihat HR Personalia dan HR & GA Manager.</p>
                </section>
              )}
              {decide && (
                <AlasanField id="cuti-tolak" label={verify ? 'Alasan pengembalian' : cancelling ? 'Alasan penolakan pembatalan' : 'Alasan penolakan'} value={alasan} onChange={(v) => { setAlasan(v); setError('') }} error={error} placeholder="Tulis alasan jika pengajuan ditolak…" />
              )}
            </div>
            {decide && (
              <SheetFooter className="flex-row justify-end gap-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!validAlasan(alasan)) return setError(ALASAN_ERROR)
                    setConfirm(true)
                  }}
                >
                  {verify ? 'Kembalikan' : cancelling ? 'Tolak Pembatalan' : 'Tolak'}
                </Button>
                <Button disabled={needKategori && !kategori} onClick={() => (verify ? onVerify(req, kategori || undefined) : onApprove(req))}>{verify ? 'Verifikasi' : cancelling ? 'Setujui Pembatalan' : 'Setujui'}</Button>
              </SheetFooter>
            )}
            <AlertDialog open={confirm} onOpenChange={setConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{verify ? `Kembalikan pengajuan ${req.no}?` : cancelling ? `Tolak pembatalan ${req.no}?` : `Tolak pengajuan ${req.no}?`}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {verify ? 'Pengajuan menjadi Ditolak. ' : cancelling ? 'Cuti tetap Disetujui. ' : req.jenis === 'Cuti Tahunan' ? `${req.hari} hari yang dipesan dikembalikan ke saldo. ` : ''}
                    Alasan dicatat: “{alasan.trim()}”.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => (verify ? onGiveBack(req, alasan.trim()) : onReject(req, alasan.trim()))}>
                    {verify ? 'Kembalikan' : cancelling ? 'Tolak Pembatalan' : 'Tolak Pengajuan'}
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

export function CancelDialog({
  req,
  onClose,
  onConfirm,
}: {
  req: LeaveRequest | null
  onClose: () => void
  onConfirm: (r: LeaveRequest, alasan: string) => void
}) {
  const [alasan, setAlasan] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    setAlasan('')
    setError('')
  }, [req?.no])
  return (
    <AlertDialog open={req !== null} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan pengajuan {req?.no}?</AlertDialogTitle>
          <AlertDialogDescription>
            {req && `${empOf(req.nik).nama} · ${req.jenis} · ${rangeLabel(req.start, req.end)}.`}{' '}
            {req?.jenis === 'Cuti Tahunan' && `${req.hari} hari yang dipesan langsung dikembalikan ke saldo. `}
            Pengajuan yang dibatalkan tidak bisa diaktifkan lagi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlasanField id="cuti-batal" label="Alasan pembatalan" value={alasan} onChange={(v) => { setAlasan(v); setError('') }} error={error} />
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              if (!validAlasan(alasan)) return setError(ALASAN_ERROR)
              if (req) onConfirm(req, alasan.trim())
            }}
          >
            Batalkan Pengajuan
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Dialog "Ajukan Pembatalan" untuk Cuti Tahunan/Khusus yang sudah Disetujui dan belum dimulai. */
export function RequestCancelDialog({ req, onClose, onConfirm }: { req: LeaveRequest | null; onClose: () => void; onConfirm: (r: LeaveRequest, alasan: string) => void }) {
  const [alasan, setAlasan] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    setAlasan('')
    setError('')
  }, [req?.no])
  return (
    <AlertDialog open={req !== null} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ajukan pembatalan {req?.no}?</AlertDialogTitle>
          <AlertDialogDescription>
            {req && `${empOf(req.nik).nama} · ${req.jenis} · ${rangeLabel(req.start, req.end)}.`} Pembatalan menunggu persetujuan Atasan.
            {req?.jenis === 'Cuti Tahunan' && ` Setelah disetujui, ${req.hari} hari dikembalikan ke saldo.`} Jika ditolak, cuti tetap Disetujui.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlasanField id="cuti-ajukan-batal" label="Alasan pembatalan" value={alasan} onChange={(v) => { setAlasan(v); setError('') }} error={error} />
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <Button
            onClick={() => {
              if (!validAlasan(alasan)) return setError(ALASAN_ERROR)
              if (req) onConfirm(req, alasan.trim())
            }}
          >
            Ajukan Pembatalan
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
