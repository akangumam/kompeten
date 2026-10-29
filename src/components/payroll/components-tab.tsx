import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { AktifBadge, BerlakuField, ConfirmDialog, EditSheet, MasterCard, RowMenu } from '@/components/master/common'
import { RupiahField } from '@/components/payroll/rupiah-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { koperasiSummary, type KoperasiKind } from '@/data/koperasi-deductions'
import { LEVEL_DEFS, PEMBAGI } from '@/data/master/levels'
import { UPAH_DIVISOR } from '@/data/overtime'
import { nextPeriodStart } from '@/data/master/attendance-rules'
import { addPayAudit } from '@/data/payroll/audit'
import {
  addInsidental,
  COMPONENTS,
  editorHistory,
  MAKAN,
  saveEditorValue,
  TRANSPORT,
  tunjanganAt,
  UPAH_HARIAN,
  type CompEditor,
  type PayComponent,
} from '@/data/payroll/components'
import { datedAt } from '@/data/payroll/dated'
import { idr, syncRoster } from '@/data/payroll/salaries'
import { JKK_RATES, kesAt, pct, tkAt } from '@/data/payroll/statutory'
import { bump, usePayroll } from '@/data/payroll/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { AlasanField } from '@/components/ui/alasan-field'

type Goto = 'gaji' | 'bpjs'
type Props = { user: CurrentUser; canEdit: boolean; onHistory: (query: string) => void; onGoto: (tab: Goto) => void; onGotoPage: () => void }

const KOP: Record<string, KoperasiKind> = {
  kasbon: 'kasbon',
  angsuran: 'angsuran',
  'simp-wajib': 'simpananWajib',
  'simp-sukarela': 'simpananSukarela',
  'pinjaman-non': 'pinjamanNon',
}
/** Komponen yang dipakai simulasi dan tidak boleh dinonaktifkan. */
const CORE = new Set(['gaji-pokok', 'upah-harian', 'tunj-jabatan', 'lembur', 'pot-hadir', 'bpjs-kes-p', 'bpjs-jht-p', 'bpjs-jp-p', 'pph21', 'co-kes', 'co-jht', 'co-jp', 'co-jkk', 'co-jkm'])
const BPJS = new Set(['bpjs-kes-p', 'bpjs-jht-p', 'bpjs-jp-p', 'pph21', 'co-kes', 'co-jht', 'co-jp', 'co-jkk', 'co-jkm'])

function dasarOf(c: PayComponent): string {
  const kes = kesAt(DEMO_TODAY)
  const tk = tkAt(DEMO_TODAY)
  switch (c.id) {
    case 'tunj-jabatan':
      return LEVEL_DEFS.map((l) => `${l.nama} ${idr(tunjanganAt(l.nama, DEMO_TODAY))}`).join(' · ')
    case 'makan':
      return `${idr(datedAt(MAKAN, DEMO_TODAY).value)} × hari hadir`
    case 'transport':
      return `${idr(datedAt(TRANSPORT, DEMO_TODAY).value)} × hari hadir`
    case 'upah-harian':
      return `${idr(datedAt(UPAH_HARIAN, DEMO_TODAY).value)} / hari hadir · hanya Group Harian`
    case 'bpjs-kes-p':
      return `${pct(kes.pegawai)} × upah, maks. upah ${idr(kes.batas)}`
    case 'bpjs-jht-p':
      return `${pct(tk.jhtPegawai)} × upah`
    case 'bpjs-jp-p':
      return `${pct(tk.jpPegawai)} × upah, maks. upah ${idr(tk.jpBatas)}`
    case 'co-kes':
      return `${pct(kes.perusahaan)} × upah (maks. ${idr(kes.batas)})`
    case 'co-jht':
      return `${pct(tk.jhtPerusahaan)} × upah`
    case 'co-jp':
      return `${pct(tk.jpPerusahaan)} × upah (maks. ${idr(tk.jpBatas)})`
    case 'co-jkk':
      return `Tingkat risiko ${tk.jkk}`
    case 'co-jkm':
      return `${pct(tk.jkm)} × upah`
    case 'lembur':
      return `Jam-pengali × upah sejam (÷${UPAH_DIVISOR})`
    case 'pot-hadir':
      return `(Gaji Pokok + Tunjangan Jabatan) ÷ ${PEMBAGI.Staff} (Staff) / ${PEMBAGI['Non Staff']} (Non Staff, Outsourcing) × hari Alfa/Izin; Harian tanpa potongan`
    default:
      return c.dasar
  }
}
const jkkSuffix = () => ` ${pct(JKK_RATES[tkAt(DEMO_TODAY).jkk])}`

