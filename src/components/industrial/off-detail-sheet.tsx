import { can } from '@/lib/access'
import { useEffect, useRef, useState } from 'react'
import { Check, FileText, Lock, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { SkkDialog } from '@/components/industrial/letters'
import { PersonLine } from '@/components/industrial/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/textarea'
import { addDayIso } from '@/data/contracts'
import { HAK_STATUS_LABEL, notEligible, recordOfOff, statusOf } from '@/data/finalpay'
import { useDirectoryNav } from '@/lib/directory-nav'
import {
  ALASAN_UTAMA, OFFS, RATING_LABEL, STEP_LABEL, approveOff, canReviewOff, canSeeInterview, clearanceDone, exceptClearance, finishOff, needsInterview, personOf, reached, rejectOff, saveInterview, setClearance, useOffboarding,
  type ClearItem, type Interview, type Off,
} from '@/data/offboarding'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { DEMO_TODAY } from '@/lib/today'
import { AlasanField } from '@/components/ui/alasan-field'

const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
const CLEAR_VARIANT = { Belum: 'neutral', Berjalan: 'info', Selesai: 'success', Dikecualikan: 'warning' } as const

export function OffDetailSheet({ no, user, onClose, onFinished }: { no: string | null; user: CurrentUser; onClose: () => void; onFinished: (o: Off) => number }) {
  useOffboarding()
  const off = no ? OFFS.find((o) => o.no === no) ?? null : null
  const [step, setStep] = useState(1)
  const [skk, setSkk] = useState(false)
  useEffect(() => { if (off) setStep(Math.min(reached(off), 6)) }, [off?.no]) // eslint-disable-line react-hooks/exhaustive-deps
  const p = off ? personOf(off.nik) : undefined
  const max = off ? reached(off) : 1
  const cancelled = off?.status === 'dibatalkan'
  const prevMax = useRef(max)
  useEffect(() => {
    if (off && max > prevMax.current && off.status === 'berjalan') setStep(max)
    prevMax.current = max
  }, [max, off?.no]) // eslint-disable-line react-hooks/exhaustive-deps
  const steps = STEP_LABEL.map((label, i) => {
    const n = i + 1
    const done = !!off && (off.status === 'selesai' ? true : n === 1 ? true : n === 2 ? off.approval.status === 'disetujui' : n === 3 ? clearanceDone(off) : n === 4 ? !!off.interview || (off.approval.status === 'disetujui' && !needsInterview(off) && max > 4) : n === 5 ? off.hakAkhirOk : false)
    const reachable = !cancelled && n <= max
    const status = done ? 'Selesai' : n === max ? 'Perlu tindakan' : n > max ? 'Terkunci' : 'Berjalan'
    return { label, n, done, reachable, status, locked: n > max }
  })
  return (
    <Sheet open={off !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[720px]">
        {off && p && (
          <>
            <SheetHeader>
              <SheetTitle>Pegawai Keluar · {off.no}</SheetTitle>
              <SheetDescription className="tabular-nums">{p.nama} · {p.nik} · {off.reason} · keluar {formatDate(off.tanggalKeluar)}</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-6">
              {cancelled && <Alert><AlertDescription>Proses dibatalkan oleh {off.dibatalkan?.by}: {off.dibatalkan?.alasan}</AlertDescription></Alert>}
              <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Tahapan Pegawai Keluar">
                {steps.map((s) => (
                  <li key={s.label}>
                    <button
                      type="button"
                      disabled={!s.reachable}
                      aria-current={step === s.n ? 'step' : undefined}
                      onClick={() => setStep(s.n)}
                      className={cn('flex h-full min-h-[64px] w-full items-center gap-3 rounded-lg border bg-card p-3 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50', s.reachable ? 'cursor-pointer hover:bg-accent/50' : 'cursor-not-allowed opacity-70', step === s.n && 'ring-2 ring-ring')}
                    >
                      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums', s.done && 'border-success/30 bg-success/10 text-success', !s.done && s.n === max && 'border-ring bg-foreground text-background', !s.done && s.n !== max && 'bg-muted text-muted-foreground')}>
                        {s.done ? <Check className="size-4" aria-hidden /> : s.locked ? <Lock className="size-4" aria-hidden /> : s.n}
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-sm font-medium">{s.label}</span>
                        <span className={cn('block truncate text-xs', s.done ? 'text-success' : s.status === 'Perlu tindakan' ? 'text-warning' : 'text-muted-foreground')}>{s.status}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>

              <section className="space-y-4 rounded-lg border p-4" aria-label={`Tahap ${step}`}>
                <h3 className="text-base font-semibold">{step}. {STEP_LABEL[step - 1]}</h3>
                {step === 1 && <StepPengajuan off={off} />}
                {step === 2 && <StepApproval off={off} user={user} />}
                {step === 3 && <StepClearance off={off} user={user} />}
                {step === 4 && <StepInterview off={off} user={user} />}
                {step === 5 && <StepHakAkhir off={off} user={user} />}
                {step === 6 && <StepSelesai off={off} user={user} onFinished={onFinished} onSkk={() => setSkk(true)} />}
              </section>
              <div className="flex justify-end"><PersonLine nik={off.nik} /></div>
            </div>
            <SkkDialog off={skk ? off : null} onClose={() => setSkk(false)} />
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function StepPengajuan({ off }: { off: Off }) {
  return (
    <dl className="space-y-3">
      <Row label="Alasan keluar"><StatusBadge variant="neutral">{off.reason}</StatusBadge></Row>
      <Row label="Tanggal keluar"><span className="tabular-nums">{formatDate(off.tanggalKeluar)}</span><span className="block text-xs text-muted-foreground">Nonaktif sejak {formatDate(addDayIso(off.tanggalKeluar))}</span></Row>
      {off.tanggalSurat && <Row label="Tanggal surat"><span className="tabular-nums">{formatDate(off.tanggalSurat)}</span></Row>}
      {off.ahliWaris && <Row label="Ahli waris">{off.ahliWaris}</Row>}
      {off.dasar && <Row label="Dasar keputusan">{off.dasar}</Row>}
      {off.spNo && <Row label="SP3 terkait"><span className="tabular-nums">{off.spNo}</span></Row>}
      {off.mendesak && <Row label="Pelanggaran mendesak">Ya · {off.pasal}</Row>}
      {off.catatanTanggal && <Row label="Catatan tanggal">{off.catatanTanggal}</Row>}
      <Row label="Dokumen">{off.dokumen ? <span className="inline-flex items-center gap-2"><Paperclip className="size-4 text-muted-foreground" aria-hidden />{off.dokumen}</span> : <span className="text-muted-foreground">Tidak ada</span>}</Row>
      <Row label="Keterangan">{off.keterangan || <span className="text-muted-foreground">—</span>}</Row>
      <Row label="Diajukan"><span className="tabular-nums">{off.diajukan.by} · {off.diajukan.at}</span></Row>
    </dl>
  )
}

function StepApproval({ off, user }: { off: Off; user: CurrentUser }) {
  const [alasan, setAlasan] = useState('')
  const [error, setError] = useState('')
  const review = canReviewOff(off, user)
  const single = off.reason === 'Habis Kontrak' || off.reason === 'Pensiun'
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
        <div>
          <p className="font-medium">HR & GA Manager: Lestari Wulandari</p>
          <p className="text-xs text-muted-foreground">{single ? 'Disetujui dalam satu langkah.' : 'Persetujuan akhir proses keluar.'}</p>
          {off.approval.warning30 && <p className="mt-1 text-xs text-warning">Kurang dari 30 hari sejak pengajuan; perlu persetujuan HR & GA Manager.</p>}
          {off.approval.alasan && <p className="text-xs text-muted-foreground">Alasan: {off.approval.alasan}</p>}
        </div>
        <span className={cn('shrink-0 text-xs tabular-nums', off.approval.status === 'disetujui' ? 'text-success' : off.approval.status === 'ditolak' ? 'text-danger' : 'text-muted-foreground')}>
          {off.approval.status === 'disetujui' ? `Disetujui · ${off.approval.at}` : off.approval.status === 'ditolak' ? `Ditolak · ${off.approval.at}` : 'Menunggu'}
        </span>
      </div>
      {review && (
        <div className="space-y-2">
          <AlasanField id="off-tolak" label="Alasan penolakan" required={false} value={alasan} onChange={(v) => { setAlasan(v); setError('') }} error={error} />
          <div className="flex justify-end gap-2">
            <Button variant="destructive" onClick={() => { if (!validAlasan(alasan)) return setError(ALASAN_ERROR); rejectOff(off.no, user, alasan.trim()); toast.success(`Proses ${off.no} ditolak`) }}>Tolak</Button>
            <Button onClick={() => { approveOff(off.no, user); toast.success(`Proses ${off.no} disetujui`) }}>Setujui</Button>
          </div>
        </div>
      )}
      {off.approval.status === 'menunggu' && !review && <p className="text-sm text-muted-foreground">Menunggu keputusan HR & GA Manager.</p>}
    </div>
  )
}

function StepClearance({ off, user }: { off: Off; user: CurrentUser }) {
  const [except, setExcept] = useState<ClearItem | null>(null)
  const [alasan, setAlasan] = useState('')
  const [error, setError] = useState('')
  const admin = can(user, 'ir.manage')
  const open = off.status === 'berjalan'
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {off.clearance.map((c) => (
          <li key={c.key} className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">PIC {c.pic}{c.tanggal ? ` · ${formatDate(c.tanggal)}` : ''}</p>
              </div>
              <StatusBadge variant={CLEAR_VARIANT[c.status]}>{c.status}</StatusBadge>
            </div>
            {c.key === 'koperasi' ? (
              <p className="text-sm text-muted-foreground">
                {c.status === 'Selesai' ? (off.koperasi?.keputusan === 'potong' ? `Potong hak akhir ${rp(off.koperasi.potongan)} untuk Koperasi` : c.catatan) : c.status === 'Dikecualikan' ? 'Dikecualikan' : 'Menunggu konfirmasi Bendahara Koperasi.'}
              </p>
            ) : c.catatan ? <p className="text-sm text-muted-foreground">{c.catatan}</p> : null}
            {c.kecuali && <p className="text-xs text-muted-foreground">Dikecualikan oleh {c.kecuali.oleh}: {c.kecuali.alasan}</p>}
            {open && c.status !== 'Selesai' && c.status !== 'Dikecualikan' && (
              <div className="flex flex-wrap justify-end gap-2">
                {admin && c.key !== 'koperasi' && (
                  <>
                    {c.status === 'Belum' && <Button size="sm" variant="outline" onClick={() => setClearance(off.no, c.key, { status: 'Berjalan' }, user)}>Mulai</Button>}
                    <Button size="sm" variant="outline" onClick={() => { const e = setClearance(off.no, c.key, { status: 'Selesai' }, user); if (e) toast.error(e); else toast.success(`${c.label.split(' (')[0]} selesai`) }}>Tandai Selesai</Button>
                  </>
                )}
                {user.role === 'manager' && <Button size="sm" variant="outline" onClick={() => { setExcept(c); setAlasan(''); setError('') }}>Kecualikan</Button>}
              </div>
            )}
          </li>
        ))}
      </ul>
      {off.clearance.length === 0 && <p className="text-sm text-muted-foreground">Clearance dibuat setelah proses disetujui.</p>}
      {off.clearance.length > 0 && <p className="text-sm text-muted-foreground">{clearanceDone(off) ? 'Clearance lengkap.' : 'Clearance lengkap bila semua item Selesai atau Dikecualikan (HR & GA Manager, dengan alasan).'}</p>}
      <Dialog open={except !== null} onOpenChange={(o) => !o && setExcept(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kecualikan item clearance</DialogTitle><DialogDescription>{except?.label}</DialogDescription></DialogHeader>
          <AlasanField id="off-kecuali" label="Alasan pengecualian" value={alasan} onChange={(v) => { setAlasan(v); setError('') }} error={error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcept(null)}>Batal</Button>
            <Button onClick={() => { const e = exceptClearance(off.no, except!.key, alasan, user); if (e) return setError(e); toast.success('Item dikecualikan'); setExcept(null) }}>Kecualikan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StepInterview({ off, user }: { off: Off; user: CurrentUser }) {
  const [iv, setIv] = useState<Omit<Interview, 'oleh' | 'at'>>(() => off.interview ?? { alasanUtama: '', ratings: { atasan: 0, rekan: 0, beban: 0, kompensasi: 0, lingkungan: 0 }, saran: '', rehire: 'Ya', rehireCatatan: '' })
  const [error, setError] = useState('')
  if (!needsInterview(off)) return <p className="text-sm text-muted-foreground">Exit interview tidak diperlukan untuk alasan Meninggal Dunia.</p>
  if (!canSeeInterview(user)) return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground"><Lock className="mt-0.5 size-4 shrink-0" aria-hidden />Isi exit interview dan Eligible for Rehire hanya untuk HR Development & Industrial dan HR & GA Manager.</div>
  )
  const readOnly = off.status !== 'berjalan' || !!off.interview
  const set = (p: Partial<typeof iv>) => setIv((c) => ({ ...c, ...p }))
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="iv-utama">Alasan utama <span aria-hidden className="text-danger">*</span></Label>
        <Select value={iv.alasanUtama} onValueChange={(v) => set({ alasanUtama: v })} disabled={readOnly}>
          <SelectTrigger id="iv-utama" className="w-full"><SelectValue placeholder="Pilih alasan utama" /></SelectTrigger>
          <SelectContent>{ALASAN_UTAMA.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Penilaian (1 = sangat kurang, 5 = sangat baik)</p>
        {(Object.keys(RATING_LABEL) as (keyof Interview['ratings'])[]).map((k) => (
          <div key={k} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <span className="text-sm">{RATING_LABEL[k]}</span>
            <div className="flex gap-1" role="radiogroup" aria-label={RATING_LABEL[k]}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={iv.ratings[k] === n} disabled={readOnly} onClick={() => set({ ratings: { ...iv.ratings, [k]: n } })} className={cn('size-8 rounded-md border text-sm tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-default', iv.ratings[k] === n ? 'border-ring bg-foreground text-background' : 'hover:bg-accent')}>{n}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2"><Label htmlFor="iv-saran">Saran</Label><Textarea id="iv-saran" value={iv.saran} readOnly={readOnly} onChange={(e) => set({ saran: e.target.value })} /></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="iv-rehire">Eligible for Rehire <span aria-hidden className="text-danger">*</span></Label>
          <Select value={iv.rehire} onValueChange={(v) => set({ rehire: v as 'Ya' | 'Tidak' })} disabled={readOnly}>
            <SelectTrigger id="iv-rehire" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Ya">Ya</SelectItem><SelectItem value="Tidak">Tidak</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label htmlFor="iv-cat">Catatan rehire</Label><Textarea id="iv-cat" value={iv.rehireCatatan} readOnly={readOnly} onChange={(e) => set({ rehireCatatan: e.target.value })} /></div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {off.interview && <p className="text-xs text-muted-foreground">Diisi {off.interview.oleh} · {off.interview.at}</p>}
      {!readOnly && <div className="flex justify-end"><Button onClick={() => { const e = saveInterview(off.no, iv, user); if (e) return setError(e); setError(''); toast.success('Exit interview disimpan') }}>Simpan Exit Interview</Button></div>}
    </div>
  )
}

function StepHakAkhir({ off, user }: { off: Off; user: CurrentUser }) {
  const { openFinalPay } = useDirectoryNav()
  const rec = recordOfOff(off.no)
  const koperasi = off.clearance.some((c) => c.key === 'koperasi')
  const hr = can(user, 'ir.interview')
  const info = notEligible(off.nik)
  const st = rec ? statusOf(rec) : undefined
  return (
    <div className="space-y-4">
      {info && <Alert variant="info"><AlertDescription>{info}</AlertDescription></Alert>}
      {!info && (
        <div className="space-y-3 rounded-md border p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{rec ? rec.no : 'Catatan Hak Akhir'}</p>
              <p className="text-xs text-muted-foreground">Pesangon, UPMK, UPH, uang pisah, dan Kompensasi PKWT dihitung Payroll Officer dan disetujui HR & GA Manager di Payroll › Kompensasi & Pesangon.</p>
            </div>
            {rec && st && <StatusBadge variant={st === 'hitung' ? 'warning' : st === 'menunggu' ? 'info' : 'success'}>{HAK_STATUS_LABEL[st]}</StatusBadge>}
          </div>
          {rec && hr && rec.calc && <p className="tabular-nums">Total neto <span className="font-semibold">Rp {rec.calc.neto.toLocaleString('id-ID')}</span></p>}
          {rec && hr && !rec.calc && <p className="text-muted-foreground">Belum dihitung.</p>}
          {rec && (hr || user.role === 'payroll') && <Button variant="outline" size="sm" onClick={() => openFinalPay(rec.no)}>Buka Hak Akhir</Button>}
          {!rec && <p className="text-muted-foreground">Dibuat otomatis setelah proses keluar disetujui.</p>}
          {rec && st !== 'disetujui' && st !== 'dibayar' && <p className="text-xs text-warning">Tahap Selesai terbuka setelah catatan Hak Akhir Disetujui.</p>}
        </div>
      )}
      {koperasi && hr && (
        <dl className="space-y-2 rounded-md border p-3">
          <Row label="Kewajiban Koperasi">
            {off.koperasi ? (off.koperasi.keputusan === 'potong' ? <span className="font-medium tabular-nums">Potong hak akhir {rp(off.koperasi.potongan)} untuk Koperasi</span> : <span>{off.koperasi.keputusan === 'lunas' ? 'Lunas / tidak ada kewajiban' : 'Diselesaikan tunai'}</span>) : <span className="text-muted-foreground">Menunggu konfirmasi Bendahara</span>}
          </Row>
        </dl>
      )}
    </div>
  )
}

function StepSelesai({ off, user, onFinished, onSkk }: { off: Off; user: CurrentUser; onFinished: (o: Off) => number; onSkk: () => void }) {
  const [effects, setEffects] = useState<string[]>([])
  const nonaktif = addDayIso(off.tanggalKeluar)
  const done = off.status === 'selesai'
  const planned = [
    nonaktif > DEMO_TODAY ? `Terjadwal nonaktif ${formatDate(nonaktif)}` : `Nonaktif sejak ${formatDate(nonaktif)}`,
    'BPJS Kepesertaan Nonaktif mulai bulan berikutnya',
    ...(off.clearance.some((c) => c.key === 'koperasi') ? ['Keanggotaan Koperasi berstatus Keluar'] : []),
    'Pengajuan pegawai setelah tanggal keluar dibatalkan (alasan "Pegawai keluar")',
  ]
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">{done ? 'Efek yang berlaku' : 'Efek saat diselesaikan'}</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{(effects.length ? effects : planned).map((e) => <li key={e}>{e}</li>)}</ul>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/50 p-3">
        <div className="min-w-0"><p className="text-sm font-medium">Surat Keterangan Kerja (paklaring)</p><p className="truncate text-xs text-muted-foreground tabular-nums">{off.skkNo}{done ? '' : ' · DRAFT sampai tahap Selesai'}</p></div>
        <Button variant="outline" size="sm" onClick={onSkk}><FileText /> Pratinjau Surat</Button>
      </div>
      {done ? (
        <Alert variant="success"><Check /><AlertDescription>Proses keluar selesai · {off.selesai?.at}. {nonaktif > DEMO_TODAY ? `Terjadwal nonaktif ${formatDate(nonaktif)}; hari ini pegawai masih aktif.` : ''}</AlertDescription></Alert>
      ) : (
        can(user, 'ir.clearance') && reached(off) >= 6 && (
          <div className="flex justify-end">
            <Button onClick={() => { const r = finishOff(off.no, user); const n = r.off ? onFinished(r.off) : 0; setEffects(r.effects.map((e) => (e.startsWith('Pengajuan') ? `${n} pengajuan pegawai setelah tanggal keluar dibatalkan (alasan "Pegawai keluar")` : e))); toast.success(`Proses keluar ${off.no} selesai`) }}>Selesaikan</Button>
          </div>
        )
      )}
    </div>
  )
}
