import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { BerlakuField, EditSheet, MasterCard } from '@/components/master/common'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  PKWT_MODE_LABEL, RULESETS, belowMinimum, fmtKali, pisahOf, reasonRules, rulesAt, saveRuleSet, tierLabel,
  type PkwtMode, type ReasonRule, type RuleSet,
} from '@/data/master/final-pay-rules'
import { nextPeriodStart } from '@/data/master/attendance-rules'
import { COMPONENTS } from '@/data/payroll/components'
import { formatDate } from '@/lib/format'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { useMaster } from '@/data/master/store'
import { DEMO_TODAY } from '@/lib/today'
import { AlasanField } from '@/components/ui/alasan-field'

const head = 'text-xs font-medium text-muted-foreground'
const num = (s: string) => Number(s.replace(',', '.'))
const validNum = (s: string) => s.trim() !== '' && Number.isFinite(num(s)) && num(s) >= 0
const show = (n: number) => String(n).replace('.', ',')
const jt = (n: number) => `Rp ${(n / 1_000_000).toLocaleString('id-ID')} jt`

export function FinalPayRulesCards({ canEdit }: { canEdit: boolean }) {
  useMaster()
  const rs = rulesAt()
  const rules = reasonRules()
  const [edit, setEdit] = useState<ReasonRule | null>(null)
  const [table, setTable] = useState<'up' | 'upmk' | 'pisah' | 'pajak' | null>(null)
  const [dasar, setDasar] = useState(false)
  const today = DEMO_TODAY
  const future = RULESETS.filter((v) => v.berlakuMulai > today).sort((a, b) => a.berlakuMulai.localeCompare(b.berlakuMulai))
  const pendingOf = (key: string) => future.map((v) => ({ at: v.berlakuMulai, row: v.value.pengali.find((p) => p.key === key) })).filter((x) => x.row && JSON.stringify([x.row.up, x.row.upmk, x.row.uph, x.row.uangPisah, x.row.pkwt]) !== JSON.stringify([rules.find((r) => r.key === key)?.up, rules.find((r) => r.key === key)?.upmk, rules.find((r) => r.key === key)?.uph, rules.find((r) => r.key === key)?.uangPisah, rules.find((r) => r.key === key)?.pkwt]))
  const history = [...RULESETS].sort((a, b) => b.berlakuMulai.localeCompare(a.berlakuMulai))
  const tetapComps = COMPONENTS.filter((c) => c.jenis === 'Tetap' && c.group === 'pendapatan')
  return (
    <>
      <MasterCard
        title="Aturan Hak Akhir · Upah dasar"
        description="Dasar hitung pesangon, UPMK, UPH, uang pisah, dan Kompensasi PKWT. Default mengikuti PP 35/2021; semua angka diedit HR di sini."
        action={canEdit && <Button variant="outline" onClick={() => setDasar(true)}>Ubah Upah Dasar</Button>}
      >
        <div className="space-y-2 text-sm">
          <p>Komponen Gaji berjenis <span className="font-medium">Tetap</span>: {rs.upahDasar.map((id) => COMPONENTS.find((c) => c.id === id)?.nama ?? id).join(' + ')}.</p>
          <p className="text-muted-foreground">Uang makan dan transport (per hari hadir) tidak dihitung. Group Harian memakai rata-rata upah per bulan selama 12 bulan terakhir. UPH: sisa cuti tahunan × upah dasar ÷ pembagi Group (Staff 21, Non Staff 25), ditambah ongkos pulang dan butir lain sesuai PK/PP/PKB (input manual).</p>
        </div>
      </MasterCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MasterCard title="Tabel Uang Pesangon (UP)" description="Masa kerja → bulan upah" action={canEdit && <Button variant="outline" onClick={() => setTable('up')}>Ubah Tabel</Button>}>
          <TierTable rows={rs.up.map((t) => ({ label: tierLabel(t), value: `${t.bulan} bulan` }))} />
        </MasterCard>
        <MasterCard title="Tabel Uang Penghargaan Masa Kerja (UPMK)" description="Masa kerja → bulan upah" action={canEdit && <Button variant="outline" onClick={() => setTable('upmk')}>Ubah Tabel</Button>}>
          <TierTable rows={rs.upmk.map((t) => ({ label: tierLabel(t), value: `${t.bulan} bulan` }))} />
        </MasterCard>
      </div>

      <MasterCard title="Pengali per Alasan Keluar" description="UP × dan UPMK × berlaku untuk pegawai Tetap; pegawai Kontrak memperoleh Kompensasi PKWT. Magang dan Outsourcing tidak termasuk.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Alasan</TableHead>
                <TableHead className={`text-right ${head}`}>UP ×</TableHead>
                <TableHead className={`text-right ${head}`}>UPMK ×</TableHead>
                <TableHead className={head}>UPH</TableHead>
                <TableHead className={head}>Uang pisah</TableHead>
                <TableHead className={head}>Kompensasi PKWT</TableHead>
                <TableHead className={head}>Dasar hukum</TableHead>
                <TableHead className="w-24"><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.key} className="h-12 hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="flex flex-col items-start gap-1">
                      <span>{r.label}</span>
                      {r.kebijakan && <StatusBadge variant="neutral">Kebijakan perusahaan</StatusBadge>}
                      {'baru' in r && r.baru && <span className="flex items-center gap-1 text-xs font-normal text-warning"><TriangleAlert className="size-3" aria-hidden />Atur pengali hak akhir</span>}
                      {pendingOf(r.key).map((x) => (
                        <span key={x.at} className={`flex items-center gap-1 text-xs font-normal ${belowMinimum(x.row!) ? 'text-warning' : 'text-muted-foreground'}`}>
                          {belowMinimum(x.row!) && <TriangleAlert className="size-3" aria-hidden />}
                          Berlaku {formatDate(x.at)}: UP {fmtKali(x.row!.up)}× · UPMK {fmtKali(x.row!.upmk)}×{belowMinimum(x.row!) ? ' · Di bawah ketentuan minimum PP 35/2021' : ''}
                        </span>
                      ))}
                      {belowMinimum(r) && <span className="flex items-center gap-1 text-xs font-normal text-warning"><TriangleAlert className="size-3" aria-hidden />Di bawah ketentuan minimum PP 35/2021</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtKali(r.up)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtKali(r.upmk)}</TableCell>
                  <TableCell>{r.uph ? 'Ya' : '—'}</TableCell>
                  <TableCell>{r.uangPisah ? 'Ya' : '—'}</TableCell>
                  <TableCell>{r.pkwt ? 'Ya' : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{r.dasar}{r.catatan ? ` · ${r.catatan}` : ''}</TableCell>
                  <TableCell>{canEdit && <Button variant="outline" size="sm" onClick={() => setEdit(r)}>Ubah</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </MasterCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MasterCard title="Uang Pisah" description="Kebijakan perusahaan (baris dapat diubah)" action={canEdit && <Button variant="outline" onClick={() => setTable('pisah')}>Ubah Tabel</Button>}>
          <TierTable rows={rs.uangPisah.map((t) => ({ label: tierLabel(t), value: `${fmtKali(t.kali)} × upah dasar` }))} />
          <p className="text-xs text-muted-foreground">Contoh, sesuaikan dengan PK/PP/PKB Primaplast.</p>
          <p className="text-sm text-muted-foreground">Kompensasi PKWT: masa kontrak (bulan) ÷ 12 × upah dasar untuk setiap PKWT ≥ 1 bulan, dibayar di akhir tiap kontrak, termasuk kontrak yang diperpanjang.</p>
        </MasterCard>
        <MasterCard title="Perlakuan Pajak" description="Hak akhir saat keluar memakai PPh 21 final (tarif progresif)" action={canEdit && <Button variant="outline" onClick={() => setTable('pajak')}>Ubah Pajak</Button>}>
          <TierTable rows={rs.pajak.map((b, i) => ({ label: b.sampai === null ? `> ${jt(rs.pajak[i - 1]?.sampai ?? 0)}` : i === 0 ? `≤ ${jt(b.sampai)}` : `> ${jt(rs.pajak[i - 1].sampai ?? 0)} – ${jt(b.sampai)}`, value: `${b.tarif}%` }))} />
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Kompensasi PKWT: </span><span className="font-medium">{PKWT_MODE_LABEL[rs.pkwtMode]}</span></p>
            <p className="text-xs text-muted-foreground">Belum ada aturan khusus; pilih sesuai kebijakan konsultan pajak.</p>
          </div>
        </MasterCard>
      </div>

      <MasterCard title="Riwayat Aturan Hak Akhir" description="Setiap perubahan disimpan sebagai versi berlaku mulai; perhitungan memakai versi pada tanggal keluar atau akhir kontrak.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent"><TableHead className={head}>Berlaku mulai</TableHead><TableHead className={head}>Diubah oleh</TableHead><TableHead className={head}>Alasan</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.berlakuMulai} className="h-12 hover:bg-muted/50"><TableCell>{formatDate(h.berlakuMulai)}</TableCell><TableCell>{h.oleh}</TableCell><TableCell className="text-muted-foreground">{h.alasan}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </MasterCard>

      {edit && <ReasonSheet rule={edit} onClose={() => setEdit(null)} />}
      {table && <TableSheet which={table} onClose={() => setTable(null)} />}
      {dasar && <DasarSheet comps={tetapComps.map((c) => ({ id: c.id, nama: c.nama }))} onClose={() => setDasar(false)} />}
    </>
  )
}

function TierTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <Table>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.label} className="h-10 hover:bg-muted/50"><TableCell>{r.label}</TableCell><TableCell className="text-right tabular-nums font-medium">{r.value}</TableCell></TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ReasonSheet({ rule, onClose }: { rule: ReasonRule & { baru?: boolean }; onClose: () => void }) {
  const [up, setUp] = useState(show(rule.up))
  const [upmk, setUpmk] = useState(show(rule.upmk))
  const [uph, setUph] = useState(rule.uph ? 'ya' : 'tidak')
  const [pisah, setPisah] = useState(rule.uangPisah ? 'ya' : 'tidak')
  const [pkwt, setPkwt] = useState(rule.pkwt ? 'ya' : 'tidak')
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const upErr = !validNum(up) ? 'Isi angka ≥ 0, contoh 1,5' : undefined
  const upmkErr = !validNum(upmk) ? 'Isi angka ≥ 0, contoh 1' : undefined
  const draft = { up: validNum(up) ? num(up) : rule.up, upmk: validNum(upmk) ? num(upmk) : rule.upmk, minUp: rule.minUp, minUpmk: rule.minUpmk }
  const below = belowMinimum(draft)
  const alasanErr = !validAlasan(alasan) ? ALASAN_ERROR : undefined
  return (
    <EditSheet
      title={`Ubah Pengali · ${rule.label}`}
      description="Perubahan berlaku mulai tanggal yang dipilih; versi lama tetap di riwayat."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (upErr || upmkErr || alasanErr || !berlaku) return
        saveRuleSet(
          (rs: RuleSet) => {
            const row = rs.pengali.find((p) => p.key === rule.key)
            const values = { up: num(up), upmk: num(upmk), uph: uph === 'ya', uangPisah: pisah === 'ya', pkwt: pkwt === 'ya' }
            if (row) Object.assign(row, values)
            else rs.pengali.push({ key: `kustom:${rule.alasan}`, alasan: rule.alasan, label: rule.label, minUp: null, minUpmk: null, dasar: 'Kebijakan perusahaan', kebijakan: true, ...values })
          },
          berlaku,
          alasan.trim(),
          `Pengali ${rule.label}: UP ${fmtKali(rule.up)}× → ${fmtKali(num(up))}×, UPMK ${fmtKali(rule.upmk)}× → ${fmtKali(num(upmk))}×`,
        )
        toast.success(`Pengali ${rule.label} diperbarui`)
        onClose()
      }}
    >
      {below && (
        <Alert variant="warning" role="alert">
          <TriangleAlert />
          <AlertDescription>Di bawah ketentuan minimum PP 35/2021 (UP {rule.minUp !== null ? fmtKali(rule.minUp) : '—'}× · UPMK {rule.minUpmk !== null ? fmtKali(rule.minUpmk) : '—'}×). Tetap bisa disimpan dengan catatan.</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field id="rl-up" label="UP ×" required error={sub ? upErr : undefined}><Input id="rl-up" inputMode="decimal" value={up} onChange={(e) => setUp(e.target.value.replace(/[^\d,]/g, ''))} aria-invalid={sub && !!upErr} className="tabular-nums" /></Field>
        <Field id="rl-upmk" label="UPMK ×" required error={sub ? upmkErr : undefined}><Input id="rl-upmk" inputMode="decimal" value={upmk} onChange={(e) => setUpmk(e.target.value.replace(/[^\d,]/g, ''))} aria-invalid={sub && !!upmkErr} className="tabular-nums" /></Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {([['rl-uph', 'UPH', uph, setUph], ['rl-pisah', 'Uang pisah', pisah, setPisah], ['rl-pkwt', 'Kompensasi PKWT', pkwt, setPkwt]] as const).map(([id, label, v, set]) => (
          <Field key={id} id={id} label={label}>
            <Select value={v} onValueChange={set}><SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ya">Ya</SelectItem><SelectItem value="tidak">Tidak</SelectItem></SelectContent></Select>
          </Field>
        ))}
      </div>
      <BerlakuField id="rl-berlaku" value={berlaku} onChange={setBerlaku} error={sub && !berlaku ? 'Berlaku mulai wajib diisi' : undefined} />
      <AlasanField id="rl-alasan" label={below ? 'Catatan (wajib karena di bawah minimum)' : 'Alasan perubahan'} value={alasan} onChange={setAlasan} error={sub ? alasanErr : undefined} />
    </EditSheet>
  )
}

