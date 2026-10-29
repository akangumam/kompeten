import { useEffect, useMemo, useState } from 'react'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { BuktiDialog } from '@/components/finalpay/bukti-dialog'
import { RupiahField } from '@/components/payroll/rupiah-field'
import { PersonLine } from '@/components/industrial/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { approveFinalPay, calcFinalPay, notEligible, returnFinalPay, sisaCutiOf, submitCalc, type CalcInput, type FinalPay, type Pembayaran } from '@/data/finalpay'
import { type LeaveRequest } from '@/data/leave'
import { OFFS } from '@/data/offboarding'
import { payrollPeriodOptions } from '@/data/transactions'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { useDirectoryNav } from '@/lib/directory-nav'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { AlasanField } from '@/components/ui/alasan-field'

const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
type Mode = 'hitung' | 'tinjau' | 'detail'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export function CalcSheet({ rec, mode, user, leaves, onClose }: { rec: FinalPay | null; mode: Mode; user: CurrentUser; leaves: LeaveRequest[]; onClose: () => void }) {
  return (
    <Sheet open={rec !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[720px]">
        {rec && <Body key={`${rec.no}|${mode}`} rec={rec} mode={mode} user={user} leaves={leaves} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function Body({ rec, mode, user, leaves, onClose }: { rec: FinalPay; mode: Mode; user: CurrentUser; leaves: LeaveRequest[]; onClose: () => void }) {
  const { openEmployee } = useDirectoryNav()
  const off = rec.offNo ? OFFS.find((o) => o.no === rec.offNo) : undefined
  const koperasiPot = off?.koperasi?.potongan ?? 0
  const hasKoperasi = !!off?.clearance.some((c) => c.key === 'koperasi')
  const [sisa, setSisa] = useState(String(rec.input?.sisaCuti ?? sisaCutiOf(rec.nik, leaves)))
  const [pulang, setPulang] = useState(String(rec.input?.ongkosPulang ?? ''))
  const [lain, setLain] = useState<{ label: string; nominal: string }[]>((rec.input?.lain ?? []).map((l) => ({ label: l.label, nominal: String(l.nominal) })))
  const [pot, setPot] = useState<{ label: string; nominal: string; alasan: string }[]>((rec.input?.potLain ?? []).map((l) => ({ label: l.label, nominal: String(l.nominal), alasan: l.alasan })))
  const [bayar, setBayar] = useState<Pembayaran['mode']>(rec.pembayaran.mode)
  const periods = payrollPeriodOptions()
  const [periode, setPeriode] = useState(rec.pembayaran.periodeId && periods.some((p) => p.id === rec.pembayaran.periodeId) ? rec.pembayaran.periodeId : periods[0]?.id ?? '')
  const [alasan, setAlasan] = useState('')
  const [error, setError] = useState('')
  const [bukti, setBukti] = useState(false)
  const [sub, setSub] = useState(false)
  const editable = mode === 'hitung'
  const info = notEligible(rec.nik)

  const input: CalcInput = useMemo(
    () => ({
      nik: rec.nik, ruleKey: rec.ruleKey, tanggal: rec.tanggal, kontrak: rec.kontrak, diperpanjang: rec.kind === 'KPK',
      sisaCuti: Math.max(0, Number(sisa) || 0), ongkosPulang: Number(pulang) || 0,
      lain: lain.map((l) => ({ label: l.label.trim() || 'Lainnya', nominal: Number(l.nominal) || 0 })),
      potLain: pot.map((l) => ({ label: l.label.trim() || 'Lainnya', nominal: Number(l.nominal) || 0, alasan: l.alasan.trim() })),
      koperasi: koperasiPot,
    }),
    [rec, sisa, pulang, lain, pot, koperasiPot],
  )
  const calc = useMemo(() => (editable ? calcFinalPay(input) : rec.calc ?? calcFinalPay(input)), [editable, input, rec.calc])
  useEffect(() => setError(''), [sisa, pulang])
  const b = calc.base
  const potBad = pot.some((l) => Number(l.nominal) > 0 && !validAlasan(l.alasan))
  const title = mode === 'hitung' ? 'Hitung' : mode === 'tinjau' ? 'Tinjau' : 'Detail'

  const submit = () => {
    setSub(true)
    if (potBad) return setError('Alasan potongan lain minimal 10 karakter dan jelas')
    if (bayar === 'payroll' && !periode) return setError('Pilih periode payroll')
    const e = submitCalc(rec.no, input, bayar === 'payroll' ? { mode: 'payroll', periodeId: periode } : { mode: 'transfer' }, user)
    if (e) return setError(e)
    toast.success(`${rec.no} diajukan ke HR & GA Manager`)
    onClose()
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{title} {rec.kind === 'KPK' ? 'Kompensasi PKWT' : 'Hak Akhir'} · {rec.no}</SheetTitle>
        <SheetDescription>{b.nama} · {rec.nik} · {calc.ruleLabel}</SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4 pb-4">
        {info && <Alert variant="info"><AlertDescription>{info}</AlertDescription></Alert>}
        {rec.dikembalikan && <Alert variant="warning"><AlertDescription>Dikembalikan {rec.dikembalikan.by} · {rec.dikembalikan.at}: {rec.dikembalikan.alasan}</AlertDescription></Alert>}

        <section className="space-y-3" aria-label="Data dasar">
          <h3 className="text-sm font-semibold">1. Data dasar</h3>
          <dl className="space-y-2 rounded-md border p-4">
            <Row label="Pegawai"><div className="flex items-center justify-between gap-3"><PersonLine nik={rec.nik} /><Button variant="link" className="h-auto p-0" onClick={() => openEmployee({ type: ROSTER_HAS(rec.nik) ? 'roster' : 'exited', key: rec.nik })}>Lihat Profil</Button></div></Row>
            <Row label="Status Kerja">{b.jenis} · {b.statusKerja} · Group {b.kelompok}</Row>
            <Row label="Tanggal Masuk"><span className="tabular-nums">{formatDate(b.masuk)}</span></Row>
            <Row label={rec.kind === 'KPK' ? 'Kontrak berakhir' : 'Tanggal keluar'}><span className="tabular-nums">{rec.kontrak ? `Kontrak ke-${rec.kontrak.ke}: ${formatDate(rec.kontrak.mulai)} – ${formatDate(rec.kontrak.akhir)} (${rec.kontrak.bulan} bulan)` : formatDate(rec.tanggal)}</span></Row>
            <Row label="Masa kerja"><span className="tabular-nums">{b.masaText}</span></Row>
            <Row label="Upah dasar">
              <span className="font-medium tabular-nums">{rp(b.upah)}</span>
              <span className="block text-xs text-muted-foreground">{b.komponen.map((k) => `${k.label} ${rp(k.nominal)}`).join(' + ')}</span>
              {b.harianNote && <span className="block text-xs text-muted-foreground">{b.harianNote}</span>}
            </Row>
            <Row label="Pembagi"><span className="tabular-nums">{b.pembagi}</span> <span className="text-xs text-muted-foreground">(Group {b.kelompok})</span></Row>
            <Row label="Sisa cuti tahunan">
              {editable && rec.kind === 'HAK' ? <Input aria-label="Sisa cuti (hari)" inputMode="numeric" className="w-28 tabular-nums" value={sisa} onChange={(e) => setSisa(e.target.value.replace(/\D/g, '').slice(0, 2))} /> : <span className="tabular-nums">{b.sisaCuti} hari</span>}
            </Row>
          </dl>
        </section>

        <section className="space-y-3" aria-label="Rincian">
          <h3 className="text-sm font-semibold">2. Rincian</h3>
          <ul className="divide-y rounded-md border">
            {calc.lines.filter((l) => l.kode !== 'INFO').map((l, i) => (
              <li key={i} className="flex items-start justify-between gap-4 p-3 text-sm">
                <div className="min-w-0"><p className="font-medium">{l.label}</p><p className="text-xs text-muted-foreground">{l.rumus}</p></div>
                <span className={`shrink-0 font-medium tabular-nums ${l.potongan ? 'text-danger' : ''}`}>{l.potongan ? '−' : ''}{rp(l.nominal)}</span>
              </li>
            ))}
            <li className="p-3 text-xs text-muted-foreground">Gaji prorata periode terakhir dibayar lewat payroll dan tidak ditambahkan di sini.</li>
          </ul>
          {editable && rec.kind === 'HAK' && !info && (
            <div className="space-y-4 rounded-md border border-dashed p-4">
              <RupiahField id="fp-pulang" label="Ongkos pulang (UPH)" required={false} value={pulang} onChange={setPulang} helper="Manual. Kosongkan bila tidak ada." />
              <div className="space-y-2">
                <p className="text-sm font-medium">Butir UPH lain sesuai PK/PP/PKB</p>
                {lain.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_160px_auto] items-center gap-2">
                    <Input aria-label="Nama butir" value={l.label} placeholder="Nama butir" onChange={(e) => setLain((a) => a.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <Input aria-label="Nominal" inputMode="numeric" value={l.nominal} placeholder="Nominal" className="tabular-nums" onChange={(e) => setLain((a) => a.map((x, j) => (j === i ? { ...x, nominal: e.target.value.replace(/\D/g, '') } : x)))} />
                    <Button variant="ghost" size="icon" aria-label="Hapus butir" onClick={() => setLain((a) => a.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setLain((a) => [...a, { label: '', nominal: '' }])}><Plus /> Tambah butir</Button>
              </div>
            </div>
          )}
          {editable && !info && (
            <div className="space-y-2 rounded-md border border-dashed p-4">
              <p className="text-sm font-medium">Potongan lain (manual)</p>
              {pot.map((l, i) => (
                <div key={i} className="space-y-2 rounded-md border p-3">
                  <div className="grid grid-cols-[1fr_160px_auto] items-center gap-2">
                    <Input aria-label="Nama potongan" value={l.label} placeholder="Nama potongan" onChange={(e) => setPot((a) => a.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <Input aria-label="Nominal potongan" inputMode="numeric" value={l.nominal} placeholder="Nominal" className="tabular-nums" onChange={(e) => setPot((a) => a.map((x, j) => (j === i ? { ...x, nominal: e.target.value.replace(/\D/g, '') } : x)))} />
                    <Button variant="ghost" size="icon" aria-label="Hapus potongan" onClick={() => setPot((a) => a.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
                  </div>
                  <Input aria-label="Alasan potongan" value={l.alasan} placeholder="Alasan (min. 10 karakter)" aria-invalid={sub && !validAlasan(l.alasan) && Number(l.nominal) > 0 ? true : undefined} onChange={(e) => setPot((a) => a.map((x, j) => (j === i ? { ...x, alasan: e.target.value } : x)))} />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setPot((a) => [...a, { label: '', nominal: '', alasan: '' }])}><Plus /> Tambah potongan</Button>
            </div>
          )}
          {hasKoperasi && !calc.lines.some((l) => l.kode === 'POT-KOP') && <p className="text-xs text-muted-foreground">Kewajiban Koperasi: tidak ada potongan dari hak akhir (konfirmasi Bendahara: {off?.koperasi ? (off.koperasi.keputusan === 'tunai' ? 'diselesaikan tunai' : 'lunas') : 'menunggu'}).</p>}
        </section>

        <section className="space-y-3" aria-label="Pajak">
          <h3 className="text-sm font-semibold">3. Pajak</h3>
          {calc.finalBase > 0 ? (
            <div className="overflow-hidden rounded-md border text-sm">
              <div className="grid grid-cols-[1fr_120px_70px_120px] gap-3 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground"><span>Lapisan (PPh 21 final)</span><span className="text-right">Dasar</span><span className="text-right">Tarif</span><span className="text-right">Pajak</span></div>
              <div className="divide-y">
                {calc.brackets.map((r) => (
                  <div key={r.label} className="grid grid-cols-[1fr_120px_70px_120px] gap-3 px-3 py-2"><span>{r.label}</span><span className="text-right tabular-nums">{rp(r.dasar)}</span><span className="text-right tabular-nums">{r.tarif}%</span><span className="text-right tabular-nums">{rp(r.pajak)}</span></div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground">Tidak ada penghasilan yang dikenai PPh 21 final.</p>}
          {calc.terBase > 0 && <p className="text-sm text-muted-foreground">Tidak final (TER): {rp(calc.terBase)} dihitung di payroll periode pembayaran.</p>}
        </section>

        <section className="space-y-2" aria-label="Total">
          <h3 className="text-sm font-semibold">4. Total</h3>
          <dl className="space-y-1 rounded-md border p-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Total bruto</dt><dd className="font-medium tabular-nums">{rp(calc.bruto)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">PPh 21 final</dt><dd className="tabular-nums">−{rp(calc.pphFinal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Potongan</dt><dd className="tabular-nums">−{rp(calc.potongan)}</dd></div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold"><dt>Neto</dt><dd className="tabular-nums">{rp(calc.neto)}</dd></div>
          </dl>
        </section>

        <section className="space-y-3" aria-label="Pembayaran">
          <h3 className="text-sm font-semibold">5. Pembayaran</h3>
          {editable ? (
            <>
              <RadioGroup value={bayar} onValueChange={(v) => setBayar(v as Pembayaran['mode'])} className="gap-3">
                <label htmlFor="fp-payroll" className="flex items-start gap-2 text-sm"><RadioGroupItem id="fp-payroll" value="payroll" className="mt-0.5" /><span>Lewat payroll<span className="block text-xs text-muted-foreground">Menambah bagian tidak berulang “Hak Akhir” pada slip pegawai di periode yang dipilih.</span></span></label>
                <label htmlFor="fp-transfer" className="flex items-start gap-2 text-sm"><RadioGroupItem id="fp-transfer" value="transfer" className="mt-0.5" /><span>Transfer terpisah<span className="block text-xs text-muted-foreground">Finance mencatat tanggal, nomor referensi, dan bukti transfer.</span></span></label>
              </RadioGroup>
              {bayar === 'payroll' && (
                <Field id="fp-periode" label="Periode payroll" required>
                  <Select value={periode} onValueChange={setPeriode}>
                    <SelectTrigger id="fp-periode" className="w-full"><SelectValue placeholder="Pilih periode" /></SelectTrigger>
                    <SelectContent>{periods.map((p) => <SelectItem key={p.id} value={p.id}>{p.text}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              )}
            </>
          ) : (
            <p className="text-sm">
              {rec.pembayaran.mode === 'payroll' ? <>Lewat payroll periode <span className="font-medium">{periods.find((p) => p.id === rec.pembayaran.periodeId)?.label ?? rec.pembayaran.periodeId}</span>{calc.terBase > 0 && calc.finalBase === 0 ? ' · Tidak final (TER)' : ''}</> : rec.pembayaran.transfer ? <>Transfer terpisah {formatDate(rec.pembayaran.transfer.tanggal)} · ref {rec.pembayaran.transfer.ref} · dicatat {rec.pembayaran.transfer.oleh}</> : 'Transfer terpisah (menunggu dicatat Finance)'}
            </p>
          )}
        </section>

        {mode === 'tinjau' && (
          <AlasanField id="fp-tolak" label="Alasan pengembalian" required={false} value={alasan} onChange={(v) => { setAlasan(v); setError('') }} />
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
      <SheetFooter className="flex-row justify-end gap-2">
        <Button variant="outline" onClick={() => setBukti(true)}><FileText /> Pratinjau Bukti</Button>
        {mode === 'hitung' && <Button disabled={!!info} onClick={submit}>Ajukan</Button>}
        {mode === 'tinjau' && (
          <>
            <Button variant="destructive" onClick={() => { if (!validAlasan(alasan)) return setError(ALASAN_ERROR); returnFinalPay(rec.no, user, alasan.trim()); toast.success(`${rec.no} dikembalikan ke Payroll Officer`); onClose() }}>Tolak</Button>
            <Button onClick={() => { approveFinalPay(rec.no, user); toast.success(`${rec.no} disetujui`); onClose() }}>Setujui</Button>
          </>
        )}
      </SheetFooter>
      <BuktiDialog rec={bukti ? { ...rec, calc } : null} onClose={() => setBukti(false)} />
    </>
  )
}

import { ROSTER } from '@/data/employees'
const ROSTER_HAS = (nik: string) => ROSTER.some((e) => e.nik === nik)
