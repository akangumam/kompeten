import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ROSTER } from '@/data/employees'
import { PROGRAMS, enrollmentOf, proposeParticipants, PROPOSALS, type Program } from '@/data/training/store'
import type { CurrentUser } from '@/data/users'

/** Atasan mengusulkan anggota timnya; usulan masuk ke HR Development & Industrial sebagai notifikasi. */
export function ProposeDialog({ open, program, user, onClose }: { open: boolean; program?: Program; user: CurrentUser; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">{open && <Form key={program?.kode ?? 'x'} program={program} user={user} onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

function Form({ program, user, onClose }: { program?: Program; user: CurrentUser; onClose: () => void }) {
  const options = PROGRAMS.filter((p) => p.status !== 'Selesai')
  const [kode, setKode] = useState(program?.kode ?? options[0]?.kode ?? '')
  const [picked, setPicked] = useState<string[]>([])
  const [err, setErr] = useState('')
  const team = ROSTER.filter((e) => e.atasanId === user.nik && e.nik !== user.nik)
  const blocked = (nik: string) => !!enrollmentOf(kode, nik) || PROPOSALS.some((x) => x.programKode === kode && x.nik === nik && x.status === 'menunggu')
  const submit = () => {
    if (!picked.length) return setErr('Pilih minimal satu anggota tim')
    const n = proposeParticipants(kode, picked, user)
    toast.success(`${n} usulan dikirim ke HR Development & Industrial`)
    onClose()
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>Usulkan peserta</DialogTitle>
        <DialogDescription>Usulan masuk ke HR Development & Industrial sebagai notifikasi. Pendaftaran diputuskan HR Development & Industrial.</DialogDescription>
      </DialogHeader>
      <Select value={kode} onValueChange={(v) => { setKode(v); setPicked([]) }}>
        <SelectTrigger aria-label="Program usulan" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((p) => <SelectItem key={p.kode} value={p.kode}>{p.kode} · {p.judul}</SelectItem>)}</SelectContent>
      </Select>
      <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
        {team.map((e) => (
          <li key={e.nik} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
            <Checkbox id={`pr-${e.nik}`} disabled={blocked(e.nik)} checked={picked.includes(e.nik)} onCheckedChange={(v) => { setPicked((s) => (v ? [...s, e.nik] : s.filter((x) => x !== e.nik))); setErr('') }} />
            <Label htmlFor={`pr-${e.nik}`} className="flex-1 font-normal">{e.nama} <span className="text-xs text-muted-foreground">{e.posisi}</span></Label>
            {blocked(e.nik) && <span className="text-xs text-muted-foreground">{enrollmentOf(kode, e.nik) ? 'Sudah terdaftar' : 'Sudah diusulkan'}</span>}
          </li>
        ))}
      </ul>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={submit}>Kirim Usulan</Button>
      </DialogFooter>
    </>
  )
}
