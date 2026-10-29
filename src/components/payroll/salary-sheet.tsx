import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Field, descId } from '@/components/employee/field'
import { FormatInput } from '@/components/employee/format-input'
import { BerlakuField, idr } from '@/components/master/common'
import { RupiahField } from '@/components/payroll/rupiah-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { BANKS, type RosterEmployee } from '@/data/employees'
import { nextPeriodStart } from '@/data/master/attendance-rules'
import { PAYROLL_PERIOD } from '@/data/payroll/period'
import { upahHarianAt } from '@/data/payroll/components'
import { gradeRange, historyOf, maskRekening, saveSalary, simulate, salaryAt, type SalaryRec } from '@/data/payroll/salaries'
import { PTKP_LIST } from '@/data/payroll/statutory'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { ALASAN_ERROR, formatError, validAlasan } from '@/lib/validators'
import { AlasanField } from '@/components/ui/alasan-field'

function Line({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className={muted ? 'text-muted-foreground' : strong ? 'font-semibold' : ''}>{label}</dt>
      <dd className={`tabular-nums ${strong ? 'font-semibold' : ''}`}>{value}</dd>
    </div>
  )
}

/** Simulasi bulan penuh (baca saja), diperbarui langsung saat input diubah. */
function Simulasi({ emp, rec }: { emp: RosterEmployee; rec: { gajiPokok: number; ptkp: string } }) {
  const s = useMemo(() => simulate({ gajiPokok: rec.gajiPokok, level: emp.level, ptkp: rec.ptkp, kelompok: emp.kelompok }, PAYROLL_PERIOD.bayar), [emp.level, emp.kelompok, rec.gajiPokok, rec.ptkp])
  return (
    <section aria-label="Simulasi bulan penuh" className="space-y-3 rounded-lg border bg-muted/50 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Simulasi bulan penuh</h3>
        <p className="text-xs text-muted-foreground">
          Hari hadir {s.hari} ({emp.kelompok}), tanpa lembur dan potongan lain. Parameter berlaku per {formatDate(PAYROLL_PERIOD.bayar)} (tanggal bayar).
        </p>
      </div>
      <dl className="space-y-1.5">
        {s.harian ? (
          <Line label={`Upah Harian (${s.hari} hari × ${idr(s.harian.upah)})`} value={idr(s.gaji)} />
        ) : (
          <>
            <Line label="Gaji Pokok" value={idr(s.gaji)} />
            <Line label="Tunjangan Jabatan" value={idr(s.tunjangan)} />
            <Line label={`Uang Makan + Transport (${s.hari} hari)`} value={idr(s.makan + s.transport)} />
          </>
        )}
        <Line label="Pendapatan" value={idr(s.pendapatan)} strong />
      </dl>
      {s.vendor && <p className="text-xs text-muted-foreground">Dibayar ke vendor: BPJS, PPh 21, dan slip diurus vendor, jadi tidak ada potongan di sini.</p>}
      <Separator />
      <dl className="space-y-1.5">
        <Line label="Beban perusahaan yang masuk bruto" value={idr(s.bebanBruto)} muted />
        <Line label="BPJS Kesehatan perusahaan" value={idr(s.kesCo)} muted />
        <Line label={`JKK (${s.jkkLabel})`} value={idr(s.jkk)} muted />
        <Line label="JKM" value={idr(s.jkm)} muted />
        <Line label="Penghasilan bruto PPh 21" value={idr(s.bruto)} strong />
        <Line label="Kategori & tarif TER" value={`${s.kategori} · ${String(s.tarif).replace('.', ',')}%`} />
        <Line label="PPh 21" value={idr(s.pph)} />
      </dl>
      {s.beyond && (
        <p className="text-xs text-warning">Penghasilan di atas batas tabel TER yang dimuat; tarif bracket terakhir dipakai. Lengkapi tabel sebelum payroll.</p>
      )}
      <Separator />
      <dl className="space-y-1.5">
        <Line label="BPJS Kesehatan pegawai" value={idr(s.kesP)} />
        <Line label="BPJS JHT pegawai" value={idr(s.jhtP)} />
        <Line label="BPJS JP pegawai" value={idr(s.jpP)} />
        <Line label="BPJS pegawai" value={idr(s.bpjsPegawai)} strong />
      </dl>
      <Separator />
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-semibold">Take home pay</span>
        <span className="text-xl font-bold tabular-nums tracking-tight" data-testid="take-home">{idr(s.takeHome)}</span>
      </div>
    </section>
  )
}

type Props = { emp: RosterEmployee; canEdit: boolean; actor: string; onClose: () => void; onGotoChange?: () => void }

