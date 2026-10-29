import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/employee/date-picker'
import { descId, Field } from '@/components/employee/field'
import { idr } from '@/components/payroll/pay/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FAIL_REASONS, markBank, markGagal, markVendor, VENDOR, payManual, retransfer, type BankGroup, type FailReason, type PayItem } from '@/data/payroll/disbursement'
import type { PayPeriod } from '@/data/payroll/runs'
import { maskRekening, salaryAt } from '@/data/payroll/salaries'
import { DEMO_TODAY } from '@/lib/today'

export type PayAction =
  | { kind: 'bank'; group: BankGroup; items: PayItem[] }
  | { kind: 'vendor'; items: PayItem[]; total: number }
  | { kind: 'manual'; item: PayItem }
  | { kind: 'gagal'; item: PayItem }
  | { kind: 'ulang'; item: PayItem }

type Props = { action: PayAction | null; period: PayPeriod; actor: string; onClose: () => void }

function Shell({ title, description, open, onClose, onSubmit, submit, children }: { title: string; description: string; open: boolean; onClose: () => void; onSubmit: () => void; submit: string; children: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={onSubmit}>{submit}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const Bukti = ({ id, value, onChange }: { id: string; value: PickedFile | null; onChange: (f: PickedFile | null) => void }) => (
  <Field id={id} label="Bukti" helper="Opsional. Foto atau PDF, maks. 5 MB">
    <FilePicker id={id} accept="image/jpeg,image/png,application/pdf" extensions={['jpg', 'jpeg', 'png', 'pdf']} maxBytes={5 * 1048576} typeError="Format file harus JPG, PNG, atau PDF" value={value} onChange={onChange} describedBy={descId(id, true, false)} />
  </Field>
)

/** Satu komponen untuk keempat dialog Daftar Pembayaran; state formulir di-reset tiap aksi baru lewat `key`. */
export function PayDialogs(props: Props) {
  const { action } = props
  return action ? <Inner key={`${action.kind}-${action.kind === 'bank' ? action.group.bank : action.kind === 'vendor' ? 'v' : action.item.row.nik}`} {...props} action={action} /> : null
}

function Inner({ action, period, actor, onClose }: Props & { action: PayAction }) {
  const [tanggal, setTanggal] = useState(period.bayar)
  const [ref, setRef] = useState('')
  const [file, setFile] = useState<PickedFile | null>(null)
  const [metode, setMetode] = useState('Tunai')
  const [catatan, setCatatan] = useState('')
  const [alasan, setAlasan] = useState<FailReason>('Rekening tidak aktif')
  const [err, setErr] = useState<Record<string, string>>({})
  const fail = (e: Record<string, string>) => {
    setErr(e)
    return Object.keys(e).length > 0
  }
  const refError = ref.trim() ? '' : 'No. referensi bank wajib diisi'

  if (action.kind === 'bank') {
    const { group } = action
    return (
      <Shell open title={`Tandai ${group.bank} sudah ditransfer`} description={`${group.items.length.toLocaleString('id-ID')} pegawai · ${idr(group.total)}`} onClose={onClose} submit="Tandai Ditransfer"
        onSubmit={() => {
          if (fail(refError ? { ref: refError } : {})) return
          markBank(period.id, group.bank, action.items, { tanggal, ref: ref.trim(), bukti: file?.name ?? null }, actor)
          toast.success(`Batch ${group.bank} ditandai Ditransfer`)
          onClose()
        }}>
        <Field id="bk-tanggal" label="Tanggal transfer" required><DatePicker id="bk-tanggal" value={tanggal} onChange={setTanggal} /></Field>
        <Field id="bk-ref" label="No. referensi bank" required error={err.ref}>
          <Input id="bk-ref" value={ref} aria-invalid={!!err.ref || undefined} onChange={(e) => setRef(e.target.value)} />
        </Field>
        <Bukti id="bk-bukti" value={file} onChange={setFile} />
      </Shell>
    )
  }

  if (action.kind === 'vendor') {
    return (
      <Shell open title="Setor ke Vendor Outsourcing" description={`${VENDOR.nama} · ${action.items.length.toLocaleString('id-ID')} pegawai · ${idr(action.total)}`} onClose={onClose} submit="Tandai Disetor"
        onSubmit={() => {
          if (fail(refError ? { ref: refError } : {})) return
          markVendor(period.id, { tanggal, ref: ref.trim(), bukti: file?.name ?? null }, actor)
          toast.success('Setoran ke vendor Outsourcing ditandai Disetor')
          onClose()
        }}>
        <Field id="vd-tanggal" label="Tanggal setor" required><DatePicker id="vd-tanggal" value={tanggal} onChange={setTanggal} /></Field>
        <Field id="vd-ref" label="No. referensi bank" required error={err.ref}>
          <Input id="vd-ref" value={ref} aria-invalid={!!err.ref || undefined} onChange={(e) => setRef(e.target.value)} />
        </Field>
        <Bukti id="vd-bukti" value={file} onChange={setFile} />
      </Shell>
    )
  }

  const { item } = action
  const who = `${item.row.nama} (${item.row.nik})`

  if (action.kind === 'manual') {
    return (
      <Shell open title="Bayar manual" description={`${who} · ${idr(item.row.neto)}. Tidak masuk file transfer bank.`} onClose={onClose} submit="Catat Pembayaran"
        onSubmit={() => {
          payManual(period.id, item.row.nik, { metode, tanggal, catatan: catatan.trim(), bukti: file?.name ?? null }, actor)
          toast.success(`Pembayaran manual ${item.row.nama} dicatat`)
          onClose()
        }}>
        <Field id="mn-metode" label="Metode" required>
          <Select value={metode} onValueChange={setMetode}>
            <SelectTrigger id="mn-metode" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Tunai">Tunai</SelectItem>
              <SelectItem value="Transfer manual">Transfer manual</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field id="mn-tanggal" label="Tanggal" required><DatePicker id="mn-tanggal" value={tanggal} onChange={setTanggal} /></Field>
        <Field id="mn-catatan" label="Catatan"><Textarea id="mn-catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} /></Field>
        <Bukti id="mn-bukti" value={file} onChange={setFile} />
      </Shell>
    )
  }

  if (action.kind === 'gagal') {
    return (
      <Shell open title="Tandai transfer gagal" description={`${who} · ${item.masked}`} onClose={onClose} submit="Tandai Gagal"
        onSubmit={() => {
          if (fail(alasan === 'Lainnya' && !catatan.trim() ? { catatan: 'Catatan wajib diisi untuk alasan Lainnya' } : {})) return
          markGagal(period.id, item, alasan, catatan.trim(), actor)
          toast.success(`${item.row.nama} ditandai Gagal`)
          onClose()
        }}>
        <Field id="gl-alasan" label="Alasan" required>
          <Select value={alasan} onValueChange={(v) => setAlasan(v as FailReason)}>
            <SelectTrigger id="gl-alasan" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{FAIL_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field id="gl-catatan" label="Catatan" required={alasan === 'Lainnya'} error={err.catatan}>
          <Textarea id="gl-catatan" value={catatan} aria-invalid={!!err.catatan || undefined} onChange={(e) => setCatatan(e.target.value)} />
        </Field>
      </Shell>
    )
  }

  const s = salaryAt(item.emp, DEMO_TODAY)
  return (
    <Shell open title="Transfer ulang" description={`${who} · ${idr(item.row.neto)} ke ${maskRekening(s.bank, s.nomorRekening)}`} onClose={onClose} submit="Tandai Ditransfer"
      onSubmit={() => {
        if (fail(refError ? { ref: refError } : {})) return
        retransfer(period.id, item.row.nik, { tanggal, ref: ref.trim(), bukti: file?.name ?? null }, actor)
        toast.success(`Transfer ulang ${item.row.nama} ditandai Ditransfer`)
        onClose()
      }}>
      <Field id="ul-tanggal" label="Tanggal transfer" required><DatePicker id="ul-tanggal" value={tanggal} onChange={setTanggal} /></Field>
      <Field id="ul-ref" label="No. referensi bank" required error={err.ref}>
        <Input id="ul-ref" value={ref} aria-invalid={!!err.ref || undefined} onChange={(e) => setRef(e.target.value)} />
      </Field>
      <Bukti id="ul-bukti" value={file} onChange={setFile} />
    </Shell>
  )
}
