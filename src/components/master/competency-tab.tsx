import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/employee/date-picker'
import { Field } from '@/components/employee/field'
import { AktifBadge, MasterCard, RowMenu, SearchBar, type TabProps } from '@/components/master/common'
import { PredikatKpiTab, TemplateKpiTab } from '@/components/master/kpi-master'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { PAKET } from '@/data/recruitment/tests'
import {
  CATEGORIES, COMPETENCIES, DEFAULT_DESKRIPTOR, LEVELS, LEVEL_NAMES, POSITION_STANDARDS, competencyOf, saveCompetency, saveStandard, standardAt,
  standardOf, targetsList, toggleCompetency, type CompCategory, type Competency,
} from '@/data/master/competencies'
import { POSITIONS } from '@/data/master/positions'
import { useMaster } from '@/data/master/store'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { cn } from '@/lib/utils'

const head = 'text-xs font-medium text-muted-foreground'
const SHEET_W = 'w-full gap-0 overflow-y-auto sm:max-w-[560px]'
const KATEGORI_BADGE: Record<CompCategory, 'neutral' | 'info' | 'success'> = { Basic: 'neutral', Jobskill: 'info', Supporting: 'success' }
const NO_PAKET = 'none'

export function CompetencyTab({ canEdit, onHistory }: TabProps) {
  useMaster()
  return (
    <Tabs defaultValue="katalog" className="gap-6">
      <TabsList>
        <TabsTrigger value="katalog">Katalog Kompetensi</TabsTrigger>
        <TabsTrigger value="standar">Standar Posisi</TabsTrigger>
        <TabsTrigger value="kpi">Template KPI</TabsTrigger>
        <TabsTrigger value="predikat">Predikat KPI</TabsTrigger>
      </TabsList>
      <TabsContent value="katalog"><Katalog canEdit={canEdit} onHistory={onHistory} /></TabsContent>
      <TabsContent value="standar"><Standar canEdit={canEdit} onHistory={onHistory} /></TabsContent>
      <TabsContent value="kpi"><TemplateKpiTab canEdit={canEdit} onHistory={onHistory} /></TabsContent>
      <TabsContent value="predikat"><PredikatKpiTab canEdit={canEdit} onHistory={onHistory} /></TabsContent>
    </Tabs>
  )
}

// ---------------- Katalog ----------------
type Draft = Omit<Competency, 'status'> & { status: 'Aktif' | 'Nonaktif' }
const blank = (): Draft => ({ kode: '', nama: '', kategori: 'Jobskill', deskripsi: '', deskriptor: [...DEFAULT_DESKRIPTOR], paketId: undefined, status: 'Aktif' })

