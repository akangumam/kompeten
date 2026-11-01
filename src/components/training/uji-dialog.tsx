import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { empOf, inputUji, passingOf, programOf } from '@/data/training/store'

/** Input nilai uji manual; ditandai "simulasi" karena pengerjaan sebenarnya di aplikasi Flutter. */
export function UjiDialog({ target, onClose }: { target: { kode: string; nik: string } | null; onClose: () => void }) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">{target && <Form key={`${target.kode}|${target.nik}`} {...target} onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

function Form({ kode, nik, onClose }: { kode: string; nik: string; onClose: () => void }) {
  const [v, setV] = useState('')
  const [err, setErr] = useState('')
  const p = programOf(kode)!
  const submit = () => {
    const n = Number(v)
    if (v.trim() === '' || Number.isNaN(n)) return setErr('Nilai wajib diisi (0–100)')
    const res = inputUji(kode, nik, n)
    if (res.error) return setErr(res.error)
    toast.success(res.lulus ? `Lulus (${n}). Sertifikat ${res.certNo} terbit.` : `Tidak lulus (${n}); passing grade ${passingOf(p)}.`)
    onClose()
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>Input nilai uji (simulasi)</DialogTitle>
        <DialogDescription>{empOf(nik)?.nama} · {p.judul}. Pengerjaan sebenarnya dilakukan di aplikasi Flutter.</DialogDescription>
      </DialogHeader>
      <Field id="uji-nilai" label="Nilai uji" required error={err} helper={`Passing grade ${passingOf(p)}`}>
        <Input id="uji-nilai" type="number" min={0} max={100} inputMode="numeric" value={v} aria-invalid={!!err || undefined} onChange={(e) => { setV(e.target.value); setErr('') }} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      </Field>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={submit}>Simpan Nilai</Button>
      </DialogFooter>
    </>
  )
}
