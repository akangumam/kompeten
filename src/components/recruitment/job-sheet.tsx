import { useState } from 'react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/employee/date-picker'
import { Field } from '@/components/employee/field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { JENIS_LIST, statusOptionsOf } from '@/data/master/jenis'
import { POSITIONS, gradeList, positionByName } from '@/data/master/positions'
import { sumberLamaran } from '@/data/master/recruitment'
import { PENDIDIKAN_MIN, levelOfPosisi, nextJobNo, saveJob, submitJob, type Job } from '@/data/recruitment/jobs'
import { PAKET } from '@/data/recruitment/tests'
import { DEMO_TODAY } from '@/lib/today'
import { SHEET_RECRUIT } from './shared'

const toggle = (list: string[], v: string, on: boolean) => (on ? [...list, v] : list.filter((x) => x !== v))

/** Buat / ubah Lowongan (Draft). Department, Level, dan Grade otomatis dari master Posisi. */
export function JobSheet({ job, onClose, by }: { job?: Job; onClose: () => void; by: string }) {
  const [posisi, setPosisi] = useState(job?.posisi ?? '')
  const [kebutuhan, setKebutuhan] = useState(String(job?.kebutuhan ?? ''))
  const [jenis, setJenis] = useState(job?.jenis ?? 'Organik')
  const [statusKerja, setStatusKerja] = useState(job?.statusKerja ?? 'Kontrak')
  const [durasi, setDurasi] = useState(String(job?.durasi ?? 12))
  const [buka, setBuka] = useState(job?.buka ?? '')
  const [tutup, setTutup] = useState(job?.tutup ?? '')
  const [pendidikan, setPendidikan] = useState(job?.syarat.pendidikan ?? 'SMA/SMK')
  const [usia, setUsia] = useState(String(job?.syarat.usiaMax ?? 35))
  const [pengalaman, setPengalaman] = useState(job?.syarat.pengalaman ?? '')
  const [catatan, setCatatan] = useState(job?.syarat.catatan ?? '')
  const [paket, setPaket] = useState<string[]>(job?.paketIds ?? [])
  const [sumber, setSumber] = useState<string[]>(job?.sumber ?? sumberLamaran())
  const [sub, setSub] = useState(false)
  const pos = positionByName(posisi)
  const grade = pos ? gradeList(pos.grade)[0] : ''
  const kontrak = statusKerja === 'Kontrak'
  const e = {
    posisi: !posisi ? 'Posisi wajib dipilih' : undefined,
    kebutuhan: !kebutuhan || Number(kebutuhan) < 1 ? 'Jumlah kebutuhan minimal 1' : undefined,
    durasi: kontrak && (!durasi || Number(durasi) < 1) ? 'Durasi kontrak minimal 1 bulan' : undefined,
    buka: !buka ? 'Tanggal buka wajib diisi' : undefined,
    tutup: !tutup ? 'Tanggal tutup wajib diisi' : tutup < buka ? 'Tanggal tutup tidak boleh sebelum tanggal buka' : undefined,
    usia: !usia || Number(usia) < 17 ? 'Usia maksimal minimal 17 tahun' : undefined,
    paket: paket.length === 0 ? 'Pilih minimal satu paket tes' : undefined,
    sumber: sumber.length === 0 ? 'Pilih minimal satu sumber' : undefined,
  }
  const invalid = Object.values(e).some(Boolean)
  const build = (): Job => ({
    no: job?.no ?? nextJobNo(), posisi, dept: pos?.department ?? '', level: levelOfPosisi(posisi), grade, kebutuhan: Number(kebutuhan), jenis, statusKerja, durasi: kontrak ? Number(durasi) : 0,
    buka, tutup, syarat: { pendidikan, usiaMax: Number(usia), pengalaman: pengalaman.trim(), catatan: catatan.trim() }, paketIds: paket, sumber, status: 'Draft',
    dibuat: job?.dibuat ?? { by, at: DEMO_TODAY },
  })
  const save = (ajukan: boolean) => {
    setSub(true)
    if (invalid) return
    const j = build()
    saveJob(j)
    if (ajukan) { submitJob(j.no, by); toast.success(`${j.no} diajukan ke HR & GA Manager`) }
    else toast.success(`${j.no} disimpan sebagai Draft`)
    onClose()
  }
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_RECRUIT}>
        <SheetHeader className="border-b p-6 pr-12">
          <SheetTitle>{job ? `Ubah Lowongan · ${job.no}` : 'Buat Lowongan'}</SheetTitle>
          <SheetDescription>Lowongan dibuka setelah disetujui HR & GA Manager.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="lw-posisi" label="Posisi" required error={sub ? e.posisi : undefined} className="sm:col-span-2">
              <Combobox id="lw-posisi" value={posisi} items={POSITIONS.filter((p) => p.status === 'Aktif').map((p) => ({ value: p.nama, label: p.nama, sub: p.department ?? undefined }))} onChange={setPosisi} placeholder="Pilih posisi" searchPlaceholder="Cari posisi…" invalid={!!(sub && e.posisi)} />
            </Field>
            <Field id="lw-dept" label="Department" helper="Otomatis dari Posisi"><Input id="lw-dept" readOnly value={pos?.department ?? '—'} className="bg-muted/50 text-foreground" /></Field>
            <Field id="lw-level" label="Level · Grade" helper="Otomatis dari Posisi"><Input id="lw-level" readOnly value={pos ? `${levelOfPosisi(posisi)} · ${grade}` : '—'} className="bg-muted/50 text-foreground" /></Field>
            <Field id="lw-butuh" label="Jumlah kebutuhan" required error={sub ? e.kebutuhan : undefined}>
              <Input id="lw-butuh" inputMode="numeric" value={kebutuhan} aria-invalid={!!(sub && e.kebutuhan) || undefined} onChange={(x) => setKebutuhan(x.target.value.replace(/\D/g, '').slice(0, 3))} />
            </Field>
            <Field id="lw-jenis" label="Jenis Karyawan" required>
              <Select value={jenis} onValueChange={(v) => { setJenis(v); if (!statusOptionsOf(v).includes(statusKerja)) setStatusKerja('Kontrak') }}><SelectTrigger id="lw-jenis" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{JENIS_LIST.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent></Select>
            </Field>
            <Field id="lw-status" label="Status Kerja" required>
              <Select value={statusKerja} onValueChange={setStatusKerja}><SelectTrigger id="lw-status" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{statusOptionsOf(jenis).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </Field>
            {kontrak && (
              <Field id="lw-durasi" label="Durasi kontrak (bulan)" required error={sub ? e.durasi : undefined}>
                <Input id="lw-durasi" inputMode="numeric" value={durasi} aria-invalid={!!(sub && e.durasi) || undefined} onChange={(x) => setDurasi(x.target.value.replace(/\D/g, '').slice(0, 2))} />
              </Field>
            )}
            <Field id="lw-buka" label="Tanggal buka" required error={sub ? e.buka : undefined}><DatePicker id="lw-buka" value={buka} onChange={setBuka} invalid={!!(sub && e.buka)} /></Field>
            <Field id="lw-tutup" label="Tanggal tutup" required error={sub ? e.tutup : undefined}><DatePicker id="lw-tutup" value={tutup} onChange={setTutup} invalid={!!(sub && e.tutup)} hintDate={buka || undefined} /></Field>
          </div>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Persyaratan</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="lw-pend" label="Pendidikan minimal" required>
                <Select value={pendidikan} onValueChange={setPendidikan}><SelectTrigger id="lw-pend" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PENDIDIKAN_MIN.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
              </Field>
              <Field id="lw-usia" label="Usia maksimal" required error={sub ? e.usia : undefined} helper="Dalam tahun">
                <Input id="lw-usia" inputMode="numeric" value={usia} aria-invalid={!!(sub && e.usia) || undefined} onChange={(x) => setUsia(x.target.value.replace(/\D/g, '').slice(0, 2))} />
              </Field>
              <Field id="lw-peng" label="Pengalaman" className="sm:col-span-2"><Input id="lw-peng" value={pengalaman} placeholder="Contoh: minimal 1 tahun di mesin injection" onChange={(x) => setPengalaman(x.target.value)} /></Field>
              <Field id="lw-cat" label="Catatan" className="sm:col-span-2"><Textarea id="lw-cat" value={catatan} onChange={(x) => setCatatan(x.target.value)} /></Field>
            </div>
          </section>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Paket tes <span aria-hidden className="text-danger">*</span></legend>
            {PAKET.filter((p) => p.status === 'Aktif').map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-md border p-3">
                <Checkbox id={`lw-p-${p.id}`} checked={paket.includes(p.id)} onCheckedChange={(c) => setPaket(toggle(paket, p.id, !!c))} />
                <Label htmlFor={`lw-p-${p.id}`}>{p.nama}</Label>
              </div>
            ))}
            {sub && e.paket && <p className="text-sm text-danger">{e.paket}</p>}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Sumber yang dipakai <span aria-hidden className="text-danger">*</span></legend>
            <div className="grid grid-cols-2 gap-2">
              {sumberLamaran().map((s) => (
                <div key={s} className="flex items-center gap-3 rounded-md border p-3">
                  <Checkbox id={`lw-s-${s}`} checked={sumber.includes(s)} onCheckedChange={(c) => setSumber(toggle(sumber, s, !!c))} />
                  <Label htmlFor={`lw-s-${s}`}>{s}</Label>
                </div>
              ))}
            </div>
            {sub && e.sumber && <p className="text-sm text-danger">{e.sumber}</p>}
          </fieldset>
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button variant="outline" onClick={() => save(false)}>Simpan Draft</Button>
          <Button onClick={() => save(true)}>Ajukan</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