function Katalog({ canEdit, onHistory }: TabProps) {
  const [q, setQ] = useState('')
  const [kat, setKat] = useState('all')
  const [edit, setEdit] = useState<{ draft: Draft; isNew: boolean } | null>(null)
  const rows = COMPETENCIES.filter((c) => (kat === 'all' || c.kategori === kat) && (!q.trim() || `${c.kode} ${c.nama}`.toLowerCase().includes(q.trim().toLowerCase())))
  const usedBy = (kode: string) => POSITION_STANDARDS.filter((s) => s.versions.some((v) => kode in v.targets)).length

  return (
    <MasterCard
      title="Katalog Kompetensi"
      description="Kompetensi Basic, Jobskill, dan Supporting beserta deskriptor level 1–4"
      action={canEdit && <Button onClick={() => setEdit({ draft: blank(), isNew: true })}><Plus /> Tambah Kompetensi</Button>}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-60 flex-1"><SearchBar value={q} onChange={setQ} placeholder="Cari kode atau nama kompetensi…" /></div>
        <Select value={kat} onValueChange={setKat}>
          <SelectTrigger aria-label="Kategori" className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={head}>Kode</TableHead>
            <TableHead className={head}>Nama</TableHead>
            <TableHead className={head}>Kategori</TableHead>
            <TableHead className={head}>Deskripsi</TableHead>
            <TableHead className={head}>Paket uji</TableHead>
            <TableHead className={`text-right ${head}`}>Dipakai</TableHead>
            <TableHead className={head}>Status</TableHead>
            <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">Tidak ada kompetensi yang cocok.</TableCell></TableRow>}
          {rows.map((c) => (
            <TableRow key={c.kode} className="h-12">
              <TableCell className="font-medium tabular-nums">{c.kode}</TableCell>
              <TableCell>{c.nama}</TableCell>
              <TableCell><StatusBadge variant={KATEGORI_BADGE[c.kategori]}>{c.kategori}</StatusBadge></TableCell>
              <TableCell className="max-w-72 whitespace-normal text-muted-foreground">{c.deskripsi}</TableCell>
              <TableCell>{c.paketId ? PAKET.find((p) => p.id === c.paketId)?.nama ?? c.paketId : <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-right tabular-nums">{usedBy(c.kode)} posisi</TableCell>
              <TableCell><AktifBadge status={c.status} /></TableCell>
              <TableCell>
                <RowMenu
                  canEdit={canEdit}
                  status={c.status}
                  used={usedBy(c.kode)}
                  onEdit={() => setEdit({ draft: { ...c, deskriptor: [...c.deskriptor] }, isNew: false })}
                  onToggle={() => { toggleCompetency(c.kode); toast.success(`${c.nama} ${c.status === 'Aktif' ? 'dinonaktifkan' : 'diaktifkan'}`) }}
                  onHistory={() => onHistory(c.kode)}
                  deletable={false}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-sm text-muted-foreground tabular-nums">Menampilkan {rows.length} dari {COMPETENCIES.length} data</p>
      <CompSheet state={edit} onClose={() => setEdit(null)} />
    </MasterCard>
  )
}

function CompSheet({ state, onClose }: { state: { draft: Draft; isNew: boolean } | null; onClose: () => void }) {
  return (
    <Sheet open={!!state} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_W}>{state && <CompForm key={state.draft.kode || 'new'} init={state.draft} isNew={state.isNew} onClose={onClose} />}</SheetContent>
    </Sheet>
  )
}

function CompForm({ init, isNew, onClose }: { init: Draft; isNew: boolean; onClose: () => void }) {
  const [d, setD] = useState<Draft>(init)
  const [err, setErr] = useState<Record<string, string>>({})
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }))
  const save = () => {
    const e: Record<string, string> = {}
    const kode = d.kode.trim().toUpperCase()
    if (!kode) e.kode = 'Kode wajib diisi'
    else if (!/^[A-Z]+(-[A-Z0-9]+)+$/.test(kode)) e.kode = 'Format kode seperti JOB-INJ-05'
    else if (isNew && competencyOf(kode)) e.kode = 'Kode sudah dipakai'
    if (!d.nama.trim()) e.nama = 'Nama wajib diisi'
    if (d.deskriptor.some((x) => !x.trim())) e.deskriptor = 'Deskriptor level 1–4 wajib diisi'
    setErr(e)
    if (Object.keys(e).length) return
    saveCompetency({ ...d, kode, nama: d.nama.trim(), deskripsi: d.deskripsi.trim() }, isNew)
    toast.success(isNew ? `Kompetensi ${kode} ditambahkan` : `Kompetensi ${kode} diperbarui`)
    onClose()
  }
  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>{isNew ? 'Tambah Kompetensi' : `Edit ${init.kode}`}</SheetTitle>
        <SheetDescription>Deskriptor default bisa diubah per kompetensi.</SheetDescription>
      </SheetHeader>
      <div className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cp-kode" label="Kode" required error={err.kode}><Input id="cp-kode" value={d.kode} disabled={!isNew} onChange={(e) => set('kode', e.target.value)} placeholder="JOB-INJ-05" aria-invalid={!!err.kode || undefined} /></Field>
          <Field id="cp-kat" label="Kategori" required>
            <Select value={d.kategori} onValueChange={(v) => set('kategori', v as CompCategory)}>
              <SelectTrigger id="cp-kat" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <Field id="cp-nama" label="Nama" required error={err.nama}><Input id="cp-nama" value={d.nama} onChange={(e) => set('nama', e.target.value)} aria-invalid={!!err.nama || undefined} /></Field>
        <Field id="cp-desk" label="Deskripsi"><Textarea id="cp-desk" value={d.deskripsi} onChange={(e) => set('deskripsi', e.target.value)} /></Field>
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Deskriptor per level <span aria-hidden className="text-danger">*</span></legend>
          {LEVELS.map((n) => (
            <Field key={n} id={`cp-lv${n}`} label={`Level ${n} · ${LEVEL_NAMES[n]}`}>
              <Input id={`cp-lv${n}`} value={d.deskriptor[n - 1]} onChange={(e) => set('deskriptor', d.deskriptor.map((x, i) => (i === n - 1 ? e.target.value : x)) as Draft['deskriptor'])} />
            </Field>
          ))}
          {err.deskriptor && <p className="text-xs text-destructive">{err.deskriptor}</p>}
        </fieldset>
        <Field id="cp-paket" label="Paket uji (opsional)" helper="Dari Menu Tes; dipakai sebagai bukti kompetensi.">
          <Select value={d.paketId ?? NO_PAKET} onValueChange={(v) => set('paketId', v === NO_PAKET ? undefined : v)}>
            <SelectTrigger id="cp-paket" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PAKET}>Tanpa paket uji</SelectItem>
              {PAKET.filter((p) => p.status === 'Aktif').map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t p-4">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={save}>Simpan</Button>
      </SheetFooter>
    </>
  )
}

