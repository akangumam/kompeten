import { useState } from 'react'
import { DatePicker } from '@/components/employee/date-picker'
import { descId, Field } from '@/components/employee/field'
import { rp } from '@/components/koperasi/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { Input } from '@/components/ui/input'
import { DEMO_TODAY } from '@/lib/today'

export type TransferInput = { tanggal: string; ref: string; bukti: string }

/** Dialog Bendahara: tanggal, no. referensi, dan bukti (pencairan transfer, setoran ke pemberi, atau penerimaan tunai bila `noRef` dimatikan). */
export function TransferDialog({
  title, description, nominal, rekening, submitLabel, noRef, dateLabel = 'Tanggal transfer', onClose, onSubmit,
}: {
  title: string
  description: string
  nominal: number
  rekening?: string
  submitLabel: string
  noRef?: boolean
  dateLabel?: string
  onClose: () => void
  onSubmit: (v: TransferInput) => void
}) {
  const [tanggal, setTanggal] = useState(DEMO_TODAY)
  const [ref, setRef] = useState('')
  const [file, setFile] = useState<PickedFile | null>(null)
  const [touched, setTouched] = useState(false)
  const err = { ref: touched && !noRef && !ref.trim() ? 'No. referensi wajib diisi' : '', file: touched && !file ? 'Bukti wajib diunggah' : '' }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field id="tf-nominal" label="Nominal"><Input id="tf-nominal" readOnly value={rp(nominal)} className="bg-muted/50 tabular-nums" /></Field>
          {rekening && <Field id="tf-rek" label="Rekening tujuan"><Input id="tf-rek" readOnly value={rekening} className="bg-muted/50 tabular-nums" /></Field>}
          <Field id="tf-tanggal" label={dateLabel} required><DatePicker id="tf-tanggal" value={tanggal} onChange={setTanggal} /></Field>
          {!noRef && (
            <Field id="tf-ref" label="No. referensi" required error={err.ref}>
              <Input id="tf-ref" value={ref} aria-invalid={!!err.ref || undefined} onChange={(e) => setRef(e.target.value)} />
            </Field>
          )}
          <Field id="tf-bukti" label="Bukti" required error={err.file} helper="Foto atau PDF, maks. 5 MB">
            <FilePicker id="tf-bukti" accept="image/jpeg,image/png,application/pdf" extensions={['jpg', 'jpeg', 'png', 'pdf']} maxBytes={5 * 1048576} typeError="Format file harus JPG, PNG, atau PDF" value={file} onChange={setFile} describedBy={descId('tf-bukti', true, !!err.file)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            onClick={() => {
              setTouched(true)
              if ((!noRef && !ref.trim()) || !file) return
              onSubmit({ tanggal, ref: ref.trim(), bukti: file.name })
            }}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
