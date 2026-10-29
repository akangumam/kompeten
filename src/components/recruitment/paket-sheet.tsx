import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { JOBS } from '@/data/recruitment/jobs'
import { KIND_LABEL, nextPaketId, savePaket, type PaketTes, type Soal, type TestKind } from '@/data/recruitment/tests'
import { cn } from '@/lib/utils'
import { SHEET_RECRUIT } from './shared'

const newSoal = (n: number): Soal => ({ id: `S-${Date.now().toString(36)}-${n}`, tanya: '', opsi: ['', '', '', ''], kunci: 0, bobot: 1 })

/** Editor Paket Tes. Online: soal pilihan ganda (4 opsi, 1 kunci, bobot) dengan acak urutan; Psikotes: template hasil; Praktik: nilai manual. */
export function PaketSheet({ paket, readOnly, onClose }: { paket?: PaketTes; readOnly: boolean; onClose: () => void }) {
  const [nama, setNama] = useState(paket?.nama ?? '')
  const [jenis, setJenis] = useState<TestKind>(paket?.jenis ?? 'online')
  const [durasi, setDurasi] = useState(String(paket?.durasi ?? 30))
  const [passing, setPassing] = useState(String(paket?.passing ?? 60))
  const [acak, setAcak] = useState(paket?.acak ?? true)
  const [catatan, setCatatan] = useState(paket?.catatan ?? '')
  const [soal, setSoal] = useState<Soal[]>(paket?.soal ?? [])
  const [open, setOpen] = useState<number | null>(null)
  const [sub, setSub] = useState(false)
  const online = jenis === 'online'
  const e = {
    nama: !nama.trim() ? 'Nama paket wajib diisi' : undefined,
    durasi: online && (!durasi || Number(durasi) < 1) ? 'Durasi minimal 1 menit' : undefined,
    passing: jenis !== 'psikotes' && (passing === '' || Number(passing) > 100) ? 'Passing grade 0–100' : undefined,
    soal: online && soal.length === 0 ? 'Tambahkan minimal satu soal' : undefined,
    isi: online && soal.some((s) => !s.tanya.trim() || s.opsi.some((o) => !o.trim())) ? 'Semua soal harus memiliki pertanyaan dan empat opsi' : undefined,
  }
  const used = paket ? JOBS.filter((j) => j.paketIds.includes(paket.id)).length : 0
  const setS = (i: number, p: Partial<Soal>) => setSoal(soal.map((s, j) => (j === i ? { ...s, ...p } : s)))
  const save = () => {
    setSub(true)
    if (Object.values(e).some(Boolean)) return
    savePaket({ id: paket?.id ?? nextPaketId(), nama: nama.trim(), jenis, durasi: online ? Number(durasi) : 0, passing: jenis === 'psikotes' ? null : Number(passing), soal: online ? soal : [], acak: online && acak, status: paket?.status ?? 'Aktif', catatan: catatan.trim() || undefined })
    toast.success(paket ? 'Paket tes diperbarui' : 'Paket tes dibuat')
    onClose()
  }
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={cn(SHEET_RECRUIT, 'sm:max-w-[640px]')}>
        <SheetHeader className="border-b p-6 pr-12">
          <SheetTitle>{paket ? (readOnly ? paket.nama : `Ubah Paket Tes · ${paket.nama}`) : 'Tambah Paket Tes'}</SheetTitle>
          <SheetDescription>{paket && used > 0 ? `Dipakai di ${used} lowongan.` : 'Paket dapat dipilih pada Lowongan.'}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="pk-nama" label="Nama paket" required error={sub ? e.nama : undefined} className="sm:col-span-2"><Input id="pk-nama" value={nama} readOnly={readOnly} aria-invalid={!!(sub && e.nama) || undefined} onChange={(x) => setNama(x.target.value)} /></Field>
            <Field id="pk-jenis" label="Jenis" required helper={paket ? 'Jenis tidak dapat diubah setelah dibuat' : undefined}>
              <Select value={jenis} onValueChange={(v) => setJenis(v as TestKind)} disabled={!!paket || readOnly}>
                <SelectTrigger id="pk-jenis" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(KIND_LABEL) as TestKind[]).map((k) => <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {jenis !== 'psikotes' && (
              <Field id="pk-pass" label="Passing grade" required error={sub ? e.passing : undefined} helper="Nilai 0–100"><Input id="pk-pass" inputMode="numeric" value={passing} readOnly={readOnly} onChange={(x) => setPassing(x.target.value.replace(/\D/g, '').slice(0, 3))} /></Field>
            )}
            {online && (
              <>
                <Field id="pk-dur" label="Durasi (menit)" required error={sub ? e.durasi : undefined}><Input id="pk-dur" inputMode="numeric" value={durasi} readOnly={readOnly} onChange={(x) => setDurasi(x.target.value.replace(/\D/g, '').slice(0, 3))} /></Field>
                <div className="flex items-center gap-3 self-end pb-2">
                  <Switch id="pk-acak" checked={acak} disabled={readOnly} onCheckedChange={setAcak} />
                  <Label htmlFor="pk-acak">Acak urutan soal</Label>
                </div>
              </>
            )}
            <Field id="pk-cat" label="Catatan" className="sm:col-span-2" helper={jenis === 'psikotes' ? 'Psikotes memakai template hasil: unggah laporan dan pilih rekomendasi.' : jenis === 'praktik' ? 'Nilai praktik dimasukkan manual oleh HR.' : undefined}>
              <Textarea id="pk-cat" value={catatan} readOnly={readOnly} onChange={(x) => setCatatan(x.target.value)} />
            </Field>
          </div>

          {online && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Soal ({soal.length})</h3>
                {!readOnly && <Button size="sm" variant="outline" onClick={() => { setSoal([...soal, newSoal(soal.length)]); setOpen(soal.length) }}><Plus /> Tambah soal</Button>}
              </div>
              {sub && (e.soal || e.isi) && <p role="alert" className="text-sm text-danger">{e.soal ?? e.isi}</p>}
              <ol className="space-y-2">
                {soal.map((s, i) => (
                  <li key={s.id} className="rounded-md border">
                    <button type="button" className="flex w-full items-start gap-3 p-3 text-left text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                      <span className="w-6 shrink-0 text-muted-foreground tabular-nums">{i + 1}.</span>
                      <span className="min-w-0 flex-1 truncate">{s.tanya || 'Soal baru (belum diisi)'}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">bobot {s.bobot}</span>
                    </button>
                    {open === i && (
                      <div className="space-y-3 border-t p-3">
                        <Field id={`sq-${i}`} label="Pertanyaan"><Textarea id={`sq-${i}`} value={s.tanya} readOnly={readOnly} onChange={(x) => setS(i, { tanya: x.target.value })} /></Field>
                        <RadioGroup value={String(s.kunci)} onValueChange={(v) => setS(i, { kunci: Number(v) as 0 | 1 | 2 | 3 })} disabled={readOnly} aria-label="Kunci jawaban" className="gap-2">
                          {s.opsi.map((o, k) => (
                            <div key={k} className="flex items-center gap-2">
                              <RadioGroupItem id={`sq-${i}-k${k}`} value={String(k)} aria-label={`Kunci: opsi ${'ABCD'[k]}`} />
                              <span className="w-4 text-sm text-muted-foreground">{'ABCD'[k]}</span>
                              <Input aria-label={`Opsi ${'ABCD'[k]} soal ${i + 1}`} value={o} readOnly={readOnly} onChange={(x) => setS(i, { opsi: s.opsi.map((y, j) => (j === k ? x.target.value : y)) as Soal['opsi'] })} />
                            </div>
                          ))}
                        </RadioGroup>
                        <div className="flex items-end justify-between gap-3">
                          <Field id={`sq-b${i}`} label="Bobot" className="w-24"><Input id={`sq-b${i}`} inputMode="numeric" value={s.bobot} readOnly={readOnly} onChange={(x) => setS(i, { bobot: Math.max(1, Number(x.target.value.replace(/\D/g, '').slice(0, 2)) || 1) })} /></Field>
                          {!readOnly && <Button size="sm" variant="ghost" onClick={() => { setSoal(soal.filter((_, j) => j !== i)); setOpen(null) }}><Trash2 /> Hapus soal</Button>}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={onClose}>{readOnly ? 'Tutup' : 'Batal'}</Button>
          {!readOnly && <Button onClick={save}>Simpan</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
