import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { BerlakuField, EditSheet, idr, MasterCard } from '@/components/master/common'
import { RupiahField } from '@/components/payroll/rupiah-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { nextPeriodStart } from '@/data/master/attendance-rules'
import { PEMBAGI } from '@/data/master/levels'
import { UPAH_DIVISOR } from '@/data/overtime'
import { addPayAudit } from '@/data/payroll/audit'
import { datedAt, type Dated } from '@/data/payroll/dated'
import {
  diffKes,
  diffTk,
  JKK_RATES,
  KES,
  kesAt,
  pct,
  PTKP_LIST,
  RISK_LEVELS,
  saveKes,
  saveTk,
  TER,
  TER_OF_PTKP,
  TK,
  tkAt,
  type BpjsKes,
  type BpjsTk,
  type RiskLevel,
  type TerCategory,
} from '@/data/payroll/statutory'
import { bump, usePayroll } from '@/data/payroll/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { AlasanField } from '@/components/ui/alasan-field'

function Def({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{children}</dd>
    </div>
  )
}

/** Riwayat nilai berlaku: terbaru di atas, dengan ringkasan perubahan dari versi sebelumnya. */
function ParamHistory<T>({ list, diff }: { list: Dated<T>[]; diff: (a: T | undefined, b: T) => string }) {
  const sorted = [...list].sort((a, b) => a.berlakuMulai.localeCompare(b.berlakuMulai))
  const current = datedAt(list, DEMO_TODAY)
  return (
    <section aria-label="Riwayat parameter" className="space-y-2">
      <h4 className="text-sm font-medium">Riwayat</h4>
      <ol className="space-y-2">
        {sorted
          .map((e, i) => ({ e, text: diff(sorted[i - 1]?.value, e.value) }))
          .reverse()
          .map(({ e, text }) => (
            <li key={e.berlakuMulai} className="rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium tabular-nums">Berlaku mulai {formatDate(e.berlakuMulai)}</span>
                {e === current ? <StatusBadge variant="success">Berlaku saat ini</StatusBadge> : e.berlakuMulai > DEMO_TODAY ? <StatusBadge variant="info">Terjadwal</StatusBadge> : null}
              </div>
              <p className="mt-1 tabular-nums">{text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {e.oleh ?? 'Payroll Officer'}
                {e.alasan ? ` · ${e.alasan}` : ''}
              </p>
            </li>
          ))}
      </ol>
    </section>
  )
}

const num = (v: string) => Number(v.replace(',', '.'))
const pctErr = (v: string) => (v.trim() === '' || Number.isNaN(num(v)) ? 'Persentase wajib diisi' : num(v) < 0 || num(v) > 100 ? 'Persentase harus antara 0 dan 100' : '')

function PercentField({ id, label, value, onChange, error, onBlur }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; onBlur?: () => void }) {
  return (
    <Field id={id} label={label} required error={error} helper="Persentase, contoh: 3,7">
      <Input id={id} inputMode="decimal" className="tabular-nums" value={value} aria-invalid={!!error || undefined} onChange={(e) => onChange(e.target.value.replace(/[^\d,]/g, ''))} onBlur={onBlur} />
    </Field>
  )
}
const toStr = (n: number) => String(n).replace('.', ',')

