import { useEffect, useState } from 'react'
import { pembagiOf } from '@/data/master/levels'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { empByNik, SHIFTS, type DayRecord } from '@/data/attendance'
import { ROSTER } from '@/data/employees'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export function AlfaDialog({
  rec,
  onClose,
  onConfirm,
  onKoreksi,
}: {
  rec: DayRecord | null
  onClose: () => void
  onConfirm: (rec: DayRecord) => void
  onKoreksi: (rec: DayRecord) => void
}) {
  const emp = empByNik(rec?.nik ?? null)
  const divisor = emp ? pembagiOf(emp.kelompok, emp.level) : 25
  return (
    <AlertDialog open={rec !== null} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Alfa?</AlertDialogTitle>
          <AlertDialogDescription>
            {emp?.nama} dicatat Alfa pada {rec && formatDate(rec.date)}. Potongan gaji = (Gaji Pokok + Tunjangan Jabatan) ÷{' '}
            {divisor} per hari (Group {emp?.kelompok}). Jika pegawai sebenarnya hadir, gunakan Koreksi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => {
              if (rec) onKoreksi(rec)
            }}
          >
            Koreksi
          </Button>
          <AlertDialogAction onClick={() => rec && onConfirm(rec)}>Konfirmasi Alfa</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function MapPinDialog({
  rec,
  pinMap,
  onClose,
  onSave,
}: {
  rec: DayRecord | null
  pinMap: Record<string, string>
  onClose: () => void
  onSave: (pin: string, nik: string) => void
}) {
  const [nik, setNik] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  useEffect(() => {
    setNik(null)
    setQ('')
  }, [rec])
  const taken = new Set(Object.values(pinMap))
  const list = ROSTER.filter((e) => `${e.nama} ${e.nik}`.toLowerCase().includes(q.trim().toLowerCase()))
  const chosen = ROSTER.find((e) => e.nik === nik)
  return (
    <Dialog open={rec !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Petakan PIN {rec?.pin}</DialogTitle>
          <DialogDescription>
            PIN ini belum terdaftar di mesin absen. Pilih pegawai pemilik PIN, lalu scan akan dipasangkan ulang.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="map-pegawai">
            Pegawai <span aria-hidden className="text-danger">*</span>
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                id="map-pegawai"
                type="button"
                role="combobox"
                aria-expanded={open}
                variant="outline"
                className={cn('w-full justify-between font-normal', !chosen && 'text-muted-foreground')}
              >
                {chosen ? `${chosen.nama} · ${chosen.nik}` : 'Cari nama atau NIP…'}
                <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <div className="relative border-b">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  aria-label="Cari pegawai"
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari nama atau NIP…"
                  className="rounded-b-none border-0 pl-9 shadow-none focus-visible:ring-0"
                />
              </div>
              <ul role="listbox" aria-label="Daftar pegawai" className="max-h-56 overflow-y-auto p-1">
                {list.length === 0 && <li className="px-2 py-6 text-center text-sm text-muted-foreground">Pegawai tidak ditemukan.</li>}
                {list.map((e) => {
                  const used = taken.has(e.nik)
                  return (
                    <li key={e.nik} role="option" aria-selected={e.nik === nik} aria-disabled={used}>
                      <button
                        type="button"
                        disabled={used}
                        onClick={() => {
                          setNik(e.nik)
                          setOpen(false)
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent disabled:pointer-events-none disabled:opacity-50"
                      >
                        <Check className={cn('size-4 shrink-0', e.nik === nik ? 'opacity-100' : 'opacity-0')} aria-hidden />
                        <span className="flex flex-col leading-tight">
                          <span className="font-medium">{e.nama}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {e.nik} · {e.department}
                            {used && ' · sudah punya PIN'}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </PopoverContent>
          </Popover>
          {chosen && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {chosen.department} · Shift {SHIFTS[chosen.shift].label} {SHIFTS[chosen.shift].range}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button disabled={!nik} onClick={() => rec?.pin && nik && onSave(rec.pin, nik)}>Simpan Pemetaan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