type Which = 'up' | 'upmk' | 'pisah' | 'pajak'
function TableSheet({ which, onClose }: { which: Which; onClose: () => void }) {
  const rs = rulesAt()
  const rows =
    which === 'up' ? rs.up.map((t) => ({ label: tierLabel(t), v: show(t.bulan) }))
      : which === 'upmk' ? rs.upmk.map((t) => ({ label: tierLabel(t), v: show(t.bulan) }))
        : which === 'pisah' ? rs.uangPisah.map((t) => ({ label: tierLabel(t), v: show(t.kali) }))
          : rs.pajak.map((b, i) => ({ label: b.sampai === null ? `> ${jt(rs.pajak[i - 1]?.sampai ?? 0)}` : i === 0 ? `≤ ${jt(b.sampai)}` : `> ${jt(rs.pajak[i - 1].sampai ?? 0)} – ${jt(b.sampai)}`, v: show(b.tarif) }))
  const [vals, setVals] = useState(rows.map((r) => r.v))
  const [mode, setMode] = useState<PkwtMode>(rs.pkwtMode)
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const bad = vals.some((v) => !validNum(v))
  const alasanErr = !validAlasan(alasan) ? ALASAN_ERROR : undefined
  const title = { up: 'Tabel Uang Pesangon (UP)', upmk: 'Tabel UPMK', pisah: 'Tabel Uang Pisah', pajak: 'Perlakuan Pajak' }[which]
  const unit = which === 'pisah' ? '× upah dasar' : which === 'pajak' ? '%' : 'bulan upah'
  return (
    <EditSheet
      title={`Ubah ${title}`}
      description="Batas masa kerja/penghasilan tetap; hanya nilai yang diubah."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (bad || alasanErr || !berlaku) return
        saveRuleSet(
          (n: RuleSet) => {
            if (which === 'up') n.up.forEach((t, i) => (t.bulan = num(vals[i])))
            if (which === 'upmk') n.upmk.forEach((t, i) => (t.bulan = num(vals[i])))
            if (which === 'pisah') n.uangPisah.forEach((t, i) => (t.kali = num(vals[i])))
            if (which === 'pajak') {
              n.pajak.forEach((b, i) => (b.tarif = num(vals[i])))
              n.pkwtMode = mode
            }
          },
          berlaku,
          alasan.trim(),
          `${title} diubah`,
        )
        toast.success(`${title} diperbarui`)
        onClose()
      }}
    >
      {rows.map((r, i) => (
        <Field key={r.label} id={`tb-${i}`} label={`${r.label} (${unit})`} error={sub && !validNum(vals[i]) ? 'Isi angka ≥ 0' : undefined}>
          <Input id={`tb-${i}`} inputMode="decimal" value={vals[i]} onChange={(e) => setVals((v) => v.map((x, j) => (j === i ? e.target.value.replace(/[^\d,]/g, '') : x)))} className="tabular-nums" aria-invalid={sub && !validNum(vals[i])} />
        </Field>
      ))}
      {which === 'pajak' && (
        <Field id="tb-pkwt" label="Pajak Kompensasi PKWT" helper="Belum ada aturan khusus; pilih sesuai kebijakan konsultan pajak.">
          <Select value={mode} onValueChange={(v) => setMode(v as PkwtMode)}>
            <SelectTrigger id="tb-pkwt" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(PKWT_MODE_LABEL) as PkwtMode[]).map((k) => <SelectItem key={k} value={k}>{PKWT_MODE_LABEL[k]}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      )}
      <BerlakuField id="tb-berlaku" value={berlaku} onChange={setBerlaku} error={sub && !berlaku ? 'Berlaku mulai wajib diisi' : undefined} />
      <AlasanField id="tb-alasan" label="Alasan perubahan" value={alasan} onChange={setAlasan} error={sub ? alasanErr : undefined} />
      <p className="text-xs text-muted-foreground">{which === 'pisah' ? `Contoh saat ini: ≥ 3 th = ${fmtKali(pisahOf(rs.uangPisah, 5)?.kali ?? 0)} ×.` : ''}</p>
    </EditSheet>
  )
}

