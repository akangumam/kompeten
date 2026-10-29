import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { CoopCombobox, MoneyField, rp, SHEET_W } from '@/components/koperasi/shared'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { STEP, POKOK, WAJIB_MIN } from '@/data/koperasi/members'
import { createRegistration, registrationCandidates, validSukarela, validWajib } from '@/data/koperasi/requests'

/** Daftarkan anggota baru atas nama pegawai (diinput Sekretaris, disetujui Ketua). */
export function RegisterSheet({ open, onOpenChange, actor }: { open: boolean; onOpenChange: (o: boolean) => void; actor: string }) {
  const [nik, setNik] = useState('')
  const [wajib, setWajib] = useState('50000')
  const [sukarela, setSukarela] = useState('0')
  const [consent, setConsent] = useState(false)
  const [touched, setTouched] = useState(false)
  const options = useMemo(
    () => registrationCandidates().map((c) => ({ key: c.nik, label: c.nama, sub: `${c.department} · ${c.jenis} · ${c.statusKerja}`, reason: c.reason || undefined })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  )
  const w = Number(wajib || 0)
  const s = Number(sukarela || 0)
  const errors = {
    nik: touched && !nik ? 'Pilih pegawai' : '',
    wajib: wajib === '' ? 'Simpanan Wajib wajib diisi' : !validWajib(w) ? `Minimal ${rp(WAJIB_MIN)} dan kelipatan ${rp(STEP)}` : '',
    sukarela: sukarela !== '' && !validSukarela(s) ? `Rp 0 atau kelipatan ${rp(STEP)}` : '',
    consent: touched && !consent ? 'Konfirmasi formulir pendaftaran diperlukan' : '',
  }

  const submit = () => {
    setTouched(true)
    if (!nik || errors.wajib || errors.sukarela || !consent) return
    const err = createRegistration({ nik, wajib: w, sukarela: s }, actor)
    if (err) return toast.error(err)
    const nama = options.find((o) => o.key === nik)?.label
    toast.success(`Pendaftaran ${nama} diajukan ke Ketua`)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={SHEET_W}>
        <SheetHeader>
          <SheetTitle>Daftarkan Anggota</SheetTitle>
          <SheetDescription>Diinput atas nama pegawai, lalu disetujui Ketua. Tanggal efektif anggota adalah tanggal disetujui.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <Field id="rg-pegawai" label="Pegawai" required error={errors.nik} helper="Hanya pegawai aktif berjenis Organik atau Harian">
            <CoopCombobox id="rg-pegawai" value={nik} options={options} onChange={setNik} placeholder="Cari nama atau NIP…" invalid={!!errors.nik} />
          </Field>
          <MoneyField id="rg-wajib" label="Simpanan Wajib per bulan" value={wajib} onChange={setWajib} error={errors.wajib} helper="Default Rp 50.000, kelipatan Rp 10.000" />
          <MoneyField id="rg-sukarela" label="Simpanan Sukarela per bulan" value={sukarela} onChange={setSukarela} error={errors.sukarela} helper="Opsional: Rp 0 atau kelipatan Rp 10.000" required={false} />
          <p className="rounded-lg border bg-muted/50 p-3 text-sm tabular-nums">
            Potongan payroll pertama: Pokok {rp(POKOK)} + Wajib {rp(w)} + Sukarela {rp(s)} = <span className="font-medium">{rp(POKOK + w + s)}</span>
          </p>
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <Checkbox id="rg-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} aria-invalid={!!errors.consent || undefined} className="mt-0.5" />
              <Label htmlFor="rg-consent" className="font-normal leading-snug">Pegawai sudah mengisi dan menandatangani formulir pendaftaran</Label>
            </div>
            {errors.consent && <p className="text-sm text-danger">{errors.consent}</p>}
          </div>
        </div>
        <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit}>Ajukan Pendaftaran</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
