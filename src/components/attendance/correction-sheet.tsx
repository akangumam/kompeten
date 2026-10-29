import { useEffect, useState } from 'react'
import { Field, descId } from '@/components/employee/field'
import { recordTitle, ScanLog } from '@/components/attendance/log-sheet'
import { TimeInput } from '@/components/attendance/time-input'
import { Button } from '@/components/ui/button'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SHIFTS, toMin, validTime, type DayRecord, type Scan } from '@/data/attendance'
import { formatDate } from '@/lib/format'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import type { CorrectionInput } from '@/components/attendance/use-attendance'
import { AlasanField } from '@/components/ui/alasan-field'

type Errors = Partial<Record<'masuk' | 'pulang' | 'alasan', string>>

export function CorrectionSheet({
  rec,
  scans,
  onClose,
  onSubmit,
}: {
  rec: DayRecord | null
  scans: Scan[]
  onClose: () => void
  onSubmit: (rec: DayRecord, input: CorrectionInput) => void
}) {
  const [masuk, setMasuk] = useState('')
  const [pulang, setPulang] = useState('')
  const [alasan, setAlasan] = useState('')
  const [lampiran, setLampiran] = useState<PickedFile | null>(null)
  const [errors, setErrors] = useState<Errors>({})

  useEffect(() => {
    if (!rec) return
    setMasuk(rec.masuk ?? '')
    setPulang(rec.pulang ?? '')
    setAlasan('')
    setLampiran(null)
    setErrors({})
  }, [rec])

  const timeError = (v: string) => (validTime(v) ? undefined : 'Jam tidak valid. Gunakan format 24 jam HH.MM, contoh 07.00')
  const onBlurTime = (k: 'masuk' | 'pulang', v: string) => {
    if (v) setErrors((e) => ({ ...e, [k]: timeError(v) }))
  }

  const submit = () => {
    if (!rec) return
    const next: Errors = {}
    if (!masuk) next.masuk = 'Jam Masuk wajib diisi'
    else next.masuk = timeError(masuk)
    if (!pulang) next.pulang = 'Jam Pulang wajib diisi'
    else next.pulang = timeError(pulang)
    if (!next.masuk && !next.pulang && rec.shift !== 'malam' && toMin(pulang) <= toMin(masuk))
      next.pulang = 'Jam Pulang harus setelah Jam Masuk'
    if (!alasan.trim()) next.alasan = 'Alasan wajib diisi'
    else if (!validAlasan(alasan)) next.alasan = ALASAN_ERROR
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    onSubmit(rec, { masuk, pulang, alasan: alasan.trim(), lampiran: lampiran?.name })
  }

  const sh = rec?.shift ? SHIFTS[rec.shift] : null
  const outside = (v: string, kind: 'masuk' | 'pulang') => {
    if (!sh || !validTime(v)) return undefined
    let m = toMin(v)
    if (kind === 'pulang' && rec?.shift === 'malam' && m < 720) m += 1440
    const out = kind === 'masuk' ? m < sh.start - 60 : m > sh.end + 60
    return out ? `Di luar jam shift (${sh.label} ${sh.range}). Pastikan jam ini benar.` : undefined
  }
  return (
    <Sheet open={rec !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {rec && (
          <>
            <SheetHeader>
              <SheetTitle>Koreksi Absensi · {recordTitle(rec)}</SheetTitle>
              <SheetDescription className="tabular-nums">
                {formatDate(rec.date)}
                {sh && ` · Shift ${sh.label} ${sh.range}`}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4">
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Log scan mesin</h3>
                <ScanLog rec={rec} scans={scans} />
              </section>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="kor-masuk" label="Jam Masuk" required helper="Format 24 jam, mis. 07.00" error={errors.masuk} warning={outside(masuk, 'masuk')}>
                  <TimeInput id="kor-masuk" value={masuk} onChange={setMasuk} onBlur={() => onBlurTime('masuk', masuk)} invalid={!!errors.masuk} aria-describedby={descId('kor-masuk', true, !!errors.masuk, !!outside(masuk, 'masuk'))} />
                </Field>
                <Field id="kor-pulang" label="Jam Pulang" required helper={rec.shift === 'malam' ? 'Otomatis hari berikutnya (+1)' : 'Format 24 jam, mis. 15.00'} error={errors.pulang} warning={outside(pulang, 'pulang')}>
                  <TimeInput id="kor-pulang" value={pulang} onChange={setPulang} onBlur={() => onBlurTime('pulang', pulang)} invalid={!!errors.pulang} aria-describedby={descId('kor-pulang', true, !!errors.pulang, !!outside(pulang, 'pulang'))} />
                </Field>
              </div>
              <AlasanField id="kor-alasan" label="Alasan" value={alasan} onChange={setAlasan} error={errors.alasan} placeholder="Mis. Lupa scan pulang, dikonfirmasi leader line" />
              <Field id="kor-lampiran" label="Lampiran (opsional)" helper="Foto/PDF bukti, maks. 5 MB">
                <FilePicker
                  id="kor-lampiran"
                  accept=".pdf,.png,.jpg,.jpeg"
                  extensions={['pdf', 'png', 'jpg', 'jpeg']}
                  maxBytes={5 * 1024 * 1024}
                  typeError="Format file harus PDF, PNG, atau JPG"
                  value={lampiran}
                  onChange={setLampiran}
                  describedBy="kor-lampiran-help"
                />
              </Field>
            </div>
            <SheetFooter className="flex-row justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Batal</Button>
              <Button onClick={submit}>Ajukan Koreksi</Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
