import { useState } from 'react'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/employee/date-picker'
import { Field } from '@/components/employee/field'
import { DISC_ICON, EmployeeCombo } from '@/components/industrial/shared'
import { DiscLetterDialog } from '@/components/industrial/letters'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import {
  DEFAULT_PASAL,
  DISC_JENIS,
  DISC_NOTE,
  LEVEL,
  activeSp,
  createDisc,
  eligibleForCreate,
  hasLetter,
  panggilanCount,
  validUntil,
  validateDisc,
  type Disc,
  type DiscJenis,
} from '@/data/discipline'
import { personOf } from '@/data/offboarding'
import { activeViolations } from '@/data/master/discipline'
import { spValidityMonths } from '@/data/master/discipline'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { DEMO_TODAY } from '@/lib/today'

export function DiscCreateSheet({ open, onOpenChange, user, initial }: { open: boolean; onOpenChange: (o: boolean) => void; user: CurrentUser; initial?: { nik?: string; jenis?: DiscJenis } }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[640px]">
        {open && <Body key={`${initial?.nik ?? ''}|${initial?.jenis ?? ''}`} user={user} initial={initial} onClose={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function Body({ user, initial, onClose }: { user: CurrentUser; initial?: { nik?: string; jenis?: DiscJenis }; onClose: () => void }) {
  const [nik, setNik] = useState(initial?.nik ?? '')
  const [jenis, setJenis] = useState<DiscJenis | ''>(initial?.jenis ?? '')
  const [pelanggaran, setPelanggaran] = useState(initial?.jenis === 'Surat Panggilan' ? 'PLG-02' : '')
  const [kejadian, setKejadian] = useState('')
  const [kronologi, setKronologi] = useState('')
  const [pasal, setPasal] = useState(initial?.jenis ? DEFAULT_PASAL[initial.jenis] : '')
  const [catatan, setCatatan] = useState('')
  const [hadir, setHadir] = useState('')
  const [lampiran, setLampiran] = useState<PickedFile | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [preview, setPreview] = useState<Disc | null>(null)

  const input = { nik, jenis, pelanggaran, kejadian, kronologi, lampiran: lampiran?.name, pasal, catatanLevel: catatan, hadir }
  const errors = validateDisc(input)
  const show = (k: string) => (submitted ? errors[k] : undefined)
  const p = nik ? personOf(nik) : undefined
  const act = nik ? activeSp(nik) : null
  const lvl = jenis ? LEVEL[jenis] : undefined
  const needNote = !!act && lvl !== undefined && lvl > 0 && lvl <= (LEVEL[act.disc.jenis] ?? 0)
  const issuedPreview = jenis && hasLetter(jenis) ? validUntil(DEMO_TODAY) : jenis === 'Teguran Lisan' ? validUntil(DEMO_TODAY) : ''
  const options = eligibleForCreate(user)

  const pickJenis = (j: DiscJenis) => {
    setJenis(j)
    setPasal(DEFAULT_PASAL[j])
    if (j === 'Surat Panggilan' && !pelanggaran) setPelanggaran('PLG-02')
  }
  const draft = (): Disc | null =>
    p && jenis
      ? {
          id: 'draft', nik, jenis, pelanggaran, kejadian: kejadian || DEMO_TODAY, kronologi, pasal, status: 'menunggu', suratNo: '',
          panggilan: jenis === 'Surat Panggilan' ? { ke: (panggilanCount(nik) + 1) as 1 | 2, hadir: hadir || DEMO_TODAY } : undefined,
          diajukan: { by: user.nama, at: '', tanggal: DEMO_TODAY },
        }
      : null
  const submit = () => {
    setSubmitted(true)
    const res = createDisc(input, user)
    if (res.id) {
      toast.success(jenis === 'Teguran Lisan' ? 'Teguran Lisan dicatat' : `Catatan ${res.id} diajukan ke HR & GA Manager`)
      onClose()
    } else toast.error('Lengkapi isian yang ditandai terlebih dahulu')
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>Buat Catatan Disiplin</SheetTitle>
        <SheetDescription>Teguran, SP, dan Surat Panggilan adalah catatan terpisah. SP tidak naik tingkat otomatis.</SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4">
        <Field id="dsc-pegawai" label="Pegawai" required error={show('nik')} helper={user.role === 'supervisor' ? 'Hanya pegawai tim Anda.' : undefined}>
          <EmployeeCombo id="dsc-pegawai" value={nik} options={options} onChange={(n) => { setNik(n); setJenis(initial?.jenis ?? ''); }} invalid={!!show('nik')} />
        </Field>
        {p && (
          <div className="rounded-md border bg-muted/50 p-3 text-sm" aria-label="SP aktif">
            {act ? (
              <p>
                <span className="font-medium">{act.disc.jenis} aktif s/d {formatDate(act.disc.berlakuSampai!)}</span>
                {act.next ? <> — disarankan <span className="font-medium">{act.next}</span></> : <> — tidak ada tingkat SP yang lebih tinggi; pertimbangkan PHK Pelanggaran</>}
              </p>
            ) : (
              <p className="text-muted-foreground">Tidak ada SP aktif untuk {p.nama}.</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{p.posisi} · {p.department}</p>
          </div>
        )}
        <section className="space-y-2" aria-label="Jenis">
          <p className="text-sm font-medium">Jenis <span aria-hidden className="text-danger">*</span></p>
          <RadioGroup value={jenis} onValueChange={(v) => pickJenis(v as DiscJenis)} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DISC_JENIS.map((j) => {
              const Icon = DISC_ICON[j]
              const suggested = act?.next === j
              return (
                <label key={j} htmlFor={`dsc-j-${j}`} className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-accent/50', jenis === j && 'ring-2 ring-ring')}>
                  <RadioGroupItem id={`dsc-j-${j}`} value={j} className="mt-0.5" />
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="flex items-center gap-1.5 text-sm font-medium"><Icon className="size-4 text-muted-foreground" aria-hidden />{j}{suggested && <span className="text-xs font-normal text-info">disarankan</span>}</span>
                    <span className="mt-1 text-xs text-muted-foreground">{DISC_NOTE[j]}</span>
                  </span>
                </label>
              )
            })}
          </RadioGroup>
          {show('jenis') && <p className="text-sm text-danger">{show('jenis')}</p>}
        </section>
        {needNote && (
          <Field id="dsc-catatan" label="Catatan tingkat" required error={show('catatanLevel')} helper={`Tingkat ${jenis} tidak lebih tinggi dari ${act!.disc.jenis} yang aktif. Jelaskan alasannya.`}>
            <Textarea id="dsc-catatan" value={catatan} aria-invalid={!!show('catatanLevel') || undefined} onChange={(e) => setCatatan(e.target.value)} />
          </Field>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="dsc-pelanggaran" label="Jenis pelanggaran" required error={show('pelanggaran')}>
            <Select value={pelanggaran} onValueChange={setPelanggaran}>
              <SelectTrigger id="dsc-pelanggaran" className="w-full" aria-invalid={!!show('pelanggaran') || undefined}><SelectValue placeholder="Pilih jenis pelanggaran" /></SelectTrigger>
              <SelectContent>{activeViolations().map((v) => <SelectItem key={v.kode} value={v.kode}>{v.nama}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field id="dsc-kejadian" label="Tanggal kejadian" required error={show('kejadian')}>
            <DatePicker id="dsc-kejadian" value={kejadian} max={DEMO_TODAY} hintDate={DEMO_TODAY} invalid={!!show('kejadian')} onChange={setKejadian} />
          </Field>
        </div>
        {jenis === 'Surat Panggilan' && (
          <Field id="dsc-hadir" label={`Hadir paling lambat (Panggilan ke-${p ? panggilanCount(nik) + 1 : 1})`} required error={show('hadir')} helper="Surat Panggilan untuk mangkir; dua panggilan tanpa tanggapan membuka alasan keluar Mangkir.">
            <DatePicker id="dsc-hadir" value={hadir} min={DEMO_TODAY} hintDate={DEMO_TODAY} invalid={!!show('hadir')} onChange={setHadir} />
          </Field>
        )}
        <Field id="dsc-kronologi" label="Kronologi" required error={show('kronologi')} helper={`Minimal 20 karakter (${kronologi.trim().length}/20).`}>
          <Textarea id="dsc-kronologi" value={kronologi} aria-invalid={!!show('kronologi') || undefined} onChange={(e) => setKronologi(e.target.value)} placeholder="Tulis kronologi kejadian secara ringkas dan jelas…" />
        </Field>
        {jenis && jenis !== 'Teguran Lisan' && (
          <Field id="dsc-pasal" label="Pasal PP/PKB" helper="Teks dapat diubah; tampil di surat.">
            <Textarea id="dsc-pasal" value={pasal} onChange={(e) => setPasal(e.target.value)} />
          </Field>
        )}
        <Field id="dsc-lampiran" label="Lampiran bukti" helper="Opsional. PDF, JPG, atau PNG, maksimal 5 MB.">
          <FilePicker id="dsc-lampiran" accept=".pdf,.jpg,.jpeg,.png" extensions={['pdf', 'jpg', 'jpeg', 'png']} maxBytes={5 * 1048576} typeError="Format file harus PDF, JPG, atau PNG" value={lampiran} onChange={setLampiran} />
        </Field>
        {jenis && jenis !== 'Surat Panggilan' && (
          <Field id="dsc-berlaku" label="Masa berlaku" helper="Dari master Masa berlaku SP (Data Master › Industrial).">
            <Input id="dsc-berlaku" readOnly className="bg-muted/50 text-foreground" value={`${spValidityMonths()} bulan · s/d ${formatDate(issuedPreview)} bila terbit hari ini`} />
          </Field>
        )}
        {jenis && jenis !== 'Teguran Lisan' && (
          <Alert variant="info"><Info /><AlertDescription>{user.role === 'supervisor' ? 'Catatan dikirim ke HR & GA Manager untuk disetujui sebelum surat terbit.' : 'Setelah diajukan, HR & GA Manager menyetujui sebelum surat terbit.'}</AlertDescription></Alert>
        )}
      </div>
      <SheetFooter className="flex-row justify-end gap-2">
        <Button type="button" variant="outline" disabled={!p || !jenis || jenis === 'Teguran Lisan'} onClick={() => setPreview(draft())}>Pratinjau Surat</Button>
        <Button type="button" onClick={submit}>Ajukan</Button>
      </SheetFooter>
      <DiscLetterDialog disc={preview} onClose={() => setPreview(null)} />
    </>
  )
}
