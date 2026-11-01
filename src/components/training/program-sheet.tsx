import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/employee/date-picker'
import { Field } from '@/components/employee/field'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { FilePicker } from '@/components/ui/file-picker'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { COMPETENCIES, LEVELS, LEVEL_NAMES } from '@/data/master/competencies'
import { PAKET } from '@/data/recruitment/tests'
import { ROSTER } from '@/data/employees'
import { hasLeft } from '@/data/offboarding'
import {
  MATERIAL_KINDS, TRAINING_TYPES, employeesWithGap, empOf, enrollmentsOf, nextProgramKode, saveProgram, type Material, type MaterialKind, type Program, type ProgramStatus, type TrainingType,
} from '@/data/training/store'
import { SHEET_720 } from '@/components/training/detail-sheet'
import { DEMO_TODAY } from '@/lib/today'

const NO_PAKET = 'none'
let seq = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}${++seq}`

const people = () =>
  ROSTER.filter((e) => e.tanggalMasuk <= DEMO_TODAY && !hasLeft(e.nik)).map((e) => ({ value: e.nik, label: e.nama, sub: `${e.nik} · ${e.posisi}` }))

export function ProgramSheet({ open, program, readOnly, onClose }: { open: boolean; program?: Program; readOnly: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_720}>{open && <Form key={program?.kode ?? 'new'} program={program} readOnly={readOnly} onClose={onClose} />}</SheetContent>
    </Sheet>
  )
}

function Form({ program, readOnly, onClose }: { program?: Program; readOnly: boolean; onClose: () => void }) {
  const isNew = !program
  const [d, setD] = useState<Program>(() => program ? structuredClone(program) : {
    kode: nextProgramKode(), judul: '', singkat: '', tipe: 'Online', kompetensi: [], penyelenggara: { jenis: 'Internal', nama: '' }, durasiJam: 2, materi: [], sesi: [], status: 'Draft', tahun: 2026,
  })
  const [peserta, setPeserta] = useState<string[]>(() => (program ? enrollmentsOf(program.kode).map((e) => e.nik) : []))
  const [err, setErr] = useState<Record<string, string>>({})
  const [addNik, setAddNik] = useState('')
  const set = <K extends keyof Program>(k: K, v: Program[K]) => setD((s) => ({ ...s, [k]: v }))
  const dis = readOnly
  const paket = PAKET.find((p) => p.id === d.paketId)
  const offline = d.tipe === 'Offline'

  const pickGap = () => {
    const found = [...new Set(employeesWithGap(d.kompetensi.map((k) => k.kode)).map((g) => g.nik))]
    if (!d.kompetensi.length) return toast.error('Pilih kompetensi terkait lebih dulu')
    const fresh = found.filter((n) => !peserta.includes(n))
    setPeserta((s) => [...s, ...fresh])
    toast.success(fresh.length ? `${fresh.length} pegawai dengan gap ditambahkan` : 'Tidak ada pegawai baru dengan gap pada kompetensi ini')
  }

  const save = () => {
    const e: Record<string, string> = {}
    if (!d.judul.trim()) e.judul = 'Judul wajib diisi'
    if (!d.kompetensi.length) e.kompetensi = 'Pilih minimal satu kompetensi'
    if (new Set(d.kompetensi.map((k) => k.kode)).size !== d.kompetensi.length) e.kompetensi = 'Kompetensi tidak boleh dobel'
    if (!d.penyelenggara.nama.trim()) e.penyelenggara = d.penyelenggara.jenis === 'Internal' ? 'Pilih trainer' : 'Nama lembaga wajib diisi'
    if (!(d.durasiJam > 0)) e.durasi = 'Durasi harus lebih dari 0 jam'
    d.materi.forEach((m, i) => {
      if (!m.judul.trim()) e[`m${i}`] = 'Judul materi wajib diisi'
      else if ((m.kind === 'Video YouTube' || m.kind === 'Tautan') && !/^https?:\/\/\S+$/.test((m.url ?? '').trim())) e[`m${i}`] = 'URL harus diawali http:// atau https://'
      else if (m.kind === 'Dokumen PDF' && !m.file) e[`m${i}`] = 'Unggah file PDF'
    })
    if (offline && !d.sesi.length) e.sesi = 'Program offline butuh minimal satu sesi'
    if (!offline && !d.materi.some((m) => m.wajib) && !d.paketId) e.materi = 'Tambahkan materi (minimal satu wajib) atau uji akhir'
    d.sesi.forEach((s, i) => {
      if (!s.tanggal) e[`s${i}`] = 'Tanggal sesi wajib diisi'
      else if (!/^\d{2}\.\d{2}$/.test(s.mulai) || !/^\d{2}\.\d{2}$/.test(s.selesai)) e[`s${i}`] = 'Jam memakai format 08.00'
      else if (!s.lokasi.trim() || !s.trainer.trim()) e[`s${i}`] = 'Lokasi dan trainer wajib diisi'
    })
    if (d.paketId && !(d.passing != null && d.passing >= 0 && d.passing <= 100)) e.passing = 'Passing grade 0–100'
    if (offline && d.kuota != null && peserta.length > d.kuota) e.peserta = `Peserta melebihi kuota ${d.kuota}`
    setErr(e)
    if (Object.keys(e).length) { toast.error('Periksa isian yang ditandai'); return }
    const single = d.judul.trim()
    saveProgram({ ...d, judul: single, singkat: d.singkat || single, tahun: Number(DEMO_TODAY.slice(0, 4)) }, peserta)
    toast.success(isNew ? `Program ${d.kode} dibuat` : `Program ${d.kode} diperbarui`)
    onClose()
  }

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>{readOnly ? 'Detail Program' : isNew ? 'Buat Program' : `Edit ${d.kode}`}</SheetTitle>
        <SheetDescription>{d.kode} · pengerjaan materi dan ujian oleh karyawan dilakukan di aplikasi Flutter.</SheetDescription>
      </SheetHeader>
      <div className="space-y-6 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pg-judul" label="Judul" required error={err.judul} className="sm:col-span-2"><Input id="pg-judul" value={d.judul} disabled={dis} onChange={(e) => set('judul', e.target.value)} aria-invalid={!!err.judul || undefined} /></Field>
          <Field id="pg-tipe" label="Tipe" required>
            <Select value={d.tipe} disabled={dis} onValueChange={(v) => set('tipe', v as TrainingType)}>
              <SelectTrigger id="pg-tipe" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{TRAINING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field id="pg-status" label="Status">
            <Select value={d.status} disabled={dis} onValueChange={(v) => set('status', v as ProgramStatus)}>
              <SelectTrigger id="pg-status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{(['Draft', 'Aktif', 'Selesai'] as const).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field id="pg-org" label="Penyelenggara" required error={err.penyelenggara}>
            <div className="space-y-2">
              <Select value={d.penyelenggara.jenis} disabled={dis} onValueChange={(v) => set('penyelenggara', { jenis: v as 'Internal' | 'Eksternal', nama: '' })}>
                <SelectTrigger aria-label="Jenis penyelenggara" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Internal">Internal (trainer pegawai)</SelectItem><SelectItem value="Eksternal">Eksternal (lembaga)</SelectItem></SelectContent>
              </Select>
              {d.penyelenggara.jenis === 'Internal' ? (
                <Combobox id="pg-org" ariaLabel="Trainer" value={ROSTER.find((e) => e.nama === d.penyelenggara.nama)?.nik ?? ''} items={people()} placeholder={d.penyelenggara.nama || 'Pilih trainer'} searchPlaceholder="Cari pegawai…" invalid={!!err.penyelenggara} onChange={(nik) => set('penyelenggara', { jenis: 'Internal', nama: empOf(nik)?.nama ?? '' })} />
              ) : (
                <Input id="pg-org" aria-label="Nama lembaga" placeholder="Nama lembaga" value={d.penyelenggara.nama} disabled={dis} onChange={(e) => set('penyelenggara', { jenis: 'Eksternal', nama: e.target.value })} />
              )}
            </div>
          </Field>
          <Field id="pg-durasi" label="Durasi (jam)" required error={err.durasi}><Input id="pg-durasi" type="number" min={1} value={d.durasiJam} disabled={dis} onChange={(e) => set('durasiJam', Number(e.target.value))} /></Field>
        </div>

        <section className="space-y-2" aria-label="Kompetensi terkait">
          <h3 className="text-sm font-semibold">Kompetensi terkait <span aria-hidden className="text-danger">*</span></h3>
          {d.kompetensi.map((k, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select value={k.kode} disabled={dis} onValueChange={(v) => set('kompetensi', d.kompetensi.map((x, j) => (j === i ? { ...x, kode: v } : x)))}>
                <SelectTrigger aria-label={`Kompetensi ${i + 1}`} className="min-w-0 flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>{COMPETENCIES.filter((c) => c.status === 'Aktif').map((c) => <SelectItem key={c.kode} value={c.kode}>{c.kode} · {c.nama}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={String(k.target)} disabled={dis} onValueChange={(v) => set('kompetensi', d.kompetensi.map((x, j) => (j === i ? { ...x, target: Number(v) } : x)))}>
                <SelectTrigger aria-label={`Target level ${i + 1}`} className="w-44"><SelectValue>Target {k.target} · {LEVEL_NAMES[k.target]}</SelectValue></SelectTrigger>
                <SelectContent>{LEVELS.map((n) => <SelectItem key={n} value={String(n)}>{n} · {LEVEL_NAMES[n]}</SelectItem>)}</SelectContent>
              </Select>
              {!dis && <Button variant="ghost" size="icon" aria-label="Hapus kompetensi" onClick={() => set('kompetensi', d.kompetensi.filter((_, j) => j !== i))}><X /></Button>}
            </div>
          ))}
          {err.kompetensi && <p className="text-xs text-destructive">{err.kompetensi}</p>}
          {!dis && <Button variant="outline" size="sm" onClick={() => set('kompetensi', [...d.kompetensi, { kode: COMPETENCIES.find((c) => !d.kompetensi.some((k) => k.kode === c.kode))?.kode ?? 'BSC-01', target: 3 }])}><Plus />Tambah kompetensi</Button>}
        </section>

        <section className="space-y-3" aria-label="Materi">
          <h3 className="text-sm font-semibold">Materi</h3>
          {d.materi.map((m, i) => (
            <div key={m.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Select value={m.kind} disabled={dis} onValueChange={(v) => set('materi', d.materi.map((x, j) => (j === i ? { ...x, kind: v as MaterialKind, url: undefined, file: undefined } : x)))}>
                  <SelectTrigger aria-label={`Jenis materi ${i + 1}`} className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{MATERIAL_KINDS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Input aria-label={`Judul materi ${i + 1}`} placeholder="Judul materi" value={m.judul} disabled={dis} onChange={(e) => set('materi', d.materi.map((x, j) => (j === i ? { ...x, judul: e.target.value } : x)))} />
                <label className="flex shrink-0 items-center gap-2 text-sm"><Switch checked={m.wajib} disabled={dis} aria-label={`Materi ${i + 1} wajib`} onCheckedChange={(v) => set('materi', d.materi.map((x, j) => (j === i ? { ...x, wajib: v } : x)))} />Wajib</label>
                {!dis && <Button variant="ghost" size="icon" aria-label="Hapus materi" onClick={() => set('materi', d.materi.filter((_, j) => j !== i))}><X /></Button>}
              </div>
              {(m.kind === 'Video YouTube' || m.kind === 'Tautan') && (
                <Input aria-label={`URL materi ${i + 1}`} placeholder={m.kind === 'Video YouTube' ? 'https://www.youtube.com/watch?v=…' : 'https://…'} value={m.url ?? ''} disabled={dis} onChange={(e) => set('materi', d.materi.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
              )}
              {m.kind === 'Dokumen PDF' && (
                <FilePicker id={`mat-file-${i}`} accept=".pdf,application/pdf" extensions={['pdf']} maxBytes={10 * 1024 * 1024} typeError="File harus berformat PDF" value={m.file ?? null} onChange={(f) => !dis && set('materi', d.materi.map((x, j) => (j === i ? { ...x, file: f ?? undefined } : x)))} />
              )}
              {err[`m${i}`] && <p className="text-xs text-destructive">{err[`m${i}`]}</p>}
            </div>
          ))}
          {err.materi && <p className="text-xs text-destructive">{err.materi}</p>}
          {!dis && <Button variant="outline" size="sm" onClick={() => set('materi', [...d.materi, { id: uid('MAT'), kind: d.tipe === 'YouTube' ? 'Video YouTube' : 'Dokumen PDF', judul: '', wajib: true }])}><Plus />Tambah materi</Button>}
        </section>

        {offline && (
          <section className="space-y-3" aria-label="Jadwal sesi">
            <div className="flex items-end justify-between gap-3">
              <h3 className="text-sm font-semibold">Jadwal sesi <span aria-hidden className="text-danger">*</span></h3>
              <Field id="pg-kuota" label="Kuota peserta" error={err.peserta} className="w-36"><Input id="pg-kuota" type="number" min={1} value={d.kuota ?? ''} disabled={dis} onChange={(e) => set('kuota', e.target.value ? Number(e.target.value) : undefined)} /></Field>
            </div>
            {d.sesi.map((s, i) => (
              <div key={s.id} className="space-y-2 rounded-md border p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_6rem_6rem_auto]">
                  <DatePicker id={`ss-tgl-${i}`} value={s.tanggal} onChange={(v) => set('sesi', d.sesi.map((x, j) => (j === i ? { ...x, tanggal: v } : x)))} />
                  <Input aria-label={`Jam mulai sesi ${i + 1}`} placeholder="08.00" value={s.mulai} disabled={dis} onChange={(e) => set('sesi', d.sesi.map((x, j) => (j === i ? { ...x, mulai: e.target.value } : x)))} />
                  <Input aria-label={`Jam selesai sesi ${i + 1}`} placeholder="12.00" value={s.selesai} disabled={dis} onChange={(e) => set('sesi', d.sesi.map((x, j) => (j === i ? { ...x, selesai: e.target.value } : x)))} />
                  {!dis && <Button variant="ghost" size="icon" aria-label="Hapus sesi" onClick={() => set('sesi', d.sesi.filter((_, j) => j !== i))}><X /></Button>}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input aria-label={`Lokasi sesi ${i + 1}`} placeholder="Lokasi" value={s.lokasi} disabled={dis} onChange={(e) => set('sesi', d.sesi.map((x, j) => (j === i ? { ...x, lokasi: e.target.value } : x)))} />
                  <Input aria-label={`Trainer sesi ${i + 1}`} placeholder="Trainer" value={s.trainer} disabled={dis} onChange={(e) => set('sesi', d.sesi.map((x, j) => (j === i ? { ...x, trainer: e.target.value } : x)))} />
                </div>
                {err[`s${i}`] && <p className="text-xs text-destructive">{err[`s${i}`]}</p>}
              </div>
            ))}
            {err.sesi && <p className="text-xs text-destructive">{err.sesi}</p>}
            {!dis && <Button variant="outline" size="sm" onClick={() => set('sesi', [...d.sesi, { id: uid('SES'), tanggal: '', mulai: '08.00', selesai: '12.00', lokasi: d.sesi[0]?.lokasi ?? '', trainer: d.penyelenggara.jenis === 'Internal' ? d.penyelenggara.nama : '' }])}><Plus />Tambah sesi</Button>}
          </section>
        )}

        <section className="space-y-2" aria-label="Uji akhir">
          <h3 className="text-sm font-semibold">Uji akhir</h3>
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <Field id="pg-paket" label="Paket dari Menu Tes">
              <Select value={d.paketId ?? NO_PAKET} disabled={dis} onValueChange={(v) => setD((s) => ({ ...s, paketId: v === NO_PAKET ? undefined : v, passing: v === NO_PAKET ? undefined : PAKET.find((p) => p.id === v)?.passing ?? 70 }))}>
                <SelectTrigger id="pg-paket" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PAKET}>Tanpa uji akhir</SelectItem>
                  {PAKET.filter((p) => p.status === 'Aktif' && p.jenis !== 'psikotes').map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field id="pg-passing" label="Passing grade" error={err.passing} helper={paket?.passing != null ? `Paket: ${paket.passing}` : undefined}>
              <Input id="pg-passing" type="number" min={0} max={100} value={d.passing ?? ''} disabled={dis || !d.paketId} onChange={(e) => set('passing', e.target.value ? Number(e.target.value) : undefined)} />
            </Field>
          </div>
        </section>

        <section className="space-y-2" aria-label="Peserta">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Peserta ({peserta.length}{offline && d.kuota ? `/${d.kuota}` : ''})</h3>
            {!dis && <Button variant="outline" size="sm" onClick={pickGap}>Ambil dari gap kompetensi</Button>}
          </div>
          {!dis && (
            <Combobox id="pg-add" ariaLabel="Tambah peserta" value={addNik} items={people().filter((p) => !peserta.includes(p.value))} placeholder="Tambah peserta…" searchPlaceholder="Cari nama atau NIP…" onChange={(nik) => { setPeserta((s) => [...s, nik]); setAddNik('') }} />
          )}
          <ul className="flex flex-wrap gap-2">
            {peserta.map((nik) => (
              <li key={nik} className="flex items-center gap-1 rounded-full border py-1 pl-3 pr-1 text-sm">
                {empOf(nik)?.nama ?? nik}
                {!dis && !(program && enrollmentsOf(program.kode).some((e) => e.nik === nik)) && <Button variant="ghost" size="icon" className="size-6" aria-label={`Hapus ${empOf(nik)?.nama}`} onClick={() => setPeserta((s) => s.filter((x) => x !== nik))}><X className="size-3" /></Button>}
              </li>
            ))}
            {peserta.length === 0 && <li className="text-sm text-muted-foreground">Belum ada peserta.</li>}
          </ul>
        </section>
      </div>
      <SheetFooter className="sticky bottom-0 mt-auto flex-row justify-end gap-2 border-t bg-background p-4">
        <Button variant="outline" onClick={onClose}>{readOnly ? 'Tutup' : 'Batal'}</Button>
        {!readOnly && <Button onClick={save}>Simpan Program</Button>}
      </SheetFooter>
    </>
  )
}
