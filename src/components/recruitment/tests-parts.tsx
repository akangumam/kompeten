import { Mail } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/employee/date-picker'
import { Field } from '@/components/employee/field'
import { TestBadge, LulusBadge } from '@/components/recruitment/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FilePicker, type PickedFile } from '@/components/ui/file-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Candidate } from '@/data/candidates'
import { inputNilai, inviteTest, resendInvite } from '@/data/recruitment/flow'
import { jobOf } from '@/data/recruitment/jobs'
import { PAKET, REKOMENDASI, effTestStatus, lulusOf, paketOf, type Rekomendasi, type TestAssign } from '@/data/recruitment/tests'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/** Undang Tes: pilih paket (bawaan: paket pada Lowongan) + jadwal dan batas waktu. Tautan memakai record yang sama untuk portal 09f. */
export function InviteTestDialog({ cand, assigned, onClose, by }: { cand: Candidate | null; assigned: string[]; onClose: () => void; by: string }) {
  const job = cand ? jobOf(cand.lowonganId) : undefined
  const available = PAKET.filter((p) => p.status === 'Aktif' && !assigned.includes(p.id))
  const [pick, setPick] = useState<string[] | null>(null)
  const [jadwal, setJadwal] = useState(DEMO_TODAY)
  const [batas, setBatas] = useState(addDays(DEMO_TODAY, 3))
  const [sub, setSub] = useState(false)
  const chosen = pick ?? (job?.paketIds ?? []).filter((id) => available.some((p) => p.id === id))
  const eP = chosen.length === 0 ? 'Pilih minimal satu paket tes' : undefined
  const eB = batas < jadwal ? 'Batas waktu tidak boleh sebelum jadwal' : undefined
  const close = () => { setPick(null); setSub(false); onClose() }
  return (
    <Dialog open={!!cand} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Undang Tes · {cand?.nama}</DialogTitle>
          <DialogDescription>Paket bawaan mengikuti Lowongan {job?.no}. Tautan tes dikirim ke email kandidat.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Paket tes <span aria-hidden className="text-danger">*</span></legend>
            {available.map((p) => (
              <div key={p.id} className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox id={`inv-${p.id}`} checked={chosen.includes(p.id)} onCheckedChange={(c) => setPick(c ? [...chosen, p.id] : chosen.filter((x) => x !== p.id))} />
                <Label htmlFor={`inv-${p.id}`} className="flex-col items-start gap-0.5">
                  <span>{p.nama}</span>
                  <span className="text-xs font-normal text-muted-foreground">{p.jenis === 'online' ? `${p.soal.length} soal · ${p.durasi} menit · passing ${p.passing}` : p.jenis === 'psikotes' ? 'Laporan dan rekomendasi dari lembaga eksternal' : `Praktik offline · passing ${p.passing}`}</span>
                </Label>
              </div>
            ))}
            {sub && eP && <p className="text-sm text-danger">{eP}</p>}
          </fieldset>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="inv-jadwal" label="Jadwal" required helper="Tanggal tes mulai dibuka"><DatePicker id="inv-jadwal" value={jadwal} onChange={setJadwal} /></Field>
            <Field id="inv-batas" label="Batas waktu" required error={sub ? eB : undefined}><DatePicker id="inv-batas" value={batas} onChange={setBatas} invalid={!!(sub && eB)} /></Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Batal</Button>
          <Button onClick={() => {
            setSub(true)
            if (eP || eB || !cand) return
            inviteTest(cand.id, chosen, jadwal, batas, by)
            toast.success(`Tautan tes dikirim ke ${cand.email}`)
            close()
          }}>
            <Mail /> Kirim Undangan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Input nilai manual (demo): online/praktik = angka 0–100; psikotes = laporan + rekomendasi. */
export function ScoreDialog({ assign, onClose, by }: { assign: TestAssign | null; onClose: () => void; by: string }) {
  const p = assign ? paketOf(assign.paketId) : undefined
  const [nilai, setNilai] = useState('')
  const [rek, setRek] = useState<Rekomendasi | ''>('')
  const [file, setFile] = useState<PickedFile | null>(null)
  const [sub, setSub] = useState(false)
  const psik = p?.jenis === 'psikotes'
  const n = nilai === '' ? NaN : Number(nilai)
  const eN = !psik && (nilai === '' || n < 0 || n > 100) ? 'Isi nilai 0–100' : undefined
  const eR = psik && !rek ? 'Pilih rekomendasi' : undefined
  const eF = psik && !(file ?? assign?.laporan) ? 'Unggah laporan psikotes' : undefined
  const preview: boolean | undefined = psik ? (rek ? rek !== 'Tidak disarankan' : undefined) : Number.isNaN(n) || p?.passing == null ? undefined : n >= p.passing
  const close = () => { setNilai(''); setRek(''); setFile(null); setSub(false); onClose() }
  return (
    <Dialog open={!!assign} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Input nilai · {p?.nama}</DialogTitle>
          <DialogDescription>Nilai manual untuk demo. Pengerjaan online oleh pelamar dibuat pada tahap berikutnya.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {psik ? (
            <>
              <Field id="sc-file" label="Laporan psikotes" required error={sub ? eF : undefined} helper="PDF, maksimal 5 MB">
                <FilePicker id="sc-file" accept=".pdf" extensions={['pdf']} maxBytes={5 * 1048576} typeError="Format file harus PDF" value={file ?? assign?.laporan ?? null} onChange={setFile} />
              </Field>
              <Field id="sc-rek" label="Rekomendasi" required error={sub ? eR : undefined}>
                <Select value={rek} onValueChange={(v) => setRek(v as Rekomendasi)}>
                  <SelectTrigger id="sc-rek" className="w-full" aria-invalid={!!(sub && eR) || undefined}><SelectValue placeholder="Pilih rekomendasi" /></SelectTrigger>
                  <SelectContent>{REKOMENDASI.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </>
          ) : (
            <Field id="sc-nilai" label="Nilai (0–100)" required error={sub ? eN : undefined} helper={`Passing grade ${p?.passing ?? '—'}`}>
              <Input id="sc-nilai" inputMode="numeric" value={nilai} aria-invalid={!!(sub && eN) || undefined} onChange={(e) => setNilai(e.target.value.replace(/\D/g, '').slice(0, 3))} />
            </Field>
          )}
          {preview !== undefined && (
            <Alert variant={preview ? 'success' : 'warning'}>
              <AlertDescription>{preview ? 'Memenuhi passing grade.' : psik ? 'Tidak disarankan: kandidat tidak dapat lanjut ke Interview.' : `Di bawah passing grade ${p?.passing}. Kandidat belum dapat lanjut ke Interview.`}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Batal</Button>
          <Button onClick={() => {
            setSub(true)
            if (eN || eR || eF || !assign) return
            inputNilai(assign.id, psik ? { rekomendasi: rek as Rekomendasi, laporan: file ? { name: file.name, size: file.size } : undefined } : { nilai: n }, by)
            toast.success('Hasil tes disimpan')
            close()
          }}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Kirim ulang undangan: batas waktu baru. */
export function ResendDialog({ assign, onClose, by }: { assign: TestAssign | null; onClose: () => void; by: string }) {
  const [batas, setBatas] = useState(addDays(DEMO_TODAY, 3))
  return (
    <Dialog open={!!assign} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Kirim ulang undangan</DialogTitle>
          <DialogDescription>{assign ? `${paketOf(assign.paketId)?.nama} · tautan dikirim ke ${assign.dikirimKe}` : ''}</DialogDescription>
        </DialogHeader>
        <Field id="rs-batas" label="Batas waktu baru" required><DatePicker id="rs-batas" value={batas} onChange={setBatas} /></Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => { if (!assign) return; resendInvite(assign.id, batas, by); toast.success(`Tautan tes dikirim ke ${assign.dikirimKe}`); onClose() }}>Kirim Ulang</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function nilaiCell(a: TestAssign) {
  const p = paketOf(a.paketId)
  if (a.status !== 'Selesai') return '—'
  return p?.jenis === 'psikotes' ? a.rekomendasi : `${a.nilai}${p?.passing != null ? ` / passing ${p.passing}` : ''}`
}

/** Daftar penugasan tes pada Sheet kandidat. */
export function TestsSection({ list, canInput, onInput, onResend }: { list: TestAssign[]; canInput: boolean; onInput: (a: TestAssign) => void; onResend: (a: TestAssign) => void }) {
  return (
    <ul className="space-y-2">
      {list.map((a) => {
        const p = paketOf(a.paketId)
        const st = effTestStatus(a)
        return (
          <li key={a.id} className="space-y-2 rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{p?.nama}</p>
                <p className="text-xs text-muted-foreground tabular-nums">Jadwal {formatDate(a.jadwal)} · batas {formatDate(a.batas)}</p>
              </div>
              <TestBadge status={st} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Nilai: <span className="font-medium tabular-nums text-foreground">{nilaiCell(a)}</span></span>
              <div className="flex items-center gap-2"><LulusBadge lulus={lulusOf(a)} />
                {canInput && st !== 'Selesai' && <Button size="sm" variant="outline" onClick={() => onInput(a)}>Input nilai manual</Button>}
                {canInput && st === 'Kedaluwarsa' && <Button size="sm" variant="ghost" onClick={() => onResend(a)}>Kirim ulang</Button>}
              </div>
            </div>
            {a.laporan && <p className="truncate text-xs text-muted-foreground">Laporan: {a.laporan.name}</p>}
          </li>
        )
      })}
    </ul>
  )
}
