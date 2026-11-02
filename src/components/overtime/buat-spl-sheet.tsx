import { useEffect, useMemo, useState } from 'react'
import { DEMO_TODAY } from '@/lib/today'
import { CircleCheck, CircleX, X } from 'lucide-react'
import { TimeInput } from '@/components/attendance/time-input'
import { DatePicker } from '@/components/employee/date-picker'
import { descId, Field } from '@/components/employee/field'
import { EmployeeMulti } from '@/components/overtime/employee-multi'
import type { NewSpl } from '@/components/overtime/use-overtime'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/textarea'
import { SHIFTS, toDot, validTime } from '@/data/attendance'
import { ROSTER, type RosterEmployee } from '@/data/employees'
import type { LeaveRequest } from '@/data/leave'
import {
  dateError as dateErr,
  dayTypeLabel,
  dayTypeOf,
  durMin,
  employeeCheck,
  fj,
  maxWorkdayWeek,
  roundMinutes,
  timeError as timeErr,
  type DayType,
  type OtRecord,
} from '@/data/overtime'
import { inScope, type CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'

const shiftText = (e: RosterEmployee) =>
  `Shift ${SHIFTS[e.shift].label} ${SHIFTS[e.shift].range.replace(' (+1)', '')}`

export function BuatSplSheet({
  open,
  onOpenChange,
  user,
  records,
  leaves,
  octClosed,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  user: CurrentUser
  records: OtRecord[]
  leaves: LeaveRequest[]
  octClosed: boolean
  onSubmit: (input: NewSpl) => void
}) {
  const [date, setDate] = useState('')
  const [niks, setNiks] = useState<string[]>([])
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [startTouched, setStartTouched] = useState(false)
  const [pekerjaan, setPekerjaan] = useState('')
  const [blurred, setBlurred] = useState({ pekerjaan: false, start: false, end: false })

  useEffect(() => {
    if (open) {
      setDate(''); setNiks([]); setStart(''); setEnd(''); setStartTouched(false); setPekerjaan('')
      setBlurred({ pekerjaan: false, start: false, end: false })
    }
  }, [open])

  const options = useMemo(() => ROSTER.filter((e) => inScope(user, e)), [user])
  const emps = niks.map((n) => ROSTER.find((e) => e.nik === n)!)
  const first = emps[0] ?? null

  const dErr = dateErr(date, octClosed)
  const dow = date ? new Date(date + 'T00:00:00Z').getUTCDay() : -1
  const type: DayType | null = !date ? null : first ? dayTypeOf(first, date) : dow === 0 ? 'istirahat' : null

  useEffect(() => {
    if (type === 'kerja' && first && !startTouched) setStart(toDot(SHIFTS[first.shift].end % 1440))
  }, [type, first, startTouched])

  const timesOk = validTime(start) && validTime(end)
  const dur = timesOk ? durMin(start, end) : 0
  const tErr = !dErr && timesOk ? timeErr(start, end, type, first) : ''
  const startFmt = blurred.start && start && !validTime(start) ? 'Format jam HH.MM, contoh 15.00' : ''
  const endFmt = blurred.end && end && !validTime(end) ? 'Format jam HH.MM, contoh 18.00' : ''

  const rows = emps.map((e) => {
    const eType = date ? dayTypeOf(e, date) : null
    let error: string | null = null
    if (date && !dErr) {
      if (type && eType !== type) {
        error = `${e.nama}: ${dayTypeLabel(eType!)} pada tanggal ini, berbeda dengan pegawai lain. Buat SPL terpisah.`
      } else if (type === 'kerja' && first && e.shift !== first.shift) {
        error = 'Pilih pegawai dengan shift yang sama untuk satu SPL'
      } else {
        error = employeeCheck(e, date, timesOk ? start : '', timesOk ? end : '', records, leaves).error
      }
    }
    const week = date ? employeeCheck(e, date, '', '', records, leaves).week : 0
    return { e, error, week, eType }
  })

  const pekerjaanError = blurred.pekerjaan && pekerjaan.trim().length < 10 ? 'Pekerjaan minimal 10 karakter' : ''
  const valid =
    !!date && !dErr && emps.length > 0 && rows.every((r) => !r.error) && timesOk && dur > 0 && !tErr && pekerjaan.trim().length >= 10
  const isSpv = user.role === 'supervisor'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>Buat SPL</SheetTitle>
          <SheetDescription>
            Surat Perintah Lembur diterbitkan sebelum pekerjaan dilakukan.{' '}
            {isSpv ? 'SPL diteruskan ke pegawai untuk persetujuan (PP 35/2021), lalu Terjadwal.' : 'SPL menunggu approval atasan langsung, lalu persetujuan pegawai.'}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <Field id="spl-tanggal" label="Tanggal" required error={dErr} helper="Hari ini atau setelahnya, pada periode yang masih terbuka">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <DatePicker
                  id="spl-tanggal"
                  value={date}
                  min={DEMO_TODAY}
                  hintDate={DEMO_TODAY}
                  invalid={!!dErr}
                  aria-describedby={descId('spl-tanggal', true, !!dErr)}
                  onChange={setDate}
                />
              </div>
              {type && <StatusBadge variant="neutral" className="shrink-0">{type === 'kerja' ? 'Hari kerja' : 'Hari istirahat mingguan'}</StatusBadge>}
            </div>
          </Field>

          <Field id="spl-pegawai" label="Pegawai" required helper={isSpv ? 'Anggota tim Anda' : 'Pilih satu atau lebih pegawai'}>
            <EmployeeMulti id="spl-pegawai" value={niks} options={options} onChange={setNiks} />
            {rows.length > 0 && (
              <ul className="space-y-2" aria-label="Pegawai terpilih">
                {rows.map(({ e, error, week, eType }) => (
                  <li key={e.nik} className="space-y-1 rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col leading-tight">
                        <span className="font-medium">{e.nama}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {eType === 'istirahat' ? 'Hari istirahat' : shiftText(e)}
                          {' · '}
                          {eType === 'istirahat' ? `tidak dihitung dalam ${maxWorkdayWeek()} jam` : `Minggu ini ${fj(week)} / ${maxWorkdayWeek()} jam`}
                        </span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Hapus ${e.nama}`} onClick={() => setNiks(niks.filter((n) => n !== e.nik))}>
                        <X className="size-4" />
                      </Button>
                    </div>
                    {date && !dErr && (
                      <p className={error ? 'flex items-start gap-1.5 text-sm text-danger' : 'flex items-center gap-1.5 text-sm text-success'}>
                        {error ? <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleCheck className="size-4 shrink-0" aria-hidden />}
                        <span>{error ?? 'Memenuhi syarat'}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field id="spl-mulai" label="Jam Mulai" required error={startFmt}>
              <TimeInput
                id="spl-mulai"
                value={start}
                invalid={!!startFmt || !!tErr}
                aria-describedby={descId('spl-mulai', false, !!startFmt)}
                onChange={(v) => {
                  setStart(v)
                  setStartTouched(true)
                }}
                onBlur={() => setBlurred((b) => ({ ...b, start: true }))}
              />
            </Field>
            <Field id="spl-selesai" label="Jam Selesai" required error={endFmt}>
              <TimeInput
                id="spl-selesai"
                value={end}
                invalid={!!endFmt || !!tErr}
                aria-describedby={descId('spl-selesai', false, !!endFmt)}
                onChange={setEnd}
                onBlur={() => setBlurred((b) => ({ ...b, end: true }))}
              />
            </Field>
          </div>
          <div className="-mt-2 space-y-1">
            <p className="text-sm tabular-nums" aria-live="polite">
              Durasi <span className="font-medium">{timesOk && dur > 0 ? `${fj(dur / 60)} jam` : '—'}</span>
            </p>
            {tErr && <p className="text-sm text-danger">{tErr}</p>}
            {type === 'kerja' && first && (
              <p className="text-xs text-muted-foreground">Lembur hari kerja dimulai setelah shift berakhir ({toDot(SHIFTS[first.shift].end % 1440)}). Format HH.MM, kelipatan {roundMinutes()} menit.</p>
            )}
          </div>

          <Field id="spl-pekerjaan" label="Pekerjaan" required error={pekerjaanError} helper="Minimal 10 karakter">
            <Textarea
              id="spl-pekerjaan"
              value={pekerjaan}
              placeholder="Contoh: Kejar target PO-2611 tutup botol 28 mm"
              aria-invalid={pekerjaanError ? true : undefined}
              aria-describedby={descId('spl-pekerjaan', true, !!pekerjaanError)}
              onChange={(e) => setPekerjaan(e.target.value)}
              onBlur={() => setBlurred((b) => ({ ...b, pekerjaan: true }))}
            />
          </Field>

          {date && <p className="sr-only">SPL untuk {formatDate(date)}</p>}
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button disabled={!valid} onClick={() => onSubmit({ date, niks, start, end, pekerjaan: pekerjaan.trim() })}>
            {isSpv ? 'Terbitkan SPL' : 'Ajukan SPL'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
