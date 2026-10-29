import { toast } from 'sonner'
import { Compare, Meta, ReviewSheet, rp } from '@/components/koperasi/shared'
import { stageActor } from '@/data/koperasi/ksb'
import { balanceOf } from '@/data/koperasi/ledger'
import { memberOf, POKOK } from '@/data/koperasi/members'
import {
  decideChange, decideRegistration, decideWithdrawal, dipesan, empOf, rekeningOf, saldoSukarela,
  type ChangeReq, type Registration, type Withdrawal,
} from '@/data/koperasi/requests'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'

export function ReviewRegistration({ reg, onClose, actor }: { reg: Registration | null; onClose: () => void; actor: string }) {
  if (!reg) return null
  const first = POKOK + reg.wajib + reg.sukarela
  const note = stageActor('ketua', reg.nik).note
  return (
    <ReviewSheet
      open onOpenChange={(o) => !o && onClose()} title={`Tinjau Pendaftaran · ${reg.nama}`} description={`${reg.id} · ${reg.nik} · ${reg.department}`}
      diajukan={reg.diajukan} oleh={reg.diinputOleh} note={note} rejectTitle={`Tolak pendaftaran ${reg.nama}?`}
      onApprove={() => { decideRegistration(reg.id, true, '', actor); toast.success(`${reg.nama} resmi menjadi anggota sejak ${formatDate(DEMO_TODAY)}`); onClose() }}
      onReject={(a) => { decideRegistration(reg.id, false, a, actor); toast.success(`Pendaftaran ${reg.nama} ditolak`); onClose() }}
    >
      <Compare rows={[
        { label: 'Keanggotaan', lama: 'Bukan anggota', baru: 'Anggota aktif', changed: true },
        { label: 'Status kerja', lama: reg.statusKerja, baru: reg.statusKerja },
        { label: 'Simpanan Pokok', lama: '—', baru: `${rp(POKOK)} (sekali)`, changed: true },
        { label: 'Simpanan Wajib', lama: '—', baru: `${rp(reg.wajib)}/bulan`, changed: true },
        { label: 'Simpanan Sukarela', lama: '—', baru: `${rp(reg.sukarela)}/bulan`, changed: reg.sukarela > 0 },
      ]} />
      <Meta>Potongan payroll pertama setelah disetujui: <span className="font-medium text-foreground tabular-nums">{rp(first)}</span> (Pokok + Wajib + Sukarela).</Meta>
      <Meta>Sekretaris menyatakan pegawai sudah mengisi dan menandatangani formulir pendaftaran.</Meta>
    </ReviewSheet>
  )
}

export function ReviewChange({ req, onClose, actor }: { req: ChangeReq | null; onClose: () => void; actor: string }) {
  if (!req) return null
  const m = memberOf(req.nik)
  const note = stageActor('sekretaris', req.nik).note
  return (
    <ReviewSheet
      open onOpenChange={(o) => !o && onClose()} title={`Tinjau Perubahan Setoran · ${m?.nama ?? req.nik}`} description={`${req.id} · Simpanan ${req.jenis}`}
      diajukan={req.diajukan} oleh={req.oleh} note={note} rejectTitle="Tolak perubahan setoran?"
      onApprove={() => { decideChange(req.id, true, '', actor); toast.success(`Perubahan Simpanan ${req.jenis} disetujui · berlaku ${formatDate(req.berlaku)}`); onClose() }}
      onReject={(a) => { decideChange(req.id, false, a, actor); toast.success('Perubahan setoran ditolak'); onClose() }}
    >
      <Compare rows={[
        { label: `Simpanan ${req.jenis}`, lama: `${rp(req.lama)}/bulan`, baru: `${rp(req.baru)}/bulan`, changed: true },
        { label: 'Berlaku mulai', lama: '—', baru: formatDate(req.berlaku) },
      ]} />
      <div className="space-y-1 text-sm"><p className="font-medium">Alasan</p><p className="text-muted-foreground">{req.alasan}</p></div>
      <Meta>Periode sebelum {formatDate(req.berlaku)} tetap memakai nilai lama.</Meta>
    </ReviewSheet>
  )
}

export function ReviewWithdrawal({ w, onClose, actor }: { w: Withdrawal | null; onClose: () => void; actor: string }) {
  if (!w) return null
  const emp = empOf(w.nik)
  const note = stageActor('ketua', w.nik).note
  const saldo = saldoSukarela(w.nik)
  const before = saldo - (dipesan(w.nik) - w.nominal)
  return (
    <ReviewSheet
      open onOpenChange={(o) => !o && onClose()} title={`Tinjau Pencairan · ${emp?.nama ?? w.nik}`} description={`${w.id} · Simpanan Sukarela`}
      diajukan={w.diajukan} oleh={w.diinputOleh} note={note} rejectTitle={`Tolak pencairan ${w.id}?`}
      onApprove={() => { decideWithdrawal(w.id, true, '', actor); toast.success(`${w.id} disetujui, menunggu pencairan Bendahara`); onClose() }}
      onReject={(a) => { decideWithdrawal(w.id, false, a, actor); toast.success(`${w.id} ditolak · saldo ${rp(w.nominal)} dilepas`); onClose() }}
    >
      <Compare rows={[
        { label: 'Saldo sukarela', lama: rp(saldo), baru: rp(saldo - w.nominal), changed: true },
        { label: 'Nominal pencairan', lama: '—', baru: rp(w.nominal), changed: true },
        { label: 'Rekening tujuan', lama: '—', baru: rekeningOf(w.nik).masked },
      ]} />
      <p className="rounded-lg border bg-muted/50 p-3 text-sm tabular-nums">
        Tersedia sebelum pengajuan <span className="font-medium">{rp(before)}</span> → setelah dicairkan <span className="font-medium">{rp(before - w.nominal)}</span>
      </p>
      <div className="space-y-1 text-sm"><p className="font-medium">Alasan</p><p className="text-muted-foreground">{w.alasan}</p></div>
      <Meta>Saldo Wajib dan Pokok tidak berubah ({rp(balanceOf(w.nik).Wajib + balanceOf(w.nik).Pokok)}).</Meta>
    </ReviewSheet>
  )
}
