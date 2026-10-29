import { CalendarClock } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/employee/date-picker'
import { Field } from '@/components/employee/field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/textarea'
import { avg, type Candidate, type InterviewInfo } from '@/data/candidates'
import { interviewerOptions, saveInterviewInfo, saveScore, startInterview, userInterviewerFor } from '@/data/recruitment/flow'
import { ambangInterview } from '@/data/master/recruitment'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { Row } from './shared'

const validJam = (t: string) => /^([01]\d|2[0-3])\.[0-5]\d$/.test(t)

/** Jadwal interview: dipakai untuk "Lanjut Interview" (mode start) dan "Ubah jadwal". */
export function ScheduleDialog({ cand, mode, onClose, by }: { cand: Candidate | null; mode: 'start' | 'edit'; onClose: () => void; by: string }) {
  const def = cand ? userInterviewerFor(cand.dept) : { nik: '', nama: '' }
  const ex = cand?.interview
  const [tanggal, setTanggal] = useState(ex?.tanggal ?? '')
  const [jam, setJam] = useState(ex?.jam ?? '09.00')
  const [lokasi, setLokasi] = useState(ex?.lokasi ?? '')
  const [userNik, setUserNik] = useState(ex?.userNik ?? def.nik)
  const [sub, setSub] = useState(false)
  const opts = interviewerOptions()
  const eT = !tanggal ? 'Tanggal wajib diisi' : tanggal < DEMO_TODAY ? 'Tanggal tidak boleh sebelum hari ini' : undefined
  const eJ = !validJam(jam) ? 'Format jam HH.MM, contoh 09.30' : undefined
  const eL = !lokasi.trim() ? 'Lokasi atau tautan online wajib diisi' : undefined
  const eU = !userNik ? 'Pilih pewawancara user' : undefined
  const close = () => { setSub(false); onClose() }
  return (
    <Dialog open={!!cand} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'start' ? 'Lanjut Interview' : 'Ubah jadwal interview'} · {cand?.nama}</DialogTitle>
          <DialogDescription>{mode === 'start' ? 'Semua paket tes sudah lulus. Atur jadwal dan pewawancara.' : 'Perubahan jadwal tercatat di Riwayat Status.'}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="iv-tgl" label="Tanggal" required error={sub ? eT : undefined}><DatePicker id="iv-tgl" value={tanggal} onChange={setTanggal} invalid={!!(sub && eT)} /></Field>
          <Field id="iv-jam" label="Jam" required error={sub ? eJ : undefined} helper="Format 09.30">
            <Input id="iv-jam" value={jam} inputMode="numeric" aria-invalid={!!(sub && eJ) || undefined} onChange={(e) => setJam(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))} />
          </Field>
          <Field id="iv-lokasi" label="Lokasi atau tautan online" required error={sub ? eL : undefined} className="sm:col-span-2">
            <Input id="iv-lokasi" value={lokasi} aria-invalid={!!(sub && eL) || undefined} placeholder="Ruang Meeting HR, Lantai 2 atau https://meet…" onChange={(e) => setLokasi(e.target.value)} />
          </Field>
          <Field id="iv-user" label="Pewawancara User" required error={sub ? eU : undefined} helper="Atasan dari department peminta; tidak melihat gaji">
            <Combobox id="iv-user" value={userNik} items={opts.map((o) => ({ value: o.nik, label: o.nama, sub: o.sub }))} onChange={setUserNik} placeholder="Pilih pewawancara" searchPlaceholder="Cari nama…" invalid={!!(sub && eU)} />
          </Field>
          <Field id="iv-hr" label="Pewawancara HR"><Input id="iv-hr" readOnly value="Admin HRD" className="bg-muted/50 text-foreground" /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Batal</Button>
          <Button onClick={() => {
            setSub(true)
            if (eT || eJ || eL || eU || !cand) return
            const u = opts.find((o) => o.nik === userNik)!
            const info: InterviewInfo = { tanggal, jam, lokasi: lokasi.trim(), userNik, userNama: u.nama, hrNama: 'Admin HRD' }
            if (mode === 'start') { startInterview(cand.id, info, by); toast.success('Kandidat lanjut ke Interview') }
            else { saveInterviewInfo(cand.id, info, by); toast.success('Jadwal interview diperbarui') }
            close()
          }}>
            <CalendarClock /> {mode === 'start' ? 'Lanjut Interview' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Input nilai interview 0–100: Nilai User oleh Atasan, Nilai HR oleh Admin HRD. */
export function ScoreInputDialog({ cand, who, onClose, by }: { cand: Candidate | null; who: 'user' | 'hr'; onClose: () => void; by: string }) {
  const [nilai, setNilai] = useState('')
  const [cat, setCat] = useState('')
  const [sub, setSub] = useState(false)
  const n = nilai === '' ? NaN : Number(nilai)
  const e = Number.isNaN(n) || n < 0 || n > 100 ? 'Isi nilai 0–100' : undefined
  const close = () => { setNilai(''); setCat(''); setSub(false); onClose() }
  return (
    <Dialog open={!!cand} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nilai {who === 'user' ? 'User' : 'HR'} · {cand?.nama}</DialogTitle>
          <DialogDescription>{who === 'user' ? 'Penilaian dari sudut pandang atasan pengguna.' : 'Penilaian HR; catatan tersimpan sebagai Catatan Internal HRD.'}</DialogDescription>
        </DialogHeader>
        <Field id="sn-nilai" label="Nilai (0–100)" required error={sub ? e : undefined}>
          <Input id="sn-nilai" inputMode="numeric" value={nilai} aria-invalid={!!(sub && e) || undefined} onChange={(x) => setNilai(x.target.value.replace(/\D/g, '').slice(0, 3))} />
        </Field>
        <Field id="sn-cat" label="Catatan" helper="Opsional">
          <Textarea id="sn-cat" value={cat} onChange={(x) => setCat(x.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Batal</Button>
          <Button onClick={() => {
            setSub(true)
            if (e || !cand) return
            saveScore(cand.id, who, n, cat.trim(), by)
            toast.success(`Nilai ${who === 'user' ? 'User' : 'HR'} disimpan`)
            close()
          }}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const Score = ({ label, value }: { label: string; value?: number }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    {value != null ? <span className="font-semibold tabular-nums">{value}<span className="font-normal text-muted-foreground"> / 100</span></span> : <StatusBadge variant="neutral">Belum Dinilai</StatusBadge>}
  </div>
)

export function InterviewSection({ c, internal, canUserScore, canHrScore, canEdit, onUser, onHr, onEdit }: {
  c: Candidate
  /** Catatan Internal HRD hanya untuk Admin HRD dan HR & GA Manager. */
  internal: boolean
  canUserScore: boolean
  canHrScore: boolean
  canEdit: boolean
  onUser: () => void
  onHr: () => void
  onEdit: () => void
}) {
  const a = avg(c)
  const ambang = ambangInterview()
  const iv = c.interview
  return (
    <div className="space-y-3">
      {iv && (
        <dl className="space-y-2 rounded-md border p-3">
          <Row label="Jadwal"><span className="tabular-nums">{formatDate(iv.tanggal)}, {iv.jam} WIB</span></Row>
          <Row label="Lokasi / tautan">{iv.lokasi}</Row>
          <Row label="Pewawancara User">{iv.userNama}</Row>
          <Row label="Pewawancara HR">{iv.hrNama}</Row>
        </dl>
      )}
      <div className="space-y-2">
        <Score label="Nilai User" value={c.userScore} />
        <Score label="Nilai HR" value={c.hrScore} />
        {a !== null && (
          <div className="flex items-center justify-between border-t pt-2 text-sm">
            <span className="font-medium">Rata-rata</span>
            <span className="flex items-center gap-2"><span className="font-semibold tabular-nums">{a}</span>
              <StatusBadge variant={a >= ambang ? 'success' : 'warning'}>{a >= ambang ? `≥ ambang ${ambang}` : `< ambang ${ambang}`}</StatusBadge></span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {canUserScore && <Button size="sm" variant="outline" onClick={onUser}>{c.userScore != null ? 'Ubah' : 'Input'} Nilai User</Button>}
        {canHrScore && <Button size="sm" variant="outline" onClick={onHr}>{c.hrScore != null ? 'Ubah' : 'Input'} Nilai HR</Button>}
        {canEdit && iv && <Button size="sm" variant="ghost" onClick={onEdit}>Ubah jadwal</Button>}
      </div>
      {c.userCatatan && <div className="space-y-1"><p className="text-sm text-muted-foreground">Catatan User</p><p className="text-sm">{c.userCatatan}</p></div>}
      {internal && c.notes && <div className="space-y-1"><p className="text-sm text-muted-foreground">Catatan Internal HRD</p><p className="text-sm">{c.notes}</p></div>}
      {internal && c.lanjutCatatan && <Alert variant="warning"><AlertDescription>Dilanjutkan di bawah ambang: {c.lanjutCatatan}</AlertDescription></Alert>}
    </div>
  )
}