function sumberOf(c: PayComponent) {
  const k = KOP[c.id]
  if (!k) return c.sumber
  const s = koperasiSummary(k)
  return `Koperasi (data contoh) · ${s.anggota.toLocaleString('id-ID')} anggota · ${idr(s.total)}`
}

function Row({ c, canEdit, onEdit, onToggle, onHistory, onGotoPage }: { c: PayComponent; canEdit: boolean; onEdit?: () => void; onToggle?: () => void; onHistory: () => void; onGotoPage?: () => void }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{c.nama}</span>
          <StatusBadge variant="neutral">{c.jenis}</StatusBadge>
          <AktifBadge status={c.status} />
        </div>
        <p className="text-sm tabular-nums">
          {dasarOf(c)}
          {c.id === 'co-jkk' && jkkSuffix()}
        </p>
        <p className="text-xs text-muted-foreground">
          Sumber: {sumberOf(c)} · Masuk bruto PPh 21: {c.brutoPph ? 'Ya' : 'Tidak'}
        </p>
        {c.id === 'gaji-pokok' && (
          <p className="text-xs text-muted-foreground">
            Hanya baca di sini.{' '}
            <Button variant="link" className="h-auto p-0 text-xs" onClick={onGotoPage}>Ajukan Perubahan Gaji</Button>
          </p>
        )}
        {c.id === 'upah-harian' && (
          <p className="text-xs text-muted-foreground">Perubahan upah harian per pegawai ke depan lewat Promosi/Transaksi Pegawai.</p>
        )}
      </div>
      <RowMenu canEdit={canEdit} status={c.status} used={1} deletable={false} onEdit={onEdit} onToggle={onToggle} onHistory={onHistory} />
    </li>
  )
}

