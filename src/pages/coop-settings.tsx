import { Info } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { DatePicker } from '@/components/employee/date-picker'
import { AlasanField, alasanOk } from '@/components/koperasi/shared'
import { PageHeader } from '@/components/payroll/pay/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { addPos, addUdKategori, defaultBerlaku, MASTER_LOG, POS_ANGGARAN, POS_KATEGORI, togglePos, toggleUdKategori, UD_KATEGORI, type PosKategori } from '@/data/koperasi/settings'
import { SETTING_DEFS, SETTING_HISTORY, saveSetting, settingEntry, valueText, type SettingDef } from '@/data/koperasi/settings'
import { useKoperasi } from '@/data/koperasi/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'

const head = 'text-xs font-medium text-muted-foreground'
const GROUPS = [...new Set(SETTING_DEFS.map((d) => d.group))]

/** Pengaturan Koperasi: Ketua mengubah; Sekretaris dan Bendahara hanya membaca. */
export default function CoopSettingsPage({ user }: { user: CurrentUser }) {
  useKoperasi()
  const canEdit = user.role === 'ketua'
  const [edit, setEdit] = useState<SettingDef | null>(null)
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Pengaturan Koperasi" subtitle="Simpanan, pencairan, Kasbon, Pinjaman, dan keanggotaan. Perubahan berlaku mulai tanggal yang dipilih dan riwayatnya tersimpan." />
      {!canEdit && (
        <Alert variant="info"><AlertDescription>Mode baca. Pengaturan diubah oleh Ketua Koperasi.</AlertDescription></Alert>
      )}
      {GROUPS.map((g) => (
        <Card key={g}>
          <CardHeader><CardTitle>{g}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={head}>Parameter</TableHead>
                  <TableHead className={`text-right ${head}`}>Nilai berlaku</TableHead>
                  <TableHead className={head}>Berlaku mulai</TableHead>
                  <TableHead className={head}>Diubah oleh</TableHead>
                  <TableHead className={`text-right ${head}`}>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SETTING_DEFS.filter((d) => d.group === g).map((d) => {
                  const e = settingEntry(d.key)
                  const next = SETTING_HISTORY[d.key].find((x) => x.berlakuMulai > DEMO_TODAY)
                  return (
                    <TableRow key={d.key} className="h-12 hover:bg-muted/50">
                      <TableCell className="font-medium">{d.label}{d.helper && <span className="block text-xs font-normal text-muted-foreground">{d.helper}</span>}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{valueText(d, e.value)}{next && <span className="block text-xs font-normal text-muted-foreground">Mulai {formatDate(next.berlakuMulai)}: {valueText(d, next.value)}</span>}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{formatDate(e.berlakuMulai)}</TableCell>
                      <TableCell>{e.oleh}</TableCell>
                      <TableCell className="text-right"><Button variant={canEdit ? 'outline' : 'ghost'} size="sm" onClick={() => setEdit(d)}>{canEdit ? 'Ubah' : 'Riwayat'}</Button></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      <MasterCards canEdit={canEdit} actor={user.nama} />
      <Card>
        <CardHeader>
          <CardTitle>Alur pencairan Kasbon</CardTitle>
          <CardDescription>Rencana alur saat modul Kasbon dibuka</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-wrap items-center gap-2 text-sm">
            {['Sekretaris memverifikasi', 'Ketua menyetujui', 'Bendahara mencairkan'].map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span className="rounded-md border bg-muted/50 px-3 py-1.5">{i + 1}. {s}</span>
                {i < 2 && <span aria-hidden className="text-muted-foreground">→</span>}
              </li>
            ))}
          </ol>
          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />Pengaju yang memegang salah satu peran digantikan pengurus lain pada tahap itu.</p>
        </CardContent>
      </Card>
      {edit && <SettingSheet def={edit} canEdit={canEdit} user={user} onClose={() => setEdit(null)} />}
    </div>
  )
}

function SettingSheet({ def, canEdit, user, onClose }: { def: SettingDef; canEdit: boolean; user: CurrentUser; onClose: () => void }) {
  const cur = settingEntry(def.key)
  const [val, setVal] = useState(String(cur.value))
  const [berlaku, setBerlaku] = useState(defaultBerlaku())
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const n = Number(val)
  const valErr = val === '' || !Number.isFinite(n) ? 'Nilai wajib diisi' : n < def.min ? `Minimal ${def.min.toLocaleString('id-ID')}` : def.max !== undefined && n > def.max ? `Maksimal ${def.max.toLocaleString('id-ID')}` : ''
  const alasanErr = alasanOk(alasan) ? '' : 'Alasan minimal 10 karakter dan jelas'
  const berlakuErr = !berlaku ? 'Berlaku mulai wajib diisi' : berlaku < DEMO_TODAY ? 'Berlaku mulai tidak boleh di masa lalu' : ''
  const hist = [...SETTING_HISTORY[def.key]].sort((a, b) => b.berlakuMulai.localeCompare(a.berlakuMulai))
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>{canEdit ? 'Ubah' : 'Riwayat'} · {def.label}</SheetTitle>
          <SheetDescription>Nilai berlaku saat ini: {valueText(def, cur.value)}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          {canEdit && (
            <>
              <Field id="ks-nilai" label="Nilai baru" required error={sub ? valErr : undefined} helper={def.unit === 'rp' ? 'Dalam Rupiah' : def.unit === 'persen' ? 'Dalam persen' : def.unit === 'tanggal' ? 'Tanggal dalam bulan' : def.unit === 'bulan' ? 'Dalam bulan' : 'Pengali'}>
                <Input id="ks-nilai" inputMode="numeric" value={val} aria-invalid={sub && !!valErr} onChange={(e) => setVal(e.target.value.replace(/[^\d]/g, ''))} />
              </Field>
              <Field id="ks-berlaku" label="Berlaku mulai" required error={sub ? berlakuErr : undefined} helper="Default: tanggal 1 bulan depan. Hari ini boleh; tanggal lampau tidak.">
                <DatePicker id="ks-berlaku" value={berlaku} onChange={setBerlaku} min={DEMO_TODAY} invalid={sub && !!berlakuErr} />
              </Field>
              <AlasanField id="ks-alasan" value={alasan} onChange={setAlasan} error={sub ? alasanErr : undefined} />
            </>
          )}
          <section className="space-y-2" aria-label="Riwayat nilai">
            <h3 className="text-sm font-semibold">Riwayat</h3>
            <ol className="space-y-2">
              {hist.map((h) => (
                <li key={h.berlakuMulai} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium tabular-nums">{valueText(def, h.value)}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">Berlaku {formatDate(h.berlakuMulai)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{h.oleh}{h.alasan ? ` · ${h.alasan}` : ''}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{canEdit ? 'Batal' : 'Tutup'}</Button>
          {canEdit && (
            <Button
              disabled={!alasanOk(alasan)}
              onClick={() => {
                setSub(true)
                if (valErr || alasanErr || berlakuErr) return
                if (n === cur.value) return toast.info('Tidak ada perubahan nilai')
                saveSetting(def.key, n, berlaku, alasan.trim(), user.nama)
                toast.success(`${def.label} diperbarui, berlaku ${formatDate(berlaku)}`)
                onClose()
              }}
            >
              Simpan
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function MasterCards({ canEdit, actor }: { canEdit: boolean; actor: string }) {
  const [kode, setKode] = useState('')
  const [nama, setNama] = useState('')
  const [kat, setKat] = useState<PosKategori>('Operasional')
  const [err, setErr] = useState('')
  const [udJenis, setUdJenis] = useState<'Masuk' | 'Keluar'>('Masuk')
  const [udNama, setUdNama] = useState('')
  const [udErr, setUdErr] = useState('')
  return (
    <>
      <Card>
        <CardHeader><CardTitle>Pos Anggaran</CardTitle><CardDescription>Dipakai Master Budget dan Pengeluaran. Pos yang sudah dipakai dinonaktifkan, tidak dihapus.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead className={head}>Kode</TableHead><TableHead className={head}>Nama</TableHead><TableHead className={head}>Kategori</TableHead><TableHead className={head}>Status</TableHead>{canEdit && <TableHead className={`text-right ${head}`}>Aksi</TableHead>}</TableRow></TableHeader>
            <TableBody>
              {POS_ANGGARAN.map((p) => (
                <TableRow key={p.kode} className="h-12 hover:bg-muted/50">
                  <TableCell className="font-medium tabular-nums">{p.kode}</TableCell><TableCell>{p.nama}</TableCell><TableCell>{p.kategori}</TableCell>
                  <TableCell><StatusBadge variant={p.aktif ? 'success' : 'neutral'}>{p.aktif ? 'Aktif' : 'Nonaktif'}</StatusBadge></TableCell>
                  {canEdit && <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => togglePos(p.kode, actor)}>{p.aktif ? 'Nonaktifkan' : 'Aktifkan'}</Button></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2">
              <Field id="pos-kode" label="Kode" className="w-32"><Input id="pos-kode" value={kode} onChange={(e) => setKode(e.target.value)} placeholder="OPS-004" /></Field>
              <Field id="pos-nama" label="Nama" className="min-w-48 flex-1"><Input id="pos-nama" value={nama} onChange={(e) => setNama(e.target.value)} /></Field>
              <Field id="pos-kat" label="Kategori" className="w-56">
                <Select value={kat} onValueChange={(v) => setKat(v as PosKategori)}>
                  <SelectTrigger id="pos-kat" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{POS_KATEGORI.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Button onClick={() => { const e = addPos({ kode, nama, kategori: kat }, actor); setErr(e); if (!e) { setKode(''); setNama(''); toast.success('Pos anggaran ditambahkan') } }}>Tambah Pos</Button>
            </div>
          )}
          {err && <p className="text-sm text-danger">{err}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Kategori Unit Dagang</CardTitle><CardDescription>Kategori transaksi uang masuk dan uang keluar Unit Dagang.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {(['Masuk', 'Keluar'] as const).map((j) => (
              <div key={j} className="space-y-2">
                <h3 className="text-sm font-semibold">{j}</h3>
                <ul className="divide-y rounded-md border text-sm">
                  {UD_KATEGORI[j].map((k) => (
                    <li key={k.nama} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span>{k.nama} {!k.aktif && <StatusBadge variant="neutral">Nonaktif</StatusBadge>}</span>
                      {canEdit && <Button variant="ghost" size="sm" onClick={() => toggleUdKategori(j, k.nama, actor)}>{k.aktif ? 'Nonaktifkan' : 'Aktifkan'}</Button>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2">
              <Field id="ud-jenis" label="Jenis" className="w-40">
                <Select value={udJenis} onValueChange={(v) => setUdJenis(v as 'Masuk' | 'Keluar')}>
                  <SelectTrigger id="ud-jenis" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Masuk">Masuk</SelectItem><SelectItem value="Keluar">Keluar</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field id="ud-nama" label="Nama kategori" className="min-w-48 flex-1"><Input id="ud-nama" value={udNama} onChange={(e) => setUdNama(e.target.value)} /></Field>
              <Button onClick={() => { const e = addUdKategori(udJenis, udNama, actor); setUdErr(e); if (!e) { setUdNama(''); toast.success('Kategori ditambahkan') } }}>Tambah Kategori</Button>
            </div>
          )}
          {udErr && <p className="text-sm text-danger">{udErr}</p>}
          {MASTER_LOG.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">{MASTER_LOG.slice(0, 5).map((l, i) => <li key={i}>{formatDate(l.at)} · {l.oleh} · {l.aksi}</li>)}</ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}
