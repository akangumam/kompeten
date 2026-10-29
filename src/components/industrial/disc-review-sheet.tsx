import { useEffect, useState } from 'react'
import { FileText, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { DiscJenisBadge, DiscStatusCell } from '@/components/industrial/shared'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { activeSp, canReviewDisc, hasLetter, statusOf, violationOf, type Disc } from '@/data/discipline'
import { personOf } from '@/data/offboarding'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { AlasanField } from '@/components/ui/alasan-field'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export function DiscReviewSheet({ disc, mode, user, onClose, onApprove, onReject, onLetter }: { disc: Disc | null; mode: 'review' | 'detail'; user: CurrentUser; onClose: () => void; onApprove: (d: Disc) => void; onReject: (d: Disc, alasan: string) => void; onLetter: (d: Disc) => void }) {
  const [alasan, setAlasan] = useState('')
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  useEffect(() => { setAlasan(''); setError(''); setConfirm(false) }, [disc?.id, mode])
  const p = disc ? personOf(disc.nik) : undefined
  const decide = mode === 'review' && !!disc && canReviewDisc(disc, user)
  const act = disc ? activeSp(disc.nik) : null
  return (
    <Sheet open={disc !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {disc && p && (
          <>
            <SheetHeader>
              <SheetTitle>{decide ? 'Tinjau Catatan Disiplin' : 'Detail Catatan Disiplin'} · {disc.id}</SheetTitle>
              <SheetDescription className="tabular-nums">{p.nama} · {p.nik} · {p.department}</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4">
              <div className="flex flex-wrap items-start gap-3">
                <DiscJenisBadge jenis={disc.jenis} />
                <DiscStatusCell d={disc} />
                <p className="text-sm text-muted-foreground">Diajukan oleh <span className="font-medium text-foreground">{disc.diajukan.by}</span> · <span className="tabular-nums">{disc.diajukan.at}</span></p>
              </div>
              {decide && user.role === 'manager' && disc.diajukan.nik && <p className="rounded-md border border-info/20 bg-info/10 px-3 py-2 text-sm text-info">Diajukan oleh {disc.diajukan.by}; keputusan akhir ada pada HR & GA Manager.</p>}
              {disc.step && (
                <section className="space-y-2" aria-label="Alur persetujuan">
                  <h3 className="text-sm font-medium">Alur persetujuan</h3>
                  <div className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">HR & GA Manager: {disc.step.person}</p>
                      {disc.step.alasan && <p className="text-xs text-muted-foreground">Alasan: {disc.step.alasan}</p>}
                    </div>
                    <span className={cn('shrink-0 text-xs tabular-nums', disc.step.status === 'disetujui' ? 'text-success' : disc.step.status === 'ditolak' ? 'text-danger' : 'text-muted-foreground')}>
                      {disc.step.status === 'disetujui' ? `Disetujui · ${disc.step.at}` : disc.step.status === 'ditolak' ? `Ditolak · ${disc.step.at}` : disc.status === 'menunggu' ? 'Menunggu' : '—'}
                    </span>
                  </div>
                </section>
              )}
              <dl className="space-y-3 rounded-md border p-4">
                <Row label="Pelanggaran"><span className="font-medium">{violationOf(disc)}</span></Row>
                <Row label="Tanggal kejadian"><span className="tabular-nums">{formatDate(disc.kejadian)}</span></Row>
                {disc.panggilan && <Row label="Panggilan">Ke-{disc.panggilan.ke} · hadir paling lambat <span className="tabular-nums">{formatDate(disc.panggilan.hadir)}</span>{disc.panggilan.tanggapan && <> · {disc.panggilan.tanggapan === 'hadir' ? 'Hadir' : 'Tidak hadir'}</>}</Row>}
                {hasLetter(disc.jenis) && <Row label="Nomor surat"><span className="tabular-nums">{disc.suratNo || 'Belum terbit'}</span></Row>}
                {disc.terbit && disc.jenis !== 'Surat Panggilan' && <Row label="Terbit · berlaku s/d"><span className="tabular-nums">{formatDate(disc.terbit)} · {formatDate(disc.berlakuSampai!)}</span></Row>}
                {disc.tandaTerima && (
                  <Row label="Tanda terima">
                    {disc.tandaTerima.menolak ? <>Menolak tanda tangan, saksi {disc.tandaTerima.saksi}</> : <>Diterima {formatDate(disc.tandaTerima.tanggal!)}</>}
                    <span className="block text-xs text-muted-foreground">Dicatat {disc.tandaTerima.oleh} · {disc.tandaTerima.at}</span>
                  </Row>
                )}
              </dl>
              <section className="space-y-1"><h3 className="text-sm font-medium">Kronologi</h3><p className="text-sm text-muted-foreground">{disc.kronologi}</p></section>
              {disc.pasal && <section className="space-y-1"><h3 className="text-sm font-medium">Pasal PP/PKB</h3><p className="text-sm text-muted-foreground">{disc.pasal}</p></section>}
              {disc.catatanLevel && <section className="space-y-1"><h3 className="text-sm font-medium">Catatan tingkat</h3><p className="text-sm text-muted-foreground">{disc.catatanLevel}</p></section>}
              {act && act.disc.id !== disc.id && <p className="text-sm text-muted-foreground">SP aktif lain: {act.disc.jenis} s/d {formatDate(act.disc.berlakuSampai!)}</p>}
              <section className="space-y-1">
                <h3 className="text-sm font-medium">Lampiran bukti</h3>
                {disc.lampiran ? (
                  <p className="flex items-center gap-2 text-sm"><Paperclip className="size-4 text-muted-foreground" aria-hidden />
                    <button type="button" className="rounded-sm underline underline-offset-4 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={() => toast.info(`Pratinjau ${disc.lampiran} (simulasi)`)}>{disc.lampiran}</button>
                  </p>
                ) : <p className="text-sm text-muted-foreground">Tidak ada lampiran</p>}
              </section>
              {hasLetter(disc.jenis) && (
                <section className="flex items-center justify-between gap-3 rounded-md border bg-muted/50 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{disc.jenis === 'Surat Panggilan' ? 'Surat Panggilan' : 'Surat'}</p>
                    <p className="truncate text-xs text-muted-foreground tabular-nums">{disc.suratNo || 'Nomor definitif terbit saat disetujui'}{disc.status === 'aktif' ? '' : ' · DRAFT'}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onLetter(disc)}><FileText /> Pratinjau Surat</Button>
                </section>
              )}
              {disc.keputusan && (disc.status === 'ditolak' || disc.status === 'dibatalkan') && (
                <section className="space-y-1">
                  <h3 className="text-sm font-medium">{disc.status === 'ditolak' ? 'Ditolak' : 'Dibatalkan'} oleh {disc.keputusan.by}</h3>
                  <p className="text-xs text-muted-foreground tabular-nums">{disc.keputusan.at}</p>
                  {disc.keputusan.alasan && <p className="text-sm text-muted-foreground">Alasan: {disc.keputusan.alasan}</p>}
                </section>
              )}
              {statusOf(disc) === 'kedaluwarsa' && <p className="text-sm text-muted-foreground">Masa berlaku berakhir {formatDate(disc.berlakuSampai!)}; tidak lagi dihitung sebagai SP aktif.</p>}
              {decide && (
                <AlasanField id="dsc-tolak" label="Alasan penolakan" required={false} value={alasan} onChange={(v) => { setAlasan(v); setError('') }} error={error} placeholder="Tulis alasan jika catatan ditolak…" />
              )}
            </div>
            {decide && (
              <SheetFooter className="flex-row justify-end gap-2">
                <Button variant="destructive" onClick={() => (validAlasan(alasan) ? setConfirm(true) : setError(ALASAN_ERROR))}>Tolak</Button>
                <Button onClick={() => onApprove(disc)}>Setujui</Button>
              </SheetFooter>
            )}
            <AlertDialog open={confirm} onOpenChange={setConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tolak catatan {disc.id}?</AlertDialogTitle>
                  <AlertDialogDescription>Surat tidak diterbitkan. Alasan dicatat: “{alasan.trim()}”.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => onReject(disc, alasan.trim())}>Tolak Catatan</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
