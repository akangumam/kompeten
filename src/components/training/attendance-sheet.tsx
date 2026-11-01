import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PersonCell } from '@/components/payroll/pay/shared'
import { empOf, enrollmentsOf, programOf, recordAttendance } from '@/data/training/store'
import { formatDate } from '@/lib/format'

export function AttendanceSheet({ target, onClose }: { target: { kode: string; sesiId: string } | null; onClose: () => void }) {
  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-[560px]">{target && <Body key={`${target.kode}|${target.sesiId}`} {...target} onClose={onClose} />}</SheetContent>
    </Sheet>
  )
}

function Body({ kode, sesiId, onClose }: { kode: string; sesiId: string; onClose: () => void }) {
  const p = programOf(kode)!
  const s = p.sesi.find((x) => x.id === sesiId)!
  const list = enrollmentsOf(kode)
  const [marks, setMarks] = useState<Record<string, 'hadir' | 'tidak'>>(() => Object.fromEntries(list.flatMap((e) => (e.hadir[sesiId] ? [[e.nik, e.hadir[sesiId]]] : []))) as Record<string, 'hadir' | 'tidak'>)
  const [err, setErr] = useState('')
  const save = () => {
    if (list.some((e) => !marks[e.nik])) return setErr('Pilih Hadir atau Tidak hadir untuk semua peserta.')
    const res = recordAttendance(kode, sesiId, marks)
    if (res.error) return setErr(res.error)
    toast.success(`Kehadiran sesi ${formatDate(s.tanggal)} dicatat`)
    onClose()
  }
  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>Daftar Hadir</SheetTitle>
        <SheetDescription>{p.judul} · <span className="tabular-nums">{formatDate(s.tanggal)}, {s.mulai}–{s.selesai} WIB</span> · {s.lokasi}</SheetDescription>
      </SheetHeader>
      <ul className="divide-y p-4">
        {list.map((e) => (
          <li key={e.nik} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <PersonCell nama={empOf(e.nik)?.nama ?? e.nik} nik={e.nik} />
            <RadioGroup className="flex gap-4" value={marks[e.nik] ?? ''} onValueChange={(v) => { setMarks((m) => ({ ...m, [e.nik]: v as 'hadir' | 'tidak' })); setErr('') }} aria-label={`Kehadiran ${empOf(e.nik)?.nama}`}>
              <div className="flex items-center gap-2"><RadioGroupItem id={`h-${e.nik}`} value="hadir" /><Label htmlFor={`h-${e.nik}`}>Hadir</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem id={`t-${e.nik}`} value="tidak" /><Label htmlFor={`t-${e.nik}`}>Tidak hadir</Label></div>
            </RadioGroup>
          </li>
        ))}
      </ul>
      {err && <p role="alert" className="px-4 text-sm text-danger">{err}</p>}
      <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t p-4">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={save}>Simpan Kehadiran</Button>
      </SheetFooter>
    </>
  )
}