/* ---------- BPJS Kesehatan ---------- */
function KesSheet({ user, onClose }: { user: CurrentUser; onClose: () => void }) {
  const cur = kesAt(DEMO_TODAY)
  const [f, setF] = useState({ perusahaan: toStr(cur.perusahaan), pegawai: toStr(cur.pegawai), batas: String(cur.batas) })
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const e = { perusahaan: pctErr(f.perusahaan), pegawai: pctErr(f.pegawai), batas: f.batas === '' || Number(f.batas) <= 0 ? 'Nominal harus lebih dari 0' : '' }
  const alasanErr = sub && !validAlasan(alasan) ? ALASAN_ERROR : ''
  return (
    <EditSheet
      title="Edit BPJS Kesehatan"
      description="Perpres 64/2020 · berlaku untuk seluruh pegawai"
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (e.perusahaan || e.pegawai || e.batas || !berlaku || !validAlasan(alasan)) return
        const next: BpjsKes = { perusahaan: num(f.perusahaan), pegawai: num(f.pegawai), batas: Number(f.batas) }
        const text = diffKes(datedAt(KES, berlaku).value, next)
        if (text === 'Tanpa perubahan nilai') return toast.info('Tidak ada perubahan nilai')
        saveKes({ berlakuMulai: berlaku, value: next, oleh: user.nama, alasan: alasan.trim() })
        addPayAudit({ by: user.nama, group: 'BPJS & PPh 21', entitas: 'BPJS Kesehatan', perubahan: text, berlaku, alasan: alasan.trim() })
        bump()
        toast.success(`BPJS Kesehatan diperbarui, berlaku ${formatDate(berlaku)}`)
        onClose()
      }}
    >
      <PercentField id="kes-p" label="Perusahaan (%)" value={f.perusahaan} error={sub ? e.perusahaan : undefined} onChange={(v) => setF({ ...f, perusahaan: v })} />
      <PercentField id="kes-e" label="Pegawai (%)" value={f.pegawai} error={sub ? e.pegawai : undefined} onChange={(v) => setF({ ...f, pegawai: v })} />
      <RupiahField id="kes-batas" label="Batas upah" value={f.batas} error={sub ? e.batas : undefined} onChange={(v) => setF({ ...f, batas: v })} />
      <BerlakuField id="kes-berlaku" value={berlaku} onChange={setBerlaku} error={sub && !berlaku ? 'Berlaku mulai wajib diisi' : undefined} />
      <AlasanField id="kes-alasan" label="Alasan perubahan" value={alasan} onChange={setAlasan} error={alasanErr} />
    </EditSheet>
  )
}

/* ---------- BPJS Ketenagakerjaan ---------- */
function TkSheet({ user, onClose }: { user: CurrentUser; onClose: () => void }) {
  const cur = tkAt(DEMO_TODAY)
  const [f, setF] = useState({
    jhtP: toStr(cur.jhtPerusahaan), jhtE: toStr(cur.jhtPegawai), jpP: toStr(cur.jpPerusahaan), jpE: toStr(cur.jpPegawai),
    jpBatas: String(cur.jpBatas), jkk: cur.jkk as RiskLevel, jkm: toStr(cur.jkm),
  })
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const e = { jhtP: pctErr(f.jhtP), jhtE: pctErr(f.jhtE), jpP: pctErr(f.jpP), jpE: pctErr(f.jpE), jkm: pctErr(f.jkm), jpBatas: f.jpBatas === '' || Number(f.jpBatas) <= 0 ? 'Nominal harus lebih dari 0' : '' }
  const alasanErr = sub && !validAlasan(alasan) ? ALASAN_ERROR : ''
  const bad = Object.values(e).some(Boolean)
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })
  return (
    <EditSheet
      title="Edit BPJS Ketenagakerjaan"
      description="JHT, JP, JKK, dan JKM · berlaku untuk seluruh pegawai"
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (bad || !berlaku || !validAlasan(alasan)) return
        const next: BpjsTk = {
          jhtPerusahaan: num(f.jhtP), jhtPegawai: num(f.jhtE), jpPerusahaan: num(f.jpP), jpPegawai: num(f.jpE),
          jpBatas: Number(f.jpBatas), jkk: f.jkk, jkm: num(f.jkm),
        }
        const text = diffTk(datedAt(TK, berlaku).value, next)
        if (text === 'Tanpa perubahan nilai') return toast.info('Tidak ada perubahan nilai')
        saveTk({ berlakuMulai: berlaku, value: next, oleh: user.nama, alasan: alasan.trim() })
        addPayAudit({ by: user.nama, group: 'BPJS & PPh 21', entitas: 'BPJS Ketenagakerjaan', perubahan: text, berlaku, alasan: alasan.trim() })
        bump()
        toast.success(`BPJS Ketenagakerjaan diperbarui, berlaku ${formatDate(berlaku)}`)
        onClose()
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PercentField id="tk-jhtp" label="JHT perusahaan (%)" value={f.jhtP} error={sub ? e.jhtP : undefined} onChange={set('jhtP')} />
        <PercentField id="tk-jhte" label="JHT pegawai (%)" value={f.jhtE} error={sub ? e.jhtE : undefined} onChange={set('jhtE')} />
        <PercentField id="tk-jpp" label="JP perusahaan (%)" value={f.jpP} error={sub ? e.jpP : undefined} onChange={set('jpP')} />
        <PercentField id="tk-jpe" label="JP pegawai (%)" value={f.jpE} error={sub ? e.jpE : undefined} onChange={set('jpE')} />
      </div>
      <RupiahField id="tk-jpbatas" label="Batas upah JP" value={f.jpBatas} error={sub ? e.jpBatas : undefined} onChange={set('jpBatas')} />
      <Field id="tk-jkk" label="JKK · tingkat risiko" required helper="Sesuaikan dengan tingkat risiko yang terdaftar di BPJS Ketenagakerjaan">
        <Select value={f.jkk} onValueChange={(v) => setF({ ...f, jkk: v as RiskLevel })}>
          <SelectTrigger id="tk-jkk" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RISK_LEVELS.map((r) => <SelectItem key={r} value={r}>{r} {pct(JKK_RATES[r])}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <PercentField id="tk-jkm" label="JKM (%)" value={f.jkm} error={sub ? e.jkm : undefined} onChange={set('jkm')} />
      <BerlakuField id="tk-berlaku" value={berlaku} onChange={setBerlaku} error={sub && !berlaku ? 'Berlaku mulai wajib diisi' : undefined} />
      <AlasanField id="tk-alasan" label="Alasan perubahan" value={alasan} onChange={setAlasan} error={alasanErr} />
    </EditSheet>
  )
}

