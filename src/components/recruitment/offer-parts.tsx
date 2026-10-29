import { FileText, Lock, Send } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DocDialog } from '@/components/industrial/shared'
import { DatePicker } from '@/components/employee/date-picker'
import { Field } from '@/components/employee/field'
import { AlasanField, MoneyField, ReviewSheet } from '@/components/koperasi/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { avg, type Candidate } from '@/data/candidates'
import { levels } from '@/data/employees'
import { JENIS_LIST, statusOptionsOf } from '@/data/master/jenis'
import { GRADES } from '@/data/master/grades'
import { ambangInterview, masaPenawaran } from '@/data/master/recruitment'
import { POSITIONS, gradeList, positionByName } from '@/data/master/positions'
import { acceptOffer, belowAmbang, createOffer, declineOffer, negotiateOffer, offerApproved, offerReturned, offerSent, offerSubmitted } from '@/data/recruitment/flow'
import { jobOf, levelOfPosisi } from '@/data/recruitment/jobs'
import { approveOffer, effOfferStatus, rangeWarning, returnOffer, sendOffer, submitOffer, tanggalAkhir, updateOffer, type Offer, type OfferInput } from '@/data/recruitment/offers'
import { gradeRange } from '@/data/payroll/salaries'
import { formatDate, formatDateLong, terbilang } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { OfferBadge, Row, rp, SHEET_RECRUIT } from './shared'

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/** Form penawaran (Buat / Ubah Draft). Tunjangan Jabatan, uang makan, dan transport dibaca dari master dan tidak bisa diubah di sini. */
export function OfferFormSheet({ cand, offer, onClose, by }: { cand: Candidate; offer?: Offer; onClose: () => void; by: string }) {
  const job = jobOf(cand.lowonganId)
  const below = !offer && belowAmbang(cand)
  const [posisi, setPosisi] = useState(offer?.posisi ?? job?.posisi ?? cand.posisi)
  const [level, setLevel] = useState(offer?.level ?? job?.level ?? '')
  const [grade, setGrade] = useState(offer?.grade ?? job?.grade ?? '')
  const [jenis, setJenis] = useState(offer?.jenis ?? job?.jenis ?? 'Organik')
  const [statusKerja, setStatusKerja] = useState(offer?.statusKerja ?? job?.statusKerja ?? 'Kontrak')
  const [durasi, setDurasi] = useState(String(offer?.durasi ?? job?.durasi ?? 12))
  const [mulai, setMulai] = useState(offer?.tanggalMulai ?? '')
  const [gaji, setGaji] = useState(offer ? String(offer.gajiPokok) : '')
  const [benefit, setBenefit] = useState(offer?.benefit ?? 'BPJS Kesehatan dan Ketenagakerjaan, seragam kerja.')
  const [justif, setJustif] = useState(offer?.justifikasi ?? '')
  const [lanjut, setLanjut] = useState('')
  const [sub, setSub] = useState(false)
  const g = gradeRange(grade)
  const warn = rangeWarning(grade, Number(gaji))
  const kontrak = statusKerja === 'Kontrak'
  const eMulai = !mulai ? 'Tanggal mulai kerja wajib diisi' : mulai < DEMO_TODAY ? 'Tanggal mulai tidak boleh sebelum hari ini' : undefined
  const eGaji = !gaji || Number(gaji) <= 0 ? 'Nominal harus lebih dari 0' : undefined
  const eDur = kontrak && (!durasi || Number(durasi) < 1) ? 'Durasi kontrak minimal 1 bulan' : undefined
  const eJus = warn && !validAlasan(justif) ? ALASAN_ERROR : undefined
  const eLan = below && !validAlasan(lanjut) ? ALASAN_ERROR : undefined
  const preview = { statusKerja, tanggalMulai: mulai, durasi: Number(durasi) }
  const save = () => {
    setSub(true)
    if (eMulai || eGaji || eDur || eJus || eLan) return
    const input: OfferInput = { posisi, level, grade, jenis, statusKerja, durasi: kontrak ? Number(durasi) : 0, tanggalMulai: mulai, gajiPokok: Number(gaji), benefit: benefit.trim(), justifikasi: warn ? justif.trim() : undefined }
    if (offer) { updateOffer(offer.id, input, by); toast.success('Penawaran diperbarui') }
    else { createOffer(cand.id, input, by, below ? lanjut.trim() : undefined); toast.success('Penawaran dibuat sebagai Draft') }
    onClose()
  }
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_RECRUIT}>
        <SheetHeader className="border-b p-6 pr-12">
          <SheetTitle>{offer ? `Ubah Penawaran · versi ${offer.versi}` : 'Buat Penawaran'}</SheetTitle>
          <SheetDescription>{cand.nama} · {cand.id}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {below && (
            <>
              <Alert variant="warning"><AlertDescription>Rata-rata nilai interview {avg(cand)} di bawah ambang {ambangInterview()}. HR tetap dapat melanjutkan dengan catatan.</AlertDescription></Alert>
              <AlasanField id="of-lanjut" label="Catatan melanjutkan" value={lanjut} onChange={setLanjut} error={sub ? eLan : undefined} />
            </>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="of-posisi" label="Posisi" required className="sm:col-span-2" helper={`Dari Lowongan ${job?.no ?? ''}; dapat diubah`}>
              <Combobox id="of-posisi" value={posisi} items={POSITIONS.filter((p) => p.status === 'Aktif').map((p) => ({ value: p.nama, label: p.nama, sub: p.department ?? undefined }))} placeholder="Pilih posisi" searchPlaceholder="Cari posisi…"
                onChange={(v) => { setPosisi(v); setLevel(levelOfPosisi(v)); const p = positionByName(v); if (p) setGrade(gradeList(p.grade)[0]) }} />
            </Field>
            <Field id="of-level" label="Level" required>
              <Select value={level} onValueChange={setLevel}><SelectTrigger id="of-level" className="w-full"><SelectValue placeholder="Pilih level" /></SelectTrigger><SelectContent>{levels().map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
            </Field>
            <Field id="of-grade" label="Grade" required helper={g ? `Rentang ${g.kode}: ${rp(g.min)} – ${rp(g.max)}` : undefined}>
              <Select value={grade} onValueChange={setGrade}><SelectTrigger id="of-grade" className="w-full"><SelectValue placeholder="Pilih grade" /></SelectTrigger><SelectContent>{GRADES.map((x) => <SelectItem key={x.kode} value={x.kode}>{x.kode}</SelectItem>)}</SelectContent></Select>
            </Field>
            <Field id="of-jenis" label="Jenis Karyawan" required>
              <Select value={jenis} onValueChange={(v) => { setJenis(v); if (!statusOptionsOf(v).includes(statusKerja)) setStatusKerja('Kontrak') }}><SelectTrigger id="of-jenis" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{JENIS_LIST.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent></Select>
            </Field>
            <Field id="of-status" label="Status Kerja" required>
              <Select value={statusKerja} onValueChange={setStatusKerja}><SelectTrigger id="of-status" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{statusOptionsOf(jenis).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </Field>
            {kontrak && (
              <Field id="of-durasi" label="Durasi kontrak (bulan)" required error={sub ? eDur : undefined} helper={tanggalAkhir(preview) ? `Berakhir ${formatDate(tanggalAkhir(preview))}` : 'Angka bulat'}>
                <Input id="of-durasi" inputMode="numeric" value={durasi} aria-invalid={!!(sub && eDur) || undefined} onChange={(e) => setDurasi(e.target.value.replace(/\D/g, '').slice(0, 2))} />
              </Field>
            )}
            <Field id="of-mulai" label="Tanggal mulai kerja" required error={sub ? eMulai : undefined}>
              <DatePicker id="of-mulai" value={mulai} onChange={setMulai} invalid={!!(sub && eMulai)} />
            </Field>
            <div className="sm:col-span-2">
              <MoneyField id="of-gaji" label="Gaji Pokok" value={gaji} onChange={setGaji} error={sub ? eGaji : undefined} helper={g ? `Rentang Grade ${g.kode}: ${rp(g.min)} – ${rp(g.max)}` : undefined} />
              {warn && <p className="mt-2 flex items-start gap-1.5 text-xs text-warning" role="status">{warn}. Isi justifikasi di bawah.</p>}
            </div>
            {warn && <div className="sm:col-span-2"><AlasanField id="of-justif" label="Justifikasi gaji di luar rentang" value={justif} onChange={setJustif} error={sub ? eJus : undefined} /></div>}
            <Field id="of-tunj" label="Tunjangan Jabatan" helper={`Dari Level ${level || '—'} (master)`}><ReadOnlyInput id="of-tunj" value="Mengikuti master Level" /></Field>
            <Field id="of-makan" label="Uang makan & transport" helper="Dari master komponen gaji"><ReadOnlyInput id="of-makan" value="Mengikuti master Komponen" /></Field>
            <Field id="of-benefit" label="Catatan benefit" className="sm:col-span-2"><Textarea id="of-benefit" value={benefit} onChange={(e) => setBenefit(e.target.value)} /></Field>
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save}>{offer ? 'Simpan Perubahan' : 'Simpan sebagai Draft'}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function ReadOnlyInput({ id, value }: { id: string; value: string }) {
  return (
    <div className="relative">
      <Input id={id} readOnly value={value} className="bg-muted/50 pr-9 text-foreground" />
      <Lock className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  )
}

/** Ringkasan penawaran pada Sheet kandidat. Atasan hanya melihat status; rincian gaji hanya untuk HR. */
export function OfferSection({ offer, showPay, canEdit, onEdit, onPreview }: { offer: Offer; showPay: boolean; canEdit: boolean; onEdit: () => void; onPreview: () => void }) {
  const st = effOfferStatus(offer)
  const akhir = tanggalAkhir(offer)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><OfferBadge status={st} /><span className="text-xs text-muted-foreground tabular-nums">versi {offer.versi}</span></div>
        {showPay && <Button size="sm" variant="outline" onClick={onPreview}><FileText /> Pratinjau Surat</Button>}
      </div>
      {!showPay ? (
        <Alert variant="info"><Lock /><AlertDescription>Rincian gaji hanya untuk HR.</AlertDescription></Alert>
      ) : (
        <dl className="space-y-2 rounded-md border p-3">
          <Row label="No. surat"><span className="tabular-nums">{offer.olNo}</span></Row>
          <Row label="Posisi · Level">{offer.posisi} · {offer.level} · {offer.grade}</Row>
          <Row label="Status Kerja">{offer.jenis} · {offer.statusKerja}{offer.statusKerja === 'Kontrak' ? ` ${offer.durasi} bulan` : ''}</Row>
          <Row label="Tanggal mulai"><span className="tabular-nums">{formatDate(offer.tanggalMulai)}{akhir ? ` – ${formatDate(akhir)}` : ''}</span></Row>
          <Row label="Gaji Pokok"><span className="tabular-nums">{rp(offer.gajiPokok)}</span></Row>
          <Row label="Tunjangan Jabatan"><span className="tabular-nums">{rp(offer.tunjangan)}</span></Row>
          <Row label="Makan / Transport"><span className="tabular-nums">{rp(offer.makan)} / {rp(offer.transport)} per hari hadir</span></Row>
          {offer.justifikasi && <Row label="Justifikasi">{offer.justifikasi}</Row>}
          {offer.benefit && <Row label="Benefit">{offer.benefit}</Row>}
        </dl>
      )}
      {offer.dikirim && <p className="text-sm text-muted-foreground">Dikirim <span className="font-medium tabular-nums text-foreground">{formatDate(offer.dikirim.tanggal)}</span> · batas jawab <span className="font-medium tabular-nums text-foreground">{formatDate(offer.dikirim.batas)}</span></p>}
      {st === 'Kedaluwarsa' && <Alert variant="warning"><AlertDescription>Tidak ada jawaban sampai batas {formatDate(offer.dikirim!.batas)}. Kirim ulang penawaran atau batalkan proses.</AlertDescription></Alert>}
      {offer.dikembalikan && offer.status === 'Draft' && <Alert variant="warning"><AlertDescription>Dikembalikan oleh {offer.dikembalikan.by}: {offer.dikembalikan.alasan}</AlertDescription></Alert>}
      {offer.respon && showPay && (
        <p className="text-sm text-muted-foreground">Respons terakhir: <span className="font-medium text-foreground">{offer.respon.jenis}</span> · <span className="tabular-nums">{formatDate(offer.respon.tanggal)}</span>{offer.respon.alasan ? ` · ${offer.respon.alasan}` : ''}{offer.respon.file ? ` · ${offer.respon.file.name}` : ''}</p>
      )}
      {canEdit && offer.status === 'Draft' && <Button size="sm" variant="outline" onClick={onEdit}>Ubah Penawaran</Button>}
    </div>
  )
}

/** Surat penawaran: DRAFT sampai penawaran Disetujui. */
export function OfferLetterDialog({ offer, cand, onClose }: { offer: Offer | null; cand: Candidate | null; onClose: () => void }) {
  const st = offer ? effOfferStatus(offer) : 'Draft'
  const approved = !!offer && !['Draft', 'Menunggu Approval'].includes(st)
  const akhir = offer ? tanggalAkhir(offer) : ''
  const tgl = offer?.disetujui?.at ?? DEMO_TODAY
  return (
    <DocDialog open={!!offer && !!cand} onClose={onClose} title="Surat Penawaran Kerja" description={offer ? `${offer.olNo}${approved ? '' : ' · DRAFT sampai Disetujui'}` : ''} draft={!approved}>
      {offer && cand && (
        <>
          <div className="space-y-1">
            <p className="tabular-nums">Nomor : {offer.olNo}</p>
            <p>Perihal : Penawaran Kerja</p>
            <p className="tabular-nums">Tangerang, {formatDateLong(tgl)}</p>
          </div>
          <div><p>Kepada Yth.</p><p className="font-semibold">{cand.nama}</p><p className="text-muted-foreground">{cand.alamatDomisili}</p></div>
          <p>Berdasarkan hasil seleksi yang telah Saudara/i ikuti, dengan ini PT Primaplast Indonesia menawarkan posisi berikut:</p>
          <dl className="space-y-1">
            {([
              ['Posisi', `${offer.posisi} (Level ${offer.level}, Grade ${offer.grade})`],
              ['Penempatan', jobOf(cand.lowonganId)?.dept ?? cand.dept],
              ['Status Kerja', `${offer.jenis} · ${offer.statusKerja}${offer.statusKerja === 'Kontrak' ? ` selama ${offer.durasi} bulan` : ''}`],
              ['Tanggal mulai', `${formatDateLong(offer.tanggalMulai)}${akhir ? ` s.d. ${formatDateLong(akhir)}` : ''}`],
              ['Gaji Pokok', `${rp(offer.gajiPokok)} per bulan (${terbilang(offer.gajiPokok)})`],
              ['Tunjangan Jabatan', `${rp(offer.tunjangan)} per bulan`],
              ['Uang makan', `${rp(offer.makan)} per hari hadir`],
              ['Uang transport', `${rp(offer.transport)} per hari hadir`],
              ['Benefit lain', offer.benefit || '—'],
            ] as const).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[150px_1fr] gap-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">: {v}</dd></div>
            ))}
          </dl>
          <p>Penawaran ini berlaku {masaPenawaran()} hari sejak surat dikirim{offer.dikirim ? ` (sampai ${formatDateLong(offer.dikirim.batas)})` : ''}. Mohon mengembalikan salinan yang telah ditandatangani sebagai tanda persetujuan.</p>
          <div className="pt-6"><p>Hormat kami,</p><div className="h-12" /><p className="font-semibold">Lestari Wulandari</p><p className="text-muted-foreground">HR & GA Manager</p></div>
        </>
      )}
    </DocDialog>
  )
}

/** Catat respons kandidat: Menerima (file tertandatangani), Menolak (alasan → Batal), Negosiasi (kembali ke Draft versi berikutnya). */
export function OfferResponseDialog({ offer, onClose, by }: { offer: Offer; onClose: () => void; by: string }) {
  const [jenis, setJenis] = useState<'Menerima' | 'Menolak' | 'Negosiasi'>('Menerima')
  const [tanggal, setTanggal] = useState(DEMO_TODAY)
  const [file, setFile] = useState<PickedFile | null>(null)
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const eT = !tanggal ? 'Tanggal wajib diisi' : tanggal > DEMO_TODAY ? 'Tanggal tidak boleh di masa depan' : undefined
  const eF = jenis === 'Menerima' && !file ? 'Unggah surat penawaran yang sudah ditandatangani' : undefined
  const eA = jenis !== 'Menerima' && !validAlasan(alasan) ? ALASAN_ERROR : undefined
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat Respons Kandidat</DialogTitle>
          <DialogDescription>{offer.olNo} · batas jawab {offer.dikirim ? formatDate(offer.dikirim.batas) : '—'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={jenis} onValueChange={(v) => { setJenis(v as typeof jenis); setSub(false) }} aria-label="Respons kandidat">
            {([['Menerima', 'Kandidat menerima penawaran'], ['Menolak', 'Kandidat menolak (proses menjadi Batal)'], ['Negosiasi', 'Kandidat meminta negosiasi (kembali ke Draft versi berikutnya)']] as const).map(([v, d]) => (
              <div key={v} className="flex items-start gap-3 rounded-md border p-3">
                <RadioGroupItem id={`rsp-${v}`} value={v} className="mt-0.5" />
                <Label htmlFor={`rsp-${v}`} className="flex-col items-start gap-0.5"><span>{v}</span><span className="text-xs font-normal text-muted-foreground">{d}</span></Label>
              </div>
            ))}
          </RadioGroup>
          <Field id="rsp-tgl" label="Tanggal respons" required error={sub ? eT : undefined}><DatePicker id="rsp-tgl" value={tanggal} onChange={setTanggal} invalid={!!(sub && eT)} /></Field>
          {jenis === 'Menerima' ? (
            <Field id="rsp-file" label="Surat penawaran bertanda tangan" required error={sub ? eF : undefined} helper="PDF, JPG, atau PNG, maksimal 5 MB">
              <FilePicker id="rsp-file" accept=".pdf,.jpg,.jpeg,.png" extensions={['pdf', 'jpg', 'jpeg', 'png']} maxBytes={5 * 1048576} typeError="Format file harus PDF, JPG, atau PNG" value={file} onChange={setFile} />
            </Field>
          ) : (
            <AlasanField id="rsp-alasan" label={jenis === 'Menolak' ? 'Alasan kandidat menolak' : 'Catatan negosiasi'} value={alasan} onChange={setAlasan} error={sub ? eA : undefined} />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => {
            setSub(true)
            if (eT || eF || eA) return
            if (jenis === 'Menerima') { acceptOffer(offer.id, tanggal, { name: file!.name, size: file!.size }, by); toast.success('Penawaran diterima. Kandidat masuk tahap Diterima') }
            else if (jenis === 'Menolak') { declineOffer(offer.id, tanggal, alasan.trim(), by); toast.success('Respons dicatat. Proses kandidat dibatalkan') }
            else { negotiateOffer(offer.id, tanggal, alasan.trim(), by); toast.success(`Penawaran kembali ke Draft (versi ${offer.versi})`) }
            onClose()
          }}>Simpan Respons</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SendOfferDialog({ offer, open, onClose, by }: { offer: Offer; open: boolean; onClose: () => void; by: string }) {
  const batas = addDays(DEMO_TODAY, masaPenawaran())
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kirim penawaran ke kandidat?</AlertDialogTitle>
          <AlertDialogDescription>Surat {offer.olNo} dikirim hari ini. Batas jawab {formatDate(batas)} ({masaPenawaran()} hari sejak dikirim).</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={() => { sendOffer(offer.id, by); offerSent(offer.kandidatId, by, batas); toast.success(`Penawaran dikirim. Batas jawab ${formatDate(batas)}`) }}><Send /> Kirim ke Kandidat</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Approval penawaran (HR & GA Manager): data penawaran, surat, lalu Setujui atau Tolak dengan alasan. */
export function OfferReviewSheet({ offer, cand, onClose, by }: { offer: Offer; cand: Candidate; onClose: () => void; by: string }) {
  const [preview, setPreview] = useState(false)
  return (
    <>
      <ReviewSheet
        open
        onOpenChange={(o) => !o && onClose()}
        title="Tinjau Penawaran"
        description={`${cand.nama} · ${offer.posisi} · ${offer.olNo}`}
        diajukan={offer.diajukan?.at ?? DEMO_TODAY}
        oleh={offer.diajukan?.by ?? 'Admin HRD'}
        note={offer.versi > 1 ? `Versi ${offer.versi} setelah negosiasi dengan kandidat.` : null}
        rejectTitle="Tolak penawaran?"
        onApprove={() => { approveOffer(offer.id, by); offerApproved(offer.kandidatId, by); toast.success('Penawaran disetujui'); onClose() }}
        onReject={(alasan) => { returnOffer(offer.id, by, alasan); offerReturned(offer.kandidatId, by, alasan); toast.success('Penawaran dikembalikan ke Admin HRD'); onClose() }}
      >
        <div className="space-y-3">
          <OfferSection offer={offer} showPay canEdit={false} onEdit={() => {}} onPreview={() => setPreview(true)} />
          <p className="text-xs text-muted-foreground">Nilai interview rata-rata <span className="font-medium tabular-nums text-foreground">{avg(cand)}</span> (ambang {ambangInterview()}).</p>
        </div>
      </ReviewSheet>
      <OfferLetterDialog offer={preview ? offer : null} cand={cand} onClose={() => setPreview(false)} />
    </>
  )
}

export function submitOfferFlow(offer: Offer, by: string) {
  submitOffer(offer.id, by)
  offerSubmitted(offer.kandidatId, by, offer.versi)
  toast.success('Penawaran diajukan ke HR & GA Manager')
}
