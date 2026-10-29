import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { descId, Field } from '@/components/employee/field'
import { CoopCombobox, MoneyField, rp, SHEET_W } from '@/components/koperasi/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { stageActor } from '@/data/koperasi/ksb'
import { activeMembers, memberOf } from '@/data/koperasi/members'
import { createWithdrawal, dipesan, MIN_PENCAIRAN, rekeningOf, saldoSukarela, tersedia, withdrawalError } from '@/data/koperasi/requests'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'

/** Ajukan Pencairan Simpanan Sukarela atas nama anggota (diinput Sekretaris). Pengajuan langsung memesan saldo. */
export function WithdrawSheet({ open, onOpenChange, actor, initialNik }: { open: boolean; onOpenChange: (o: boolean) => void; actor: string; initialNik?: string }) {
  const [nik, setNik] = useState(initialNik ?? '')
  const [nominal, setNominal] = useState('')
  const [alasan, setAlasan] = useState('')
  const [touched, setTouched] = useState(false)
  const options = useMemo(
    () => activeMembers().filter((m) => tersedia(m.nik) >= MIN_PENCAIRAN).map((m) => ({ key: m.nik, label: m.nama, sub: `${m.department} · tersedia Rp ${tersedia(m.nik).toLocaleString('id-ID')}` })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  )
  const m = memberOf(nik)
  const rek = nik ? rekeningOf(nik) : null
  const n = Number(nominal || 0)
  const nominalErr = nik && nominal !== '' ? withdrawalError(nik, n) : ''
  const actorInfo = nik ? stageActor('ketua', nik) : null
  const errors = {
    nik: !nik ? 'Pilih anggota' : '',
    nominal: touched && !nominal ? 'Nominal wajib diisi' : nominalErr,
    alasan: touched && !validAlasan(alasan) ? ALASAN_ERROR : '',
  }
  const blocked = rek && !rek.ada

  const submit = () => {
    setTouched(true)
    if (!nik || !nominal || nominalErr || !validAlasan(alasan) || blocked) return
    const res = createWithdrawal({ nik, nominal: n, alasan }, actor)
    if (res.error) return toast.error(res.error)
    toast.success(`Saldo ${rp(n)} dipesan untuk ${res.id}`)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={SHEET_W}>
        <SheetHeader>
          <SheetTitle>Ajukan Pencairan Simpanan Sukarela</SheetTitle>
          <SheetDescription>Diinput atas nama anggota. Saldo langsung dipesan sampai pencairan selesai atau ditolak.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <Field id="wd-anggota" label="Anggota" required error={errors.nik && touched ? errors.nik : ''} helper="Hanya anggota dengan saldo tersedia minimal Rp 100.000">
            <CoopCombobox id="wd-anggota" value={nik} options={options} onChange={setNik} placeholder="Cari nama atau NIP…" invalid={touched && !!errors.nik} />
          </Field>

          {m && (
            <dl className="grid grid-cols-3 gap-3 rounded-lg border p-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Saldo sukarela</dt><dd className="font-medium tabular-nums">{rp(saldoSukarela(nik))}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Dipesan</dt><dd className="font-medium tabular-nums">{rp(dipesan(nik))}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Tersedia</dt><dd className="font-medium tabular-nums">{rp(tersedia(nik))}</dd></div>
            </dl>
          )}

          <MoneyField id="wd-nominal" label="Nominal" value={nominal} onChange={setNominal} error={errors.nominal} helper="Minimal Rp 100.000, kelipatan Rp 10.000" />

          <Field id="wd-rek" label="Rekening tujuan" helper="Dari data payroll; nomor lengkap tidak ditampilkan">
            <p id="wd-rek" className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm tabular-nums">{rek ? rek.masked : 'Pilih anggota terlebih dahulu'}</p>
          </Field>
          {blocked && <Alert variant="warning"><AlertDescription>Rekening belum ada. Minta Payroll Officer melengkapinya sebelum mengajukan pencairan.</AlertDescription></Alert>}

          <Field id="wd-alasan" label="Alasan" required error={errors.alasan} helper={`Minimal 10 karakter · ${alasan.trim().length}/10`}>
            <Textarea id="wd-alasan" value={alasan} aria-invalid={!!errors.alasan || undefined} aria-describedby={descId('wd-alasan', true, !!errors.alasan)} onChange={(e) => setAlasan(e.target.value)} />
          </Field>

          {actorInfo?.note && <Alert variant="info"><AlertDescription>{actorInfo.note}. Ketua tidak dapat meninjau pengajuannya sendiri.</AlertDescription></Alert>}
        </div>
        <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={!!blocked || !validAlasan(alasan)}>Ajukan Pencairan</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