/* ---------- TER viewer ---------- */
function TerTable({ cat }: { cat: TerCategory }) {
  const rows = TER[cat]
  const members = PTKP_LIST.filter((p) => TER_OF_PTKP[p] === cat).join(', ')
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Kategori {cat}: {members}</p>
      <div className="max-h-80 overflow-y-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground">Penghasilan bruto per bulan</TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground">Tarif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(([upTo, rate], i) => (
              <TableRow key={upTo} className="h-10 hover:bg-muted/50">
                <TableCell className="tabular-nums">
                  {i === 0 ? `s.d. ${idr(upTo)}` : `${idr(rows[i - 1][0] + 1)} – ${idr(upTo)}`}
                </TableCell>
                <TableCell className="text-right tabular-nums">{pct(rate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

type Props = { user: CurrentUser; canEdit: boolean; canOpenMaster: boolean; onGotoPage: (p: 'master-data' | 'overtime') => void }

export function StatutoryTab({ user, canEdit, canOpenMaster, onGotoPage }: Props) {
  usePayroll()
  const [sheet, setSheet] = useState<'kes' | 'tk' | null>(null)
  const kes = kesAt(DEMO_TODAY)
  const tk = tkAt(DEMO_TODAY)
  const editBtn = (k: 'kes' | 'tk') =>
    canEdit && (
      <Button variant="outline" size="sm" onClick={() => setSheet(k)}>
        <Pencil /> Edit
      </Button>
    )
  const kesFut = KES.some((x) => x.berlakuMulai > DEMO_TODAY)
  const tkFut = TK.some((x) => x.berlakuMulai > DEMO_TODAY)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MasterCard title="BPJS Kesehatan" description="Iuran dihitung dari upah (Gaji Pokok + Tunjangan Jabatan)" action={editBtn('kes')}>
          <dl className="divide-y">
            <Def label="Perusahaan">{pct(kes.perusahaan)}</Def>
            <Def label="Pegawai">{pct(kes.pegawai)}</Def>
            <Def label="Batas upah">{idr(kes.batas)}</Def>
          </dl>
          {kesFut && <Alert variant="info"><AlertDescription>Ada perubahan terjadwal; lihat riwayat di bawah.</AlertDescription></Alert>}
          <p className="text-xs text-muted-foreground">Sumber: Perpres 64/2020</p>
          <ParamHistory list={KES} diff={diffKes} />
        </MasterCard>

        <MasterCard title="BPJS Ketenagakerjaan" description="JHT, JP, JKK, dan JKM" action={editBtn('tk')}>
          <dl className="divide-y">
            <Def label="JHT perusahaan / pegawai">{pct(tk.jhtPerusahaan)} / {pct(tk.jhtPegawai)}</Def>
            <Def label="JP perusahaan / pegawai">{pct(tk.jpPerusahaan)} / {pct(tk.jpPegawai)}</Def>
            <Def label="Batas upah JP">{idr(tk.jpBatas)}</Def>
            <Def label="JKK · tingkat risiko">{tk.jkk} {pct(JKK_RATES[tk.jkk])}</Def>
            <Def label="JKM">{pct(tk.jkm)}</Def>
          </dl>
          <p className="text-xs text-muted-foreground">Batas upah JP Rp 11.086.300 berlaku sejak Maret 2026. Tingkat risiko JKK disesuaikan dengan yang terdaftar di BPJS Ketenagakerjaan.</p>
          {tkFut && <Alert variant="info"><AlertDescription>Ada perubahan terjadwal; lihat riwayat di bawah.</AlertDescription></Alert>}
          <p className="text-xs text-muted-foreground">Sumber: PP 44/2015 (JKK, JKM), PP 46/2015 (JHT), PP 45/2015 (JP)</p>
          <ParamHistory list={TK} diff={diffTk} />
        </MasterCard>
      </div>

      <MasterCard title="PPh 21" description="Metode TER bulanan (PP 58/2023, PMK 168/2023)">
        <p className="text-sm">
          Desember: dihitung ulang setahun dengan tarif Pasal 17, dikurangi PPh 21 Januari–November.
        </p>
        <Tabs defaultValue="A" className="gap-4">
          <TabsList>
            {(['A', 'B', 'C'] as TerCategory[]).map((c) => <TabsTrigger key={c} value={c}>Kategori {c}</TabsTrigger>)}
          </TabsList>
          {(['A', 'B', 'C'] as TerCategory[]).map((c) => (
            <TabsContent key={c} value={c}><TerTable cat={c} /></TabsContent>
          ))}
        </Tabs>
        <p className="text-xs text-muted-foreground">Sumber: PP 58/2023 dan PMK 168/2023 · tabel hanya dapat dibaca; diperbarui bersama pembaruan peraturan.</p>
      </MasterCard>

      <MasterCard title="Pembagi & upah sejam" description="Dikelola di modul lain; ditampilkan di sini sebagai acuan">
        <dl className="divide-y">
          <Def label="Pembagi potongan kehadiran">Staff {PEMBAGI.Staff} hari · Non Staff {PEMBAGI['Non Staff']} hari</Def>
          <Def label="Upah sejam lembur">(Gaji Pokok + Tunjangan Tetap) ÷ {UPAH_DIVISOR}</Def>
        </dl>
        <div className="flex flex-wrap gap-2">
          {canOpenMaster ? (
            <Button variant="link" className="h-auto p-0" onClick={() => onGotoPage('master-data')}>Data Master › Posisi & Level</Button>
          ) : (
            <span className="text-sm text-muted-foreground">Pembagi dikelola Admin HRD di Data Master › Posisi & Level.</span>
          )}
          <Button variant="link" className="h-auto p-0" onClick={() => onGotoPage('overtime')}>Kehadiran › Overtime</Button>
        </div>
      </MasterCard>

      {sheet === 'kes' && <KesSheet user={user} onClose={() => setSheet(null)} />}
      {sheet === 'tk' && <TkSheet user={user} onClose={() => setSheet(null)} />}
    </div>
  )
}