// ---------------- Standar Posisi ----------------
function Standar({ canEdit, onHistory }: TabProps) {
  const [posisi, setPosisi] = useState('Operator Injection')
  const [edit, setEdit] = useState(false)
  const pos = POSITIONS.find((p) => p.nama === posisi)
  const std = standardOf(posisi)
  const cur = standardAt(posisi, DEMO_TODAY)
  const list = targetsList(cur?.targets ?? {})

  return (
    <MasterCard
      title="Standar Posisi"
      description="Jobdesk dan target level kompetensi wajib per posisi, berlaku efektif per tanggal"
      action={canEdit && <Button onClick={() => setEdit(true)}>{cur ? 'Ubah Standar' : 'Atur Standar'}</Button>}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Select value={posisi} onValueChange={setPosisi}>
          <SelectTrigger aria-label="Posisi" className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {POSITIONS.filter((p) => p.status === 'Aktif').map((p) => (
              <SelectItem key={p.nama} value={p.nama}>{p.nama}{standardOf(p.nama) ? '' : ' (belum diatur)'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pos && <p className="text-sm text-muted-foreground">{[pos.department, pos.section].filter(Boolean).join(' · ') || 'Semua department'}</p>}
        {cur && <p className="text-sm text-muted-foreground">Berlaku sejak <span className="tabular-nums">{formatDate(cur.berlakuMulai)}</span> · {cur.by}</p>}
      </div>

      {!cur ? (
        <Alert variant="warning"><AlertDescription>Standar belum diatur untuk {posisi}. Halaman penilaian menampilkan peringatan sampai standar dibuat.</AlertDescription></Alert>
      ) : (
        <>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Jobdesk</h3>
            <p className="text-sm text-muted-foreground">{cur.jobdesk}</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Kompetensi</TableHead>
                <TableHead className={head}>Kategori</TableHead>
                <TableHead className={`text-right ${head}`}>Target level</TableHead>
                <TableHead className={head}>Deskriptor target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(({ kode, target, comp }) => (
                <TableRow key={kode} className="h-12">
                  <TableCell><span className="font-medium">{comp.nama}</span> <span className="text-xs tabular-nums text-muted-foreground">{kode}</span></TableCell>
                  <TableCell><StatusBadge variant={KATEGORI_BADGE[comp.kategori]}>{comp.kategori}</StatusBadge></TableCell>
                  <TableCell className="text-right tabular-nums">{target} · {LEVEL_NAMES[target]}</TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">{comp.deskriptor[target - 1]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {std && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Riwayat versi</h3>
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onHistory(`Standar ${posisi}`)}>Lihat di Riwayat Perubahan</Button>
          </div>
          <ul className="divide-y rounded-md border text-sm">
            {[...std.versions].reverse().map((v) => (
              <li key={v.berlakuMulai} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
                <span className="font-medium tabular-nums">{formatDate(v.berlakuMulai)}</span>
                <span className="text-muted-foreground">{Object.keys(v.targets).length} kompetensi · {v.by} · {v.at}</span>
                {v.berlakuMulai === cur?.berlakuMulai ? <StatusBadge variant="success">Berlaku</StatusBadge> : v.berlakuMulai > DEMO_TODAY ? <StatusBadge variant="info">Terjadwal</StatusBadge> : <StatusBadge variant="neutral">Riwayat</StatusBadge>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Sheet open={edit} onOpenChange={setEdit}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-[640px]">
          {edit && <StandarForm key={posisi + (cur?.berlakuMulai ?? '')} posisi={posisi} onClose={() => setEdit(false)} />}
        </SheetContent>
      </Sheet>
    </MasterCard>
  )
}

function StandarForm({ posisi, onClose }: { posisi: string; onClose: () => void }) {
  const cur = standardAt(posisi, DEMO_TODAY)
  const [berlaku, setBerlaku] = useState(DEMO_TODAY)
  const [jobdesk, setJobdesk] = useState(cur?.jobdesk ?? '')
  const [targets, setTargets] = useState<Record<string, number>>(() => ({ ...(cur?.targets ?? { 'BSC-01': 3, 'BSC-02': 3, 'BSC-03': 2, 'BSC-04': 3 }) }))
  const [err, setErr] = useState<Record<string, string>>({})
  const list = targetsList(targets)
  const available = COMPETENCIES.filter((c) => c.status === 'Aktif' && !(c.kode in targets))

  const save = () => {
    const e: Record<string, string> = {}
    if (berlaku < DEMO_TODAY) e.berlaku = 'Tanggal berlaku tidak boleh di masa lalu'
    if (!jobdesk.trim()) e.jobdesk = 'Jobdesk wajib diisi'
    if (!Object.keys(targets).length) e.targets = 'Minimal satu kompetensi'
    setErr(e)
    if (Object.keys(e).length) return
    saveStandard(posisi, { berlakuMulai: berlaku, jobdesk: jobdesk.trim(), targets })
    toast.success(`Standar ${posisi} berlaku mulai ${formatDate(berlaku)}`)
    onClose()
  }
  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>{cur ? 'Ubah' : 'Atur'} Standar {posisi}</SheetTitle>
        <SheetDescription>Disimpan sebagai versi baru. Penilaian periode yang sudah Final tetap memakai standar lamanya.</SheetDescription>
      </SheetHeader>
      <div className="space-y-4 p-4">
        <Field id="sp-berlaku" label="Berlaku mulai" required error={err.berlaku} helper="Hari ini atau setelahnya">
          <DatePicker id="sp-berlaku" value={berlaku} onChange={setBerlaku} min={DEMO_TODAY} invalid={!!err.berlaku} />
        </Field>
        <Field id="sp-jobdesk" label="Jobdesk" required error={err.jobdesk}>
          <Textarea id="sp-jobdesk" value={jobdesk} onChange={(e) => setJobdesk(e.target.value)} aria-invalid={!!err.jobdesk || undefined} />
        </Field>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Kompetensi wajib</h3>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Kompetensi</TableHead>
                <TableHead className={cn(head, 'w-44')}>Target level</TableHead>
                <TableHead className="w-10"><span className="sr-only">Hapus</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(({ kode, target, comp }) => (
                <TableRow key={kode} className="hover:bg-transparent">
                  <TableCell><span className="font-medium">{comp.nama}</span> <span className="text-xs tabular-nums text-muted-foreground">{kode}</span></TableCell>
                  <TableCell>
                    <Select value={String(target)} onValueChange={(v) => setTargets((s) => ({ ...s, [kode]: Number(v) }))}>
                      <SelectTrigger aria-label={`Target ${comp.nama}`} className="w-full"><SelectValue>{target} · {LEVEL_NAMES[target]}</SelectValue></SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            <span className="flex flex-col items-start"><span className="font-medium">{n} · {LEVEL_NAMES[n]}</span><span className="text-xs text-muted-foreground">{comp.deskriptor[n - 1]}</span></span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" aria-label={`Hapus ${comp.nama} dari standar`} onClick={() => setTargets((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== kode)))}><X /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {err.targets && <p className="text-xs text-destructive">{err.targets}</p>}
          <Select value="" onValueChange={(kode) => setTargets((s) => ({ ...s, [kode]: 2 }))}>
            <SelectTrigger aria-label="Tambah kompetensi" className="w-full"><SelectValue placeholder="Tambah kompetensi…" /></SelectTrigger>
            <SelectContent>
              {available.map((c) => <SelectItem key={c.kode} value={c.kode}>{c.kode} · {c.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t p-4">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={save}>Simpan Standar</Button>
      </SheetFooter>
    </>
  )
}