export function ComponentsTab({ user, canEdit, onHistory, onGoto, onGotoPage }: Props) {
  usePayroll()
  const [edit, setEdit] = useState<{ comp: PayComponent; editor: CompEditor } | null>(null)
  const [toggle, setToggle] = useState<PayComponent | null>(null)
  const [add, setAdd] = useState(false)

  const group = (g: PayComponent['group']) => COMPONENTS.filter((c) => c.group === g)
  const rows = (g: PayComponent['group']) => (
    <ul className="divide-y">
      {group(g).map((c) => (
        <Row
          key={c.id}
          c={c}
          canEdit={canEdit}
          onHistory={() => onHistory(c.nama)}
          onGotoPage={onGotoPage}
          onEdit={
            c.editor
              ? () => setEdit({ comp: c, editor: c.editor! })
              : c.id === 'gaji-pokok'
                ? undefined
                : BPJS.has(c.id)
                  ? () => onGoto('bpjs')
                  : undefined
          }
          onToggle={CORE.has(c.id) || c.id === 'gaji-pokok' ? undefined : () => setToggle(c)}
        />
      ))}
    </ul>
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MasterCard
          title="Pendapatan"
          description="Komponen yang menambah penghasilan pegawai"
          action={
            canEdit && (
              <Button variant="outline" size="sm" onClick={() => setAdd(true)}>
                <Plus /> Tambah Insidental
              </Button>
            )
          }
        >
          {rows('pendapatan')}
        </MasterCard>
        <MasterCard title="Potongan" description="Komponen yang mengurangi take home pay">
          {rows('potongan')}
        </MasterCard>
      </div>
      <MasterCard title="Beban Perusahaan (tidak memotong gaji)" description="Ditanggung perusahaan; sebagian masuk penghasilan bruto untuk PPh 21">
        {rows('beban')}
        <Alert variant="info">
          <AlertDescription>
            “Upah” untuk BPJS = Gaji Pokok + Tunjangan Jabatan (tunjangan tetap). Uang makan dan uang transport bukan bagian dari upah.
          </AlertDescription>
        </Alert>
      </MasterCard>

      {edit && <ValueSheet key={edit.comp.id} comp={edit.comp} editor={edit.editor} user={user} onClose={() => setEdit(null)} />}
      {add && <AddSheet user={user} onClose={() => setAdd(false)} />}
      <ConfirmDialog
        open={toggle !== null}
        onOpenChange={(o) => !o && setToggle(null)}
        title={toggle?.status === 'Aktif' ? `Nonaktifkan ${toggle.nama}?` : `Aktifkan ${toggle?.nama}?`}
        description={
          toggle?.status === 'Aktif'
            ? 'Komponen tidak dipakai di perhitungan baru. Riwayat dan slip yang sudah terbit tidak berubah.'
            : 'Komponen kembali dipakai di perhitungan payroll berikutnya.'
        }
        confirmLabel={toggle?.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
        onConfirm={() => {
          if (!toggle) return
          const aktif = toggle.status === 'Aktif'
          toggle.status = aktif ? 'Nonaktif' : 'Aktif'
          const berlaku = nextPeriodStart()
          toggle.riwayat.unshift({ berlakuMulai: berlaku, perubahan: aktif ? 'Dinonaktifkan' : 'Diaktifkan', oleh: user.nama })
          addPayAudit({ by: user.nama, group: 'Komponen', entitas: toggle.nama, perubahan: aktif ? 'Aktif → Nonaktif' : 'Nonaktif → Aktif', berlaku })
          bump()
          toast.success(`${toggle.nama} ${aktif ? 'dinonaktifkan' : 'diaktifkan'}`)
          setToggle(null)
        }}
      />
    </div>
  )
}

/** Edit nilai komponen yang dipakai langsung: Tunjangan per Level, Uang Makan, Uang Transport. */
function ValueSheet({ comp, editor, user, onClose }: { comp: PayComponent; editor: CompEditor; user: CurrentUser; onClose: () => void }) {
  const keys = editor === 'tunjangan' ? LEVEL_DEFS.map((l) => l.nama) : ['']
  const current = (k: string) => String(datedAt(editorHistory(editor, k), DEMO_TODAY).value)
  const [vals, setVals] = useState<Record<string, string>>(Object.fromEntries(keys.map((k) => [k, current(k)])))
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const errOf = (k: string) => (vals[k] === '' ? 'Nominal wajib diisi' : editor !== 'tunjangan' && Number(vals[k]) <= 0 ? 'Nominal harus lebih dari 0' : '')
  const alasanErr = sub && !validAlasan(alasan) ? ALASAN_ERROR : ''
  const changed = keys.filter((k) => Number(vals[k]) !== Number(current(k)))
  return (
    <EditSheet
      title={`Edit ${comp.nama}`}
      description={editor === 'tunjangan' ? 'Nominal per Level (Data Master Level)' : 'Nominal per hari hadir'}
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (keys.some((k) => errOf(k)) || !berlaku || !validAlasan(alasan)) return
        if (changed.length === 0) return toast.info('Tidak ada perubahan nilai')
        for (const k of changed) {
          saveEditorValue(editor, k, { berlakuMulai: berlaku, value: Number(vals[k]), oleh: user.nama, alasan: alasan.trim() })
          addPayAudit({
            by: user.nama,
            group: 'Komponen',
            entitas: editor === 'tunjangan' ? `${comp.nama} · ${k}` : comp.nama,
            perubahan: `${idr(Number(current(k)))} → ${idr(Number(vals[k]))}`,
            berlaku,
            alasan: alasan.trim(),
          })
        }
        syncRoster()
        bump()
        toast.success(`${comp.nama} diperbarui, berlaku ${formatDate(berlaku)}`)
        onClose()
      }}
    >
      {keys.map((k) => (
        <RupiahField
          key={k || 'v'}
          id={`val-${k || 'v'}`}
          label={editor === 'tunjangan' ? `Level ${k}` : comp.nama}
          value={vals[k]}
          error={sub || touched[k] ? errOf(k) : undefined}
          helper={editor === 'tunjangan' ? 'Isi Rp 0 bila level tidak mendapat tunjangan' : undefined}
          onChange={(d) => setVals((v) => ({ ...v, [k]: d }))}
          onBlur={() => setTouched((t) => ({ ...t, [k]: true }))}
        />
      ))}
      <BerlakuField id="val-berlaku" value={berlaku} onChange={setBerlaku} error={sub && !berlaku ? 'Berlaku mulai wajib diisi' : undefined} />
      <AlasanField id="val-alasan" label="Alasan perubahan" value={alasan} onChange={setAlasan} error={alasanErr} />
      {changed.length > 0 && (
        <Alert variant="info">
          <AlertDescription>Periode sebelum {formatDate(berlaku)} tetap memakai nilai lama.</AlertDescription>
        </Alert>
      )}
    </EditSheet>
  )
}

