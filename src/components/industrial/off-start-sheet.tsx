import { useState } from 'react'
import { Info, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/employee/date-picker'
import { Field } from '@/components/employee/field'
import { EmployeeCombo } from '@/components/industrial/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ROSTER } from '@/data/employees'
import { ALL_REASONS, REASON_START, activeOff, defaultKeluar, previewOff, startOff, type OffReason } from '@/data/offboarding'
import { hasLeft } from '@/data/offboarding'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'

export function OffStartSheet({ open, onOpenChange, user, initial }: { open: boolean; onOpenChange: (o: boolean) => void; user: CurrentUser; initial?: { nik?: string; reason?: string } }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[640px]">
        {open && <Body key={`${initial?.nik ?? ''}|${initial?.reason ?? ''}`} user={user} initial={initial} onClose={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function Body({ user, initial, onClose }: { user: CurrentUser; initial?: { nik?: string; reason?: string }; onClose: () => void }) {
  const [nik, setNik] = useState(initial?.nik ?? '')
  const [reason, setReason] = useState<OffReason | ''>((initial?.reason as OffReason) ?? '')
  const [keluar, setKeluar] = useState('')
  const [surat, setSurat] = useState('')
  const [dokumen, setDokumen] = useState<PickedFile | null>(null)
  const [ahliWaris, setAhliWaris] = useState('')
  const [dasar, setDasar] = useState('')
  const [mendesak, setMendesak] = useState(false)
  const [kondisi, setKondisi] = useState<'' | 'rugi' | 'cegah'>('')
  const [pasal, setPasal] = useState('')
  const [catatan, setCatatan] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const input = { nik, reason, tanggalKeluar: keluar, tanggalSurat: surat || undefined, dokumen: dokumen?.name, ahliWaris, dasar, mendesak, kondisi: kondisi || undefined, pasal, catatanTanggal: catatan, keterangan }
  const p = previewOff(input)
  const err = (k: string) => (submitted || (nik && reason) ? p.errors[k] : undefined)
  const showErr = (k: string) => (submitted ? p.errors[k] : undefined)
  const locked = initial?.reason === 'Habis Kontrak'
  const reasons: readonly string[] = locked || reason === 'Habis Kontrak' ? ALL_REASONS : REASON_START
  const options = ROSTER.filter((e) => e.tanggalMasuk <= DEMO_TODAY && !hasLeft(e.nik))
  const dateValue = p.readOnlyDate || (reason === 'Pensiun' && !keluar) ? p.tanggalKeluar : keluar
  const blocked = p.blocked

  const submit = () => {
    setSubmitted(true)
    const res = startOff(input, user)
    if (res.no) {
      toast.success(`Proses keluar ${res.no} diajukan ke HR & GA Manager`)
      onClose()
    } else toast.error(res.blocked ?? 'Lengkapi isian yang ditandai terlebih dahulu')
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{locked ? 'Proses Berakhir Kontrak' : 'Proses Keluar'}</SheetTitle>
        <SheetDescription>Pegawai keluar hanya lewat proses ini. Tanggal keluar adalah hari kerja terakhir; pegawai Nonaktif sehari sesudahnya.</SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4">
        <Field id="off-pegawai" label="Pegawai" required error={showErr('nik')}>
          <EmployeeCombo id="off-pegawai" value={nik} options={options} reasonOf={(e) => (activeOff(e.nik) ? `Sudah ada proses keluar ${activeOff(e.nik)!.no}` : null)} onChange={(n) => { setNik(n); setKeluar('') }} invalid={!!showErr('nik')} />
        </Field>
        <Field id="off-alasan" label="Alasan keluar" required error={showErr('reason')}>
          <Select value={reason} onValueChange={(v) => { setReason(v as OffReason); setKeluar('') }} disabled={locked}>
            <SelectTrigger id="off-alasan" className="w-full" aria-invalid={!!showErr('reason') || undefined}><SelectValue placeholder="Pilih alasan keluar" /></SelectTrigger>
            <SelectContent>{reasons.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </Field>

        {reason === 'Mengundurkan Diri' && (
          <>
            <Field id="off-surat" label="Tanggal surat pengunduran diri" required error={err('tanggalSurat')}>
              <DatePicker id="off-surat" value={surat} max={DEMO_TODAY} hintDate={DEMO_TODAY} invalid={!!err('tanggalSurat')} onChange={setSurat} />
            </Field>
            <Field id="off-dok" label="Surat pengunduran diri" required error={err('dokumen')} helper="PDF, JPG, atau PNG, maksimal 5 MB.">
              <FilePicker id="off-dok" accept=".pdf,.jpg,.jpeg,.png" extensions={['pdf', 'jpg', 'jpeg', 'png']} maxBytes={5 * 1048576} typeError="Format file harus PDF, JPG, atau PNG" value={dokumen} onChange={setDokumen} />
            </Field>
          </>
        )}
        {reason === 'Meninggal Dunia' && (
          <>
            <Field id="off-waris" label="Nama ahli waris" required error={err('ahliWaris')}><Input id="off-waris" value={ahliWaris} aria-invalid={!!err('ahliWaris') || undefined} onChange={(e) => setAhliWaris(e.target.value)} /></Field>
            <Field id="off-dok" label="Surat keterangan kematian" required error={err('dokumen')} helper="PDF, JPG, atau PNG, maksimal 5 MB.">
              <FilePicker id="off-dok" accept=".pdf,.jpg,.jpeg,.png" extensions={['pdf', 'jpg', 'jpeg', 'png']} maxBytes={5 * 1048576} typeError="Format file harus PDF, JPG, atau PNG" value={dokumen} onChange={setDokumen} />
            </Field>
          </>
        )}
        {(reason === 'PHK Efisiensi' || reason === 'PHK Kompetensi') && (
          <>
            {reason === 'PHK Efisiensi' && (
              <Field id="off-kondisi" label="Kondisi perusahaan" required error={showErr('kondisi')} helper="Menentukan pengali pesangon di Aturan Hak Akhir.">
                <Select value={kondisi} onValueChange={(v) => setKondisi(v as 'rugi' | 'cegah')}>
                  <SelectTrigger id="off-kondisi" className="w-full" aria-invalid={!!showErr('kondisi') || undefined}><SelectValue placeholder="Pilih kondisi" /></SelectTrigger>
                  <SelectContent><SelectItem value="rugi">Perusahaan merugi</SelectItem><SelectItem value="cegah">Mencegah kerugian</SelectItem></SelectContent>
                </Select>
              </Field>
            )}
            <Field id="off-dasar" label="Dasar keputusan" required error={err('dasar')}><Textarea id="off-dasar" value={dasar} aria-invalid={!!err('dasar') || undefined} onChange={(e) => setDasar(e.target.value)} placeholder="Uraikan dasar keputusan PHK…" /></Field>
            <Field id="off-dok" label="Lampiran dasar keputusan" required error={err('dokumen')} helper="PDF, JPG, atau PNG, maksimal 5 MB.">
              <FilePicker id="off-dok" accept=".pdf,.jpg,.jpeg,.png" extensions={['pdf', 'jpg', 'jpeg', 'png']} maxBytes={5 * 1048576} typeError="Format file harus PDF, JPG, atau PNG" value={dokumen} onChange={setDokumen} />
            </Field>
          </>
        )}
        {reason === 'PHK Pelanggaran' && p.person && (
          <section className="space-y-3">
            {p.spNo ? (
              <Alert variant="info"><Info /><AlertDescription>Terhubung ke SP3 aktif {p.spNo}.</AlertDescription></Alert>
            ) : (
              <label htmlFor="off-mendesak" className="flex items-start gap-2 text-sm">
                <Checkbox id="off-mendesak" checked={mendesak} onCheckedChange={(v) => setMendesak(v === true)} className="mt-0.5" />
                <span>Pelanggaran bersifat mendesak sesuai PK/PP/PKB</span>
              </label>
            )}
            {mendesak && !p.spNo && (
              <Field id="off-pasal" label="Pasal PK/PP/PKB" required error={err('pasal')}><Input id="off-pasal" value={pasal} aria-invalid={!!err('pasal') || undefined} onChange={(e) => setPasal(e.target.value)} placeholder="Contoh: Pasal 52 ayat (2) PKB" /></Field>
            )}
          </section>
        )}

        {reason && (
          <Field id="off-keluar" label="Tanggal keluar (hari kerja terakhir)" required error={showErr('tanggalKeluar')} helper={reason === 'Habis Kontrak' ? 'Sama dengan tanggal berakhir kontrak (tidak dapat diubah).' : reason === 'Pensiun' ? 'Default: ulang tahun pada usia pensiun; boleh diubah dengan catatan.' : reason === 'Meninggal Dunia' ? 'Tanggal meninggal dunia.' : undefined}>
            {p.readOnlyDate ? (
              <Input id="off-keluar" readOnly value={dateValue ? formatDate(dateValue) : ''} className="bg-muted/50 text-foreground" />
            ) : (
              <DatePicker id="off-keluar" value={dateValue} min={reason === 'Meninggal Dunia' ? undefined : DEMO_TODAY} hintDate={dateValue || DEMO_TODAY} invalid={!!showErr('tanggalKeluar')} onChange={setKeluar} />
            )}
          </Field>
        )}
        {reason === 'Pensiun' && nik && keluar && keluar !== defaultKeluar(nik, reason) && (
          <Field id="off-catatan" label="Catatan perubahan tanggal" required error={err('catatanTanggal')}><Textarea id="off-catatan" value={catatan} aria-invalid={!!err('catatanTanggal') || undefined} onChange={(e) => setCatatan(e.target.value)} /></Field>
        )}
        {reason && reason !== 'Habis Kontrak' && (
          <Field id="off-ket" label="Keterangan" helper="Opsional."><Textarea id="off-ket" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} /></Field>
        )}
        {p.warnings.map((w) => (
          <Alert key={w} variant="warning"><TriangleAlert /><AlertDescription>{w}</AlertDescription></Alert>
        ))}
        {blocked && (
          <Alert role="alert" className="border-danger/20 bg-danger/10 text-danger *:data-[slot=alert-description]:text-danger"><TriangleAlert /><AlertDescription>{blocked}</AlertDescription></Alert>
        )}
      </div>
      <SheetFooter className="flex-row justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        {blocked ? (
          <Tooltip>
            <TooltipTrigger asChild><span tabIndex={0} className="inline-flex rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><Button type="button" disabled>Ajukan</Button></span></TooltipTrigger>
            <TooltipContent className="max-w-xs">{blocked}</TooltipContent>
          </Tooltip>
        ) : (
          <Button type="button" onClick={submit}>Ajukan</Button>
        )}
      </SheetFooter>
    </>
  )
}
