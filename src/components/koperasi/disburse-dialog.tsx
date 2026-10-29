import { useState } from 'react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/employee/date-picker'
import { descId, Field } from '@/components/employee/field'
import { rp } from '@/components/koperasi/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { Input } from '@/components/ui/input'
import { disburseWithdrawal, empOf, rekeningOf, type Withdrawal } from '@/data/koperasi/requests'
import { DEMO_TODAY } from '@/lib/today'

/** Cairkan (Bendahara): transfer ke rekening payroll anggota, lalu dicatat sebagai mutasi debit Sukarela. */
export function DisburseDialog({ w, onClose, actor }: { w: Withdrawal | null; onClose: () => void; actor: string }) {
  if (!w) return null
  return <Body key={w.id} w={w} onClose={onClose} actor={actor} />
}

function Body({ w, onClose, actor }: { w: Withdrawal; onClose: () => void; actor: string }) {
  const [tanggal, setTanggal] = useState(DEMO_TODAY)
  const [ref, setRef] = useState('')
  const [file, setFile] = useState<PickedFile | null>(null)
  const [touched, setTouched] = useState(false)
  const err = { ref: touched && !ref.trim() ? 'No. referensi wajib diisi' : '', file: touched && !file ? 'Bukti transfer wajib diunggah' : '' }
  const submit = () => {
    setTouched(true)
    if (!ref.trim() || !file) return
    disburseWithdrawal(w.id, { tanggal, ref: ref.trim(), bukti: file.name }, actor)
    toast.success(`${w.id} dicairkan ${rp(w.nominal)} ke ${empOf(w.nik)?.nama}`)
    onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cairkan {w.id}</DialogTitle>
          <DialogDescription>{empOf(w.nik)?.nama} · {w.nik}. Transfer ke rekening payroll anggota.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field id="cr-nominal" label="Nominal"><Input id="cr-nominal" readOnly value={rp(w.nominal)} className="bg-muted/50 tabular-nums" /></Field>
          <Field id="cr-rek" label="Rekening tujuan"><Input id="cr-rek" readOnly value={rekeningOf(w.nik).masked} className="bg-muted/50 tabular-nums" /></Field>
          <Field id="cr-tanggal" label="Tanggal transfer" required><DatePicker id="cr-tanggal" value={tanggal} onChange={setTanggal} /></Field>
          <Field id="cr-ref" label="No. referensi" required error={err.ref}>
            <Input id="cr-ref" value={ref} aria-invalid={!!err.ref || undefined} onChange={(e) => setRef(e.target.value)} />
          </Field>
          <Field id="cr-bukti" label="Bukti transfer" required error={err.file} helper="Foto atau PDF, maks. 5 MB">
            <FilePicker id="cr-bukti" accept="image/jpeg,image/png,application/pdf" extensions={['jpg', 'jpeg', 'png', 'pdf']} maxBytes={5 * 1048576} typeError="Format file harus JPG, PNG, atau PDF" value={file} onChange={setFile} describedBy={descId('cr-bukti', true, !!err.file)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit}>Cairkan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