export function SalarySheet({ emp, canEdit, actor, onClose, onGotoChange }: Props) {
  const cur = salaryAt(emp, DEMO_TODAY)
  const [gaji, setGaji] = useState(String(cur.gajiPokok))
  const [ptkp, setPtkp] = useState(cur.ptkp)
  const [bank, setBank] = useState(cur.bank)
  const [rek, setRek] = useState(cur.nomorRekening)
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const [touched, setTouched] = useState({ gaji: false, rek: false })

  const range = gradeRange(emp.grade)
  // Gaji Pokok berubah hanya lewat Perubahan Gaji (approval Lestari); di sini hanya Bank dan PTKP.
  const gajiErr = ''
  const rekErr = rek === '' ? 'Nomor rekening wajib diisi' : formatError('rekening', rek)
  const alasanErr = !validAlasan(alasan) ? ALASAN_ERROR : ''
  const dirty = Number(gaji) !== cur.gajiPokok || ptkp !== cur.ptkp || bank !== cur.bank || rek !== cur.nomorRekening
  const hist = historyOf(emp).slice().reverse()

  const save = () => {
    setSub(true)
    if (gajiErr || rekErr || alasanErr || !berlaku) return
    if (!dirty) return toast.info('Tidak ada perubahan nilai')
    const rec: SalaryRec = { gajiPokok: Number(gaji), ptkp, bank, nomorRekening: rek }
    saveSalary(emp, rec, berlaku, alasan.trim(), actor)
    toast.success(`Gaji ${emp.nama} diperbarui, berlaku ${formatDate(berlaku)}`)
    onClose()
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle>{canEdit ? 'Edit Gaji Pegawai' : 'Gaji Pegawai'} · {emp.nama}</SheetTitle>
          <SheetDescription className="tabular-nums">
            {emp.nik} · {emp.department} · {emp.posisi} · Grade {emp.grade} · {emp.level}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {emp.kelompok === 'Harian' ? (
              <Field id="sal-harian" label="Upah Harian" helper="Diatur di tab Komponen. Perubahan upah harian ke depan lewat Promosi/Transaksi Pegawai.">
                <Input id="sal-harian" readOnly value={`${idr(upahHarianAt(DEMO_TODAY))} / hari`} className="bg-muted/50 text-foreground" />
              </Field>
            ) : (
              <div className="space-y-1.5">
                <RupiahField
                  id="sal-gaji"
                  label="Gaji Pokok"
                  value={gaji}
                  readOnly
                  helper={range ? `Rentang Grade ${emp.grade}: ${idr(range.min)} – ${idr(range.max)}` : undefined}
                  onChange={setGaji}
                />
                {onGotoChange && (
                  <Button variant="link" className="h-auto p-0 text-sm" onClick={() => { onClose(); onGotoChange() }}>Ajukan Perubahan Gaji</Button>
                )}
              </div>
            )}
            <Field id="sal-ptkp" label="PTKP" required={canEdit} helper="Status per 1 Januari tahun berjalan">
              {canEdit ? (
                <Select value={ptkp} onValueChange={setPtkp}>
                  <SelectTrigger id="sal-ptkp" className="w-full" aria-describedby={descId('sal-ptkp', true)}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PTKP_LIST.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input id="sal-ptkp" readOnly value={ptkp} className="bg-muted/50 text-foreground" />
              )}
            </Field>
            {canEdit ? (
              <>
                <Field id="sal-bank" label="Bank" required>
                  <Select value={bank} onValueChange={setBank}>
                    <SelectTrigger id="sal-bank" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <FormatInput
                  id="sal-rek"
                  label="Nomor Rekening"
                  rule="rekening"
                  value={rek}
                  error={sub || touched.rek ? rekErr : undefined}
                  onChange={setRek}
                  onBlur={() => setTouched((t) => ({ ...t, rek: true }))}
                />
              </>
            ) : (
              <Field id="sal-rekro" label="Rekening" className="md:col-span-2">
                <Input id="sal-rekro" readOnly value={maskRekening(bank, rek)} className="bg-muted/50 text-foreground" />
              </Field>
            )}
          </div>

          {canEdit && (
            <>
              <BerlakuField id="sal-berlaku" value={berlaku} onChange={setBerlaku} error={sub && !berlaku ? 'Berlaku mulai wajib diisi' : undefined} />
              <AlasanField id="sal-alasan" label="Alasan perubahan" value={alasan} onChange={setAlasan} error={sub ? alasanErr : undefined} />
            </>
          )}

          <Simulasi emp={emp} rec={{ gajiPokok: Number(gaji) || 0, ptkp }} />
          {canEdit && dirty && (
            <Alert variant="info">
              <AlertDescription>Simulasi memakai nilai yang sedang diisi. Perubahan baru berlaku mulai {formatDate(berlaku)}.</AlertDescription>
            </Alert>
          )}

          <section className="space-y-2" aria-label="Riwayat gaji">
            <h3 className="text-sm font-semibold">Riwayat</h3>
            <ol className="space-y-2">
              {hist.map((h) => (
                <li key={h.berlakuMulai} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium tabular-nums">{idr(h.value.gajiPokok)} · {h.value.ptkp}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">Berlaku {formatDate(h.berlakuMulai)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {h.value.bank} ••••{h.value.nomorRekening.slice(-4)} · {h.oleh}
                    {h.alasan ? ` · ${h.alasan}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{canEdit ? 'Batal' : 'Tutup'}</Button>
          {canEdit && <Button onClick={save}>Simpan</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