function AddSheet({ user, onClose }: { user: CurrentUser; onClose: () => void }) {
  const [nama, setNama] = useState('')
  const [group, setGroup] = useState<'pendapatan' | 'potongan'>('pendapatan')
  const [bruto, setBruto] = useState('ya')
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [sub, setSub] = useState(false)
  const namaErr = nama.trim().length < 3 ? 'Nama komponen minimal 3 karakter' : COMPONENTS.some((c) => c.nama.toLowerCase() === nama.trim().toLowerCase()) ? 'Nama komponen sudah ada' : ''
  return (
    <EditSheet
      title="Tambah Komponen Insidental"
      description="Nilainya diinput per periode di Proses Payroll tahap 2"
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (namaErr || !berlaku) return
        addInsidental({ nama, group, brutoPph: bruto === 'ya', berlakuMulai: berlaku, oleh: user.nama })
        addPayAudit({ by: user.nama, group: 'Komponen', entitas: nama.trim(), perubahan: `Komponen insidental ${group} ditambahkan`, berlaku })
        bump()
        toast.success(`${nama.trim()} ditambahkan`)
        onClose()
      }}
    >
      <Field id="ins-nama" label="Nama komponen" required error={sub ? namaErr : undefined} helper="Contoh: Bonus Produksi">
        <Input id="ins-nama" value={nama} aria-invalid={!!(sub && namaErr) || undefined} onChange={(e) => setNama(e.target.value)} />
      </Field>
      <Field id="ins-jenis" label="Jenis" required>
        <Select value={group} onValueChange={(v) => setGroup(v as 'pendapatan' | 'potongan')}>
          <SelectTrigger id="ins-jenis" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendapatan">Pendapatan</SelectItem>
            <SelectItem value="potongan">Potongan</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {group === 'pendapatan' && (
        <Field id="ins-bruto" label="Masuk bruto PPh 21" required helper="Bonus, rapel, dan tunjangan tunai umumnya masuk bruto">
          <Select value={bruto} onValueChange={setBruto}>
            <SelectTrigger id="ins-bruto" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ya">Ya</SelectItem>
              <SelectItem value="tidak">Tidak</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}
      <BerlakuField id="ins-berlaku" value={berlaku} onChange={setBerlaku} error={sub && !berlaku ? 'Berlaku mulai wajib diisi' : undefined} />
    </EditSheet>
  )
}