function DasarSheet({ comps, onClose }: { comps: { id: string; nama: string }[]; onClose: () => void }) {
  const [sel, setSel] = useState<string[]>(rulesAt().upahDasar)
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const alasanErr = !validAlasan(alasan) ? ALASAN_ERROR : undefined
  return (
    <EditSheet
      title="Ubah Upah Dasar"
      description="Pilih komponen berjenis Tetap di Komponen Gaji yang membentuk upah dasar."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (alasanErr || !berlaku || sel.length === 0) return
        saveRuleSet((n: RuleSet) => { n.upahDasar = sel }, berlaku, alasan.trim(), `Upah dasar: ${sel.join(' + ')}`)
        toast.success('Upah dasar diperbarui')
        onClose()
      }}
    >
      {comps.map((c) => (
        <label key={c.id} className="flex items-center gap-2 text-sm">
          <Checkbox checked={sel.includes(c.id)} onCheckedChange={(v) => setSel((s) => (v === true ? [...s, c.id] : s.filter((x) => x !== c.id)))} aria-label={c.nama} />
          {c.nama}
        </label>
      ))}
      {sub && sel.length === 0 && <p className="text-sm text-danger">Pilih minimal satu komponen</p>}
      <BerlakuField id="ud-berlaku" value={berlaku} onChange={setBerlaku} error={sub && !berlaku ? 'Berlaku mulai wajib diisi' : undefined} />
      <AlasanField id="ud-alasan" label="Alasan perubahan" value={alasan} onChange={setAlasan} error={sub ? alasanErr : undefined} />
    </EditSheet>
  )
}
