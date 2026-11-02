import { useEffect, useMemo, useState } from 'react'
import { CircleCheck, CircleX, Info, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { SourceBadge } from '@/components/mobile/source-badge'
import { Pager, usePaging } from '@/components/attendance/pager'
import { AlasanField } from '@/components/ui/alasan-field'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { initials } from '@/data/candidates'
import { ROSTER, type DraftForm } from '@/data/employees'
import { maskRekening } from '@/data/payroll/salaries'
import {
  applyToForm,
  changedLabels,
  currentOf,
  decideChange,
  FIELD_LABEL,
  fmtHp,
  hasRekening,
  PCS,
  REKENING_BERLAKU_LABEL,
  usePcs,
  type ChangeField,
  type ProfileChange,
} from '@/data/profile-changes'
import { formatDate } from '@/lib/format'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'

const head = 'text-xs font-medium text-muted-foreground'
const empOf = (nik: string) => ROSTER.find((e) => e.nik === nik)

const STATUS = {
  'menunggu-verifikasi': { v: 'warning', t: 'Menunggu Verifikasi' },
  disetujui: { v: 'success', t: 'Disetujui' },
  ditolak: { v: 'danger', t: 'Ditolak' },
} as const

export function ProfileChangeTab({
  actor,
  formOf,
  onApply,
}: {
  actor: string
  formOf: (nik: string) => DraftForm | undefined
  onApply: (nik: string, apply: (f: DraftForm) => DraftForm) => void
}) {
  usePcs()
  const [open, setOpen] = useState<string | null>(null)
  const rows = [...PCS].sort((a, b) => (a.status === 'menunggu-verifikasi' ? 0 : 1) - (b.status === 'menunggu-verifikasi' ? 0 : 1) || b.diajukan.localeCompare(a.diajukan) || b.id.localeCompare(a.id))
  const paging = usePaging(rows, 'pcs', 10)
  const active = PCS.find((c) => c.id === open) ?? null
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={head}>Pegawai</TableHead>
            <TableHead className={head}>Field diubah</TableHead>
            <TableHead className={head}>Diajukan</TableHead>
            <TableHead className={head}>Status</TableHead>
            <TableHead className={`text-right ${head}`}>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">Belum ada pengajuan perubahan data.</TableCell></TableRow>
          )}
          {paging.rows.map((c) => {
            const e = empOf(c.nik)
            return (
              <TableRow key={c.id} className="h-12 hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8"><AvatarFallback className="bg-muted text-xs font-semibold text-foreground">{initials(e?.nama ?? c.nik)}</AvatarFallback></Avatar>
                    <div className="flex flex-col leading-tight">
                      <span className="whitespace-nowrap font-medium">{e?.nama}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{c.nik} · {c.id}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {changedLabels(c).map((l) => <Badge key={l} variant="secondary">{l}</Badge>)}
                    <SourceBadge sumber={c.sumber} />
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{formatDate(c.diajukan)}</TableCell>
                <TableCell><StatusBadge variant={STATUS[c.status].v}>{STATUS[c.status].t}</StatusBadge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setOpen(c.id)} aria-label={`${c.status === 'menunggu-verifikasi' ? 'Tinjau' : 'Lihat'} perubahan ${c.id} ${e?.nama}`}>
                    {c.status === 'menunggu-verifikasi' ? 'Tinjau' : 'Lihat'}
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <Pager total={rows.length} paging={paging} />
      <ReviewSheet change={active} actor={actor} form={active ? formOf(active.nik) : undefined} onClose={() => setOpen(null)} onApply={onApply} />
    </div>
  )
}

function ReviewSheet({
  change,
  actor,
  form,
  onClose,
  onApply,
}: {
  change: ProfileChange | null
  actor: string
  form: DraftForm | undefined
  onClose: () => void
  onApply: (nik: string, apply: (f: DraftForm) => DraftForm) => void
}) {
  const [alasan, setAlasan] = useState('')
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(false)
  useEffect(() => { setAlasan(''); setErr(''); setConfirm(false) }, [change?.id])

  const e = change ? empOf(change.nik) : undefined
  const lines = useMemo(() => {
    if (!change || !form) return []
    const out: { key: string; label: string; now: string; next: string }[] = []
    const fields = Object.keys(change.perubahan) as ChangeField[]
    for (const f of fields) {
      if (f === 'bank' || f === 'rekening') {
        if (out.some((x) => x.key === 'rekening')) continue
        out.push({
          key: 'rekening',
          label: 'Rekening',
          now: maskRekening(form.bank, form.rekening),
          next: maskRekening(change.perubahan.bank ?? form.bank, change.perubahan.rekening ?? form.rekening),
        })
      } else if (f === 'rekeningNama') {
        out.push({ key: f, label: FIELD_LABEL[f], now: form.rekeningNama, next: change.perubahan[f] ?? '' })
      } else {
        const hp = f === 'hp' || f === 'daruratHp'
        out.push({ key: f, label: FIELD_LABEL[f], now: hp ? fmtHp(currentOf(form, f)) : currentOf(form, f), next: hp ? fmtHp(change.perubahan[f] ?? '') : (change.perubahan[f] ?? '') })
      }
    }
    return out
  }, [change, form])

  if (!change || !e) return <Sheet open={false}><SheetContent /></Sheet>
  const review = change.status === 'menunggu-verifikasi'
  const approve = () => {
    decideChange(change.id, true, actor)
    onApply(change.nik, (f) => applyToForm(f, change))
    toast.success(`Perubahan ${change.id} untuk ${e.nama} disetujui, data pegawai diperbarui`)
    onClose()
  }
  const reject = () => {
    decideChange(change.id, false, actor, alasan.trim())
    toast.success(`Perubahan ${change.id} untuk ${e.nama} ditolak`)
    onClose()
  }
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{review ? 'Tinjau Perubahan Data' : 'Detail Perubahan Data'} · {change.id}</SheetTitle>
          <SheetDescription className="tabular-nums">{e.nama} · {e.nik}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={STATUS[change.status].v}>{STATUS[change.status].t}</StatusBadge>
            <SourceBadge sumber={change.sumber} />
            <p className="text-sm text-muted-foreground">Diajukan <span className="tabular-nums">{formatDate(change.diajukan)}</span></p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Field</TableHead>
                <TableHead className={head}>Data sekarang</TableHead>
                <TableHead className={head}>Usulan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.key} className="hover:bg-transparent">
                  <TableCell className="align-top text-sm text-muted-foreground">{l.label}</TableCell>
                  <TableCell className="whitespace-normal align-top text-sm tabular-nums">{l.now || '—'}</TableCell>
                  <TableCell className="whitespace-normal align-top text-sm font-medium tabular-nums">{l.next}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <section className="space-y-1">
            <h3 className="text-sm font-medium">Alasan pegawai</h3>
            <p className="text-sm text-muted-foreground">{change.alasan}</p>
          </section>
          {change.lampiran && (
            <Button variant="outline" size="sm" onClick={() => toast.info(`Membuka lampiran ${change.lampiran}`)}>
              <Paperclip className="size-4" />
              Lihat lampiran
            </Button>
          )}
          {hasRekening(change) && (
            <p className="flex items-start gap-2 rounded-md border border-info/20 bg-info/10 px-3 py-2 text-sm text-info">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              Berlaku mulai {REKENING_BERLAKU_LABEL}. Periode yang sudah ditarik/Final tetap memakai rekening lama.
            </p>
          )}
          {change.keputusan && (
            <section className="space-y-1">
              <h3 className="flex items-center gap-1.5 text-sm font-medium">
                {change.status === 'disetujui' ? <CircleCheck className="size-4 text-success" aria-hidden /> : <CircleX className="size-4 text-danger" aria-hidden />}
                {change.status === 'disetujui' ? 'Disetujui' : 'Ditolak'} oleh {change.keputusan.by}
              </h3>
              <p className="text-xs text-muted-foreground tabular-nums">{change.keputusan.at}</p>
              {change.keputusan.alasan && <p className="text-sm text-muted-foreground">Alasan: {change.keputusan.alasan}</p>}
            </section>
          )}
          {review && <AlasanField id="pdt-tolak" label="Alasan penolakan" value={alasan} onChange={(v) => { setAlasan(v); setErr('') }} error={err} placeholder="Tulis alasan jika perubahan ditolak…" />}
        </div>
        {review && (
          <SheetFooter className="flex-row justify-end gap-2">
            <Button variant="destructive" onClick={() => (validAlasan(alasan) ? setConfirm(true) : setErr(ALASAN_ERROR))}>Tolak</Button>
            <Button onClick={approve}>Setujui</Button>
          </SheetFooter>
        )}
        <AlertDialog open={confirm} onOpenChange={setConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tolak perubahan {change.id}?</AlertDialogTitle>
              <AlertDialogDescription>Data {e.nama} tidak berubah. Alasan dicatat: “{alasan.trim()}”.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={reject}>Tolak Perubahan</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  )
}
