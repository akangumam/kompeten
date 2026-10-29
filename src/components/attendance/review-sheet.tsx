import { useEffect, useState } from 'react'
import { Paperclip } from 'lucide-react'
import { DayStatus } from '@/components/attendance/day-status'
import { recordTitle } from '@/components/attendance/log-sheet'
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
import { approverOf, describe, empByNik, escalationLabel, escalationOf, SHIFTS, toMin, type DayRecord } from '@/data/attendance'
import { atasanOf } from '@/data/employees'
import type { CurrentUser } from '@/data/users'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { AlasanField } from '@/components/ui/alasan-field'

const fmt = (v: string | null, next?: boolean) => (v ? `${v}${next ? ' (+1)' : ''}` : '—')

export function ReviewSheet({
  rec,
  user,
  onClose,
  onApprove,
  onReject,
}: {
  rec: DayRecord | null
  user: CurrentUser
  onClose: () => void
  onApprove: (rec: DayRecord) => void
  onReject: (rec: DayRecord, alasan: string) => void
}) {
  const [alasan, setAlasan] = useState('')
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    setAlasan('')
    setError('')
    setConfirm(false)
  }, [rec?.id])

  const c = rec?.pending
  const emp = empByNik(rec?.nik ?? null)
  const sh = rec?.shift ? SHIFTS[rec.shift] : null
  // Atasan yang diwakili Manager: atasan pegawai, atau atasan si pengaju bila pengajunya sendiri approver.
  const proxyFor = c && emp ? (approverOf(c) === 'supervisor' ? atasanOf(emp) : escalationOf(c)) : undefined

  let before: ReturnType<typeof describe> | null = null
  let after: ReturnType<typeof describe> | null = null
  let afterNext = false
  if (rec && c) {
    before = describe({ ...rec, pending: undefined })
    afterNext = rec.shift === 'malam' && toMin(c.pulang) < 720
    after = describe({ ...rec, masuk: c.masuk, pulang: c.pulang, pulangNext: afterNext, pending: undefined, corrected: true })
  }

  const rows =
    rec && c && before && after
      ? [
          { label: 'Jam Masuk', a: fmt(rec.masuk), b: fmt(c.masuk), changed: rec.masuk !== c.masuk },
          { label: 'Jam Pulang', a: fmt(rec.pulang, rec.pulangNext), b: fmt(c.pulang, afterNext), changed: rec.pulang !== c.pulang || rec.pulangNext !== afterNext },
        ]
      : []

  return (
    <Sheet open={rec !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {rec && c && before && after && (
          <>
            <SheetHeader>
              <SheetTitle>Tinjau Koreksi · {recordTitle(rec)}</SheetTitle>
              <SheetDescription className="tabular-nums">
                {emp ? `${emp.nama} · ${emp.nik} · ${emp.department}` : recordTitle(rec)} · {formatDate(rec.date)}
                {sh && ` · Shift ${sh.label}`}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4">
              <p className="text-sm text-muted-foreground">
                Diajukan oleh <span className="font-medium text-foreground">{c.by}</span> · <span className="tabular-nums">{c.at}</span>
              </p>
              {user.role === 'manager' && proxyFor && proxyFor.id !== 'manager' && (
                <p className="rounded-md border border-info/20 bg-info/10 px-3 py-2 text-sm text-info">
                  Anda menyetujui mewakili {proxyFor.nama}
                </p>
              )}
              {c.role === 'supervisor' && (
                <p className="rounded-md border border-info/20 bg-info/10 px-3 py-2 text-sm text-info">
                  Diteruskan ke {escalationLabel(c)} karena diajukan oleh approver
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                {(['Data mesin', 'Usulan koreksi'] as const).map((title, i) => (
                  <section key={title} className="space-y-3 rounded-md border p-4">
                    <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
                    {rows.map((r) => (
                      <div key={r.label} className="space-y-0.5">
                        <div className="text-xs text-muted-foreground">{r.label}</div>
                        <div className={cn('text-sm tabular-nums', i === 1 && r.changed && 'font-medium')}>{i === 0 ? r.a : r.b}</div>
                      </div>
                    ))}
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Status hasil</div>
                      <DayStatus badges={(i === 0 ? before! : after!).badges} />
                    </div>
                  </section>
                ))}
              </div>
              <section className="space-y-1">
                <h3 className="text-sm font-medium">Alasan</h3>
                <p className="text-sm text-muted-foreground">{c.alasan}</p>
              </section>
              <section className="space-y-1">
                <h3 className="text-sm font-medium">Lampiran</h3>
                {c.lampiran ? (
                  <p className="flex items-center gap-2 text-sm">
                    <Paperclip className="size-4 text-muted-foreground" aria-hidden />
                    {c.lampiran}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Tidak ada lampiran</p>
                )}
              </section>
              <AlasanField id="tinjau-alasan" label="Alasan penolakan" value={alasan} onChange={(v) => { setAlasan(v); setError('') }} error={error} placeholder="Tulis alasan jika koreksi ditolak…" />
            </div>
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
              <Button onClick={() => onApprove(rec)}>Setujui</Button>
            </SheetFooter>
            <AlertDialog open={confirm} onOpenChange={setConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tolak koreksi {recordTitle(rec)}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Status kembali seperti sebelum koreksi diajukan. Alasan penolakan dicatat di audit: “{alasan.trim()}”.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => onReject(rec, alasan.trim())}>
                    Tolak Koreksi
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
