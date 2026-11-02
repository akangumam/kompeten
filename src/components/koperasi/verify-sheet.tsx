import { CircleCheck, CircleX } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { Meta, ReviewSheet } from '@/components/koperasi/shared'
import { SourceBadge } from '@/components/mobile/source-badge'
import { Textarea } from '@/components/ui/textarea'
import { blockReason, forwardToKetua, rejectBySekretaris, type AppKind, type Check } from '@/data/koperasi/mobile'

const NAMA: Record<AppKind, string> = { kasbon: 'Kasbon', pinjaman: 'Pinjaman', pencairan: 'Pencairan', pendaftaran: 'Pendaftaran' }

/** Sheet "Verifikasi pengajuan anggota" untuk Sekretaris: data read-only, checklist dihitung ulang, lalu Teruskan ke Ketua atau Tolak. */
export function VerifySheet({
  kind, id, who, diajukan, oleh, rows, checks, actor, onClose,
}: {
  kind: AppKind
  id: string
  who: string
  diajukan: string
  oleh: string
  rows: [string, ReactNode][]
  checks: Check[]
  actor: string
  onClose: () => void
}) {
  const [catatan, setCatatan] = useState('')
  const block = blockReason(checks)
  return (
    <ReviewSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Verifikasi pengajuan anggota · ${id}`}
      description={`${NAMA[kind]} dari aplikasi · ${who}`}
      diajukan={diajukan}
      oleh={oleh}
      note={null}
      approveLabel="Teruskan ke Ketua"
      approveDisabled={block || undefined}
      rejectTitle={`Tolak ${id}?`}
      onApprove={() => { forwardToKetua(kind, id, catatan, actor); toast.success(`${id} diteruskan ke Ketua`); onClose() }}
      onReject={(a) => { rejectBySekretaris(kind, id, a, actor); toast.success(`${id} ditolak, plafon/saldo dilepas`); onClose() }}
    >
      <div className="flex items-center gap-2"><SourceBadge sumber="aplikasi" /></div>
      <section className="space-y-2" aria-label="Data dari anggota">
        <h3 className="text-sm font-semibold">Data dari anggota</h3>
        <dl className="grid grid-cols-[150px_1fr] gap-x-3 gap-y-2 text-sm">
          {rows.map(([l, v]) => (<div key={l} className="contents"><dt className="text-muted-foreground">{l}</dt><dd className="tabular-nums">{v}</dd></div>))}
        </dl>
      </section>
      <section className="space-y-2" aria-label="Verifikasi Sekretaris">
        <h3 className="text-sm font-semibold">Verifikasi Sekretaris</h3>
        <ul className="space-y-2 text-sm">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? 'flex items-start gap-2 text-success' : 'flex items-start gap-2 text-danger'}>
              {c.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden />}
              <span><span className="font-medium">{c.label}</span>{!c.ok && c.reason ? <span className="block text-xs">{c.reason}</span> : null}</span>
            </li>
          ))}
        </ul>
        <Meta>Syarat dihitung ulang saat verifikasi. Reservasi plafon/saldo berlaku sejak pengajuan dibuat.</Meta>
      </section>
      <Field id="vf-catatan" label="Catatan" helper="Opsional, ikut terlihat oleh Ketua">
        <Textarea id="vf-catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
      </Field>
    </ReviewSheet>
  )
}
