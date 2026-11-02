import { useEffect, useMemo, useState } from 'react'
import { DEMO_TODAY } from '@/lib/today'
import { ArrowRight, CircleCheck, CircleX } from 'lucide-react'
import { DatePicker } from '@/components/employee/date-picker'
import { descId, Field } from '@/components/employee/field'
import { EmployeeCombobox } from '@/components/shift/employee-combobox'
import type { NewSwap } from '@/components/shift/use-shift-swaps'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { isPeriodClosed, periodOf } from '@/data/leave'
import {
  levelOf,
  partnersFor,
  personIssues,
  restAround,
  restError,
  restSummary,
  SCHEDULED,
  sectionOf,
  shiftLine,
  shiftOn,
  SHIFT_LABEL,
  type Ctx,
} from '@/data/shift-schedule'
import type { WorkShift } from '@/data/shift-swaps'
import { formatDate } from '@/lib/format'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { AlasanField } from '@/components/ui/alasan-field'

export function AjukanSwapSheet({
  open,
  onOpenChange,
  ctx,
  octClosed,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  ctx: Ctx
  octClosed: boolean
  onSubmit: (input: NewSwap) => void
}) {
  const [date, setDate] = useState('')
  const [nikA, setNikA] = useState('')
  const [nikB, setNikB] = useState('')
  const [alasan, setAlasan] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setDate(''); setNikA(''); setNikB(''); setAlasan(''); setTouched(false)
    }
  }, [open])

  const a = SCHEDULED.find((e) => e.nik === nikA)
  const partners = useMemo(() => (a && date ? partnersFor(a, date, ctx) : []), [a, date, ctx])
  const b = partners.find((e) => e.nik === nikB)

  useEffect(() => {
    if (nikB && !b) setNikB('')
  }, [nikB, b])

  const dateError = !date
    ? ''
    : date < DEMO_TODAY
      ? 'Tanggal tidak boleh sebelum hari ini.'
      : isPeriodClosed(periodOf(date), octClosed)
        ? `Periode ${periodOf(date).label} sudah closing.`
        : ''

  const shiftA = a && date ? shiftOn(a, date, ctx).shift : null
  const shiftB = b && date ? shiftOn(b, date, ctx).shift : null
  const issuesA = a && date && !dateError ? personIssues(a, date, ctx) : []
  const issuesB = b && date && !dateError ? personIssues(b, date, ctx) : []

  const swappable = shiftA && shiftB && shiftA !== 'libur' && shiftB !== 'libur'
  const restA = swappable && a ? restAround(a, date, shiftB as WorkShift, ctx) : null
  const restB = swappable && b ? restAround(b, date, shiftA as WorkShift, ctx) : null
  const errA = restA && restError(restA)
  const errB = restB && restError(restB)

  const alasanError = touched && !validAlasan(alasan) ? ALASAN_ERROR : ''
  const valid =
    !!date && !dateError && !!a && !!b && issuesA.length === 0 && issuesB.length === 0 && !errA && !errB && validAlasan(alasan)

  const emptyPartners = `Tidak ada rekan di ${a ? `${sectionOf(a)} · ${levelOf(a)}` : 'section ini'} dengan shift berbeda pada tanggal ini.`

  const submit = () => {
    if (!valid || !a || !b || !swappable) return
    onSubmit({ date, nikA, nikB, shiftA: shiftA as WorkShift, shiftB: shiftB as WorkShift, alasan: alasan.trim() })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Ajukan Tukar Shift</SheetTitle>
          <SheetDescription>Kedua pegawai diminta mengonfirmasi lebih dulu; setelah semua setuju, Atasan langsung menyetujui.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <Field id="tks-tanggal" label="Tanggal" required error={dateError} helper="Hanya tanggal hari ini atau setelahnya pada periode yang masih terbuka">
            <DatePicker
              id="tks-tanggal"
              value={date}
              min={DEMO_TODAY}
              hintDate={DEMO_TODAY}
              invalid={!!dateError}
              aria-describedby={descId('tks-tanggal', true, !!dateError)}
              onChange={setDate}
            />
          </Field>

          <Field id="tks-a" label="Pegawai A" required>
            <EmployeeCombobox
              id="tks-a"
              value={nikA}
              options={SCHEDULED}
              onChange={setNikA}
              placeholder="Cari nama atau NIP…"
              emptyText="Pegawai tidak ditemukan."
            />
            {a && date && shiftA && (
              <p className="text-xs text-muted-foreground tabular-nums">
                {shiftA === 'libur' ? `Libur pada ${formatDate(date)}` : `${shiftLine(shiftA)} pada ${formatDate(date)}`}
              </p>
            )}
            {issuesA.map((t) => <p key={t} className="text-sm text-danger">{t}</p>)}
          </Field>

          <Field id="tks-b" label="Pegawai B" required>
            <EmployeeCombobox
              id="tks-b"
              value={nikB}
              options={partners}
              onChange={setNikB}
              placeholder={a && date ? 'Pilih rekan satu section' : 'Pilih tanggal dan Pegawai A dulu'}
              emptyText={emptyPartners}
              disabled={!a || !date}
            />
            {a && date && !dateError && partners.length === 0 && shiftA !== 'libur' && (
              <p className="text-xs text-muted-foreground">{emptyPartners}</p>
            )}
            {b && date && shiftB && (
              <p className="text-xs text-muted-foreground tabular-nums">{shiftLine(shiftB)} pada {formatDate(date)}</p>
            )}
            {issuesB.map((t) => <p key={t} className="text-sm text-danger">{t}</p>)}
          </Field>

          {a && b && swappable && (
            <section aria-label="Setelah ditukar" className="space-y-3 rounded-md border p-4">
              <h3 className="text-sm font-medium">Setelah ditukar</h3>
              <ul className="space-y-1 text-sm">
                {[
                  [a.nama, shiftA, shiftB],
                  [b.nama, shiftB, shiftA],
                ].map(([n, from, to]) => (
                  <li key={n as string} className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{n as string}:</span>
                    <span className="text-muted-foreground">{SHIFT_LABEL[from as WorkShift]}</span>
                    <ArrowRight className="size-3 text-muted-foreground" aria-hidden />
                    <span className="font-medium">{SHIFT_LABEL[to as WorkShift]}</span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-1.5 border-t pt-3 text-sm">
                {[
                  [a, restA, errA],
                  [b, restB, errB],
                ].map(([e, r, err]) => (
                  <li key={(e as typeof a).nik} className={err ? 'flex items-start gap-2 text-danger' : 'flex items-start gap-2 text-success'}>
                    {err ? <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />}
                    <span>
                      {err ? (err as string) : (
                        <>
                          <span className="font-medium">{(e as typeof a).nama.split(' ')[0]}:</span> {restSummary(r as NonNullable<typeof restA>)}
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <AlasanField id="tks-alasan" label="Alasan" value={alasan} onChange={setAlasan} error={alasanError} onBlur={() => alasan && setTouched(true)} />

        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={!valid}>Ajukan</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
