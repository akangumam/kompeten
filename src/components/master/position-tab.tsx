import { Plus } from 'lucide-react'
import { DEMO_TODAY } from '@/lib/today'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { AktifBadge, BerlakuField, ConfirmDialog, EditSheet, MasterCard, RowMenu, SearchBar, UsedBy, type TabProps } from '@/components/master/common'
import { usedByLevel, usedByPosisi } from '@/components/master/stats'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ROSTER } from '@/data/employees'
import { nextPeriodStart } from '@/data/master/attendance-rules'
import { addAudit } from '@/data/master/audit-log'
import { GRADES } from '@/data/master/grades'
import { JENIS_DEFS, jenisOf } from '@/data/master/jenis'
import { KELOMPOK_DASAR, KELOMPOK_LIST, kelompokAt, LEVEL_DEFS, PEMBAGI, type Kelompok, type LevelDef, type LevelKelompok } from '@/data/master/levels'
import { sectionNodesOf, departmentNodes } from '@/data/master/organization'
import { POSITIONS, type PositionDef } from '@/data/master/positions'
import { bump } from '@/data/master/store'
import { formatDate } from '@/lib/format'

const head = 'text-xs font-medium text-muted-foreground'

export function PositionTab({ canEdit, onHistory }: TabProps) {
  const [q, setQ] = useState('')
  const [lvl, setLvl] = useState<LevelDef | null>(null)
  const [pos, setPos] = useState<{ node?: PositionDef } | null>(null)
  const [del, setDel] = useState<PositionDef | null>(null)
  const list = POSITIONS.filter((p) => `${p.nama} ${p.department ?? ''} ${p.section ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div className="space-y-6">
      <MasterCard title="Jenis Karyawan" description="Jenis Karyawan menentukan Status Kerja yang diizinkan dan Group Kerja otomatis. Harian, Magang, dan Outsourcing selalu Kontrak.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Jenis Karyawan</TableHead>
                <TableHead className={head}>Status Kerja</TableHead>
                <TableHead className={head}>Group Kerja</TableHead>
                <TableHead className={head}>Keterangan</TableHead>
                <TableHead className={`text-right ${head}`}>Jumlah pegawai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {JENIS_DEFS.map((j) => (
                <TableRow key={j.nama} className="h-12 hover:bg-muted/50">
                  <TableCell className="font-medium">{j.nama}</TableCell>
                  <TableCell>{j.statusKerja.join(' · ')}</TableCell>
                  <TableCell>{j.groupText}</TableCell>
                  <TableCell className="text-muted-foreground">{j.keterangan}</TableCell>
                  <TableCell className="text-right"><UsedBy n={ROSTER.filter((e) => jenisOf(e) === j.nama).length} preset={{ jenis: j.nama }} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </MasterCard>

      <MasterCard title="Level" description="Level menentukan Group Kerja default dan pembagi potongan kehadiran">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Level</TableHead>
                <TableHead className={head}>Group Kerja default</TableHead>
                <TableHead className={`text-right ${head}`}>Pembagi potongan kehadiran</TableHead>
                <TableHead className={`text-right ${head}`}>Jumlah pegawai</TableHead>
                <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LEVEL_DEFS.map((l) => {
                const k = kelompokAt(l, DEMO_TODAY)
                return (
                  <TableRow key={l.nama} className="h-12 hover:bg-muted/50">
                    <TableCell className="font-medium">{l.nama}</TableCell>
                    <TableCell><StatusBadge variant="neutral">{k}</StatusBadge></TableCell>
                    <TableCell className="text-right tabular-nums">{PEMBAGI[k]}</TableCell>
                    <TableCell className="text-right"><UsedBy n={usedByLevel(l.nama)} preset={{ level: l.nama }} /></TableCell>
                    <TableCell>
                      <RowMenu canEdit={canEdit} used={1} deletable={false} onEdit={() => setLvl(l)} onHistory={() => onHistory(`Level ${l.nama}`)} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </MasterCard>

      <MasterCard title="Group Kerja" description="Group Kerja (golongan) menentukan dasar gaji dan pembagi potongan kehadiran. Harian, Magang, dan Outsourcing otomatis masuk group-nya sendiri.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Group Kerja</TableHead>
                <TableHead className={head}>Dasar gaji</TableHead>
                <TableHead className={`text-right ${head}`}>Pembagi potongan kehadiran</TableHead>
                <TableHead className={`text-right ${head}`}>Jumlah pegawai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {KELOMPOK_LIST.map((g: Kelompok) => (
                <TableRow key={g} className="h-12 hover:bg-muted/50">
                  <TableCell className="font-medium">{g}</TableCell>
                  <TableCell>{KELOMPOK_DASAR[g].ket}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {g === 'Harian' ? <span className="text-muted-foreground">Tidak ada potongan</span> : g === 'Magang' ? <span className="text-muted-foreground">Mengikuti Level</span> : PEMBAGI[g]}
                  </TableCell>
                  <TableCell className="text-right"><UsedBy n={ROSTER.filter((e) => e.kelompok === g).length} preset={{ kelompok: g }} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </MasterCard>

      <MasterCard
        title="Posisi"
        description="Posisi menentukan level default dan grade yang diizinkan"
        action={canEdit && <Button onClick={() => setPos({})}><Plus /> Tambah Posisi</Button>}
      >
        <SearchBar value={q} onChange={setQ} placeholder="Cari posisi, department, atau section" />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Posisi</TableHead>
                <TableHead className={head}>Department · Section</TableHead>
                <TableHead className={head}>Level default</TableHead>
                <TableHead className={head}>Group default</TableHead>
                <TableHead className={head}>Grade</TableHead>
                <TableHead className={`text-right ${head}`}>Jumlah pegawai</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => {
                const n = usedByPosisi(p.nama)
                return (
                  <TableRow key={p.nama} className="h-12 hover:bg-muted/50">
                    <TableCell className="font-medium">{p.nama}</TableCell>
                    <TableCell>{p.department ? (p.section && p.section !== p.department ? `${p.department} · ${p.section}` : p.department) : 'Semua department'}</TableCell>
                    <TableCell>{p.level}</TableCell>
                    <TableCell>{p.kelompok ?? kelompokAt(LEVEL_DEFS.find((l) => l.nama === p.level)!, DEMO_TODAY)}{p.kelompok && <span className="ml-1 text-xs text-muted-foreground">(posisi)</span>}</TableCell>
                    <TableCell className="tabular-nums">{p.grade}</TableCell>
                    <TableCell className="text-right"><UsedBy n={n} preset={{ extra: { posisi: p.nama } }} /></TableCell>
                    <TableCell><AktifBadge status={p.status} /></TableCell>
                    <TableCell>
                      <RowMenu
                        canEdit={canEdit}
                        status={p.status}
                        used={n}
                        onEdit={() => setPos({ node: p })}
                        onToggle={() => {
                          p.status = p.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
                          addAudit({ group: 'Posisi & Level', entitas: `Posisi ${p.nama}`, perubahan: `Status ${p.nama}: ${p.status === 'Aktif' ? 'Nonaktif → Aktif' : 'Aktif → Nonaktif'}`, berlaku: DEMO_TODAY })
                          bump()
                          toast.success(`${p.nama} ${p.status === 'Aktif' ? 'diaktifkan' : 'dinonaktifkan'}`)
                        }}
                        onDelete={() => setDel(p)}
                        onHistory={() => onHistory(p.nama)}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
              {list.length === 0 && (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Posisi tidak ditemukan.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </MasterCard>

      {lvl && <LevelSheet def={lvl} onClose={() => setLvl(null)} />}
      {pos && <PosSheet node={pos.node} onClose={() => setPos(null)} />}
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Hapus posisi ${del?.nama ?? ''}?`}
        description="Posisi ini tidak dipakai pegawai mana pun. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        destructive
        onConfirm={() => {
          if (!del) return
          POSITIONS.splice(POSITIONS.indexOf(del), 1)
          addAudit({ group: 'Posisi & Level', entitas: `Posisi ${del.nama}`, perubahan: `Menghapus posisi ${del.nama}`, berlaku: DEMO_TODAY })
          bump()
          toast.success(`${del.nama} dihapus`)
          setDel(null)
        }}
      />
    </div>
  )
}

function LevelSheet({ def, onClose }: { def: LevelDef; onClose: () => void }) {
  const cur = kelompokAt(def, DEMO_TODAY)
  const [k, setK] = useState<LevelKelompok>(cur)
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [sub, setSub] = useState(false)
  const changed = k !== cur
  const err = sub && changed && !berlaku ? 'Berlaku mulai wajib diisi' : undefined
  const n = usedByLevel(def.nama)
  return (
    <EditSheet
      title={`Edit Level ${def.nama}`}
      description="Group Kerja default dipakai saat Draft Pegawai memilih posisi."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (!changed) return onClose()
        if (!berlaku) return
        def.history.push({ from: berlaku, value: k })
        addAudit({ group: 'Posisi & Level', entitas: `Level ${def.nama}`, perubahan: `Group Kerja default: ${cur} → ${k}`, berlaku })
        bump()
        toast.success(`Level ${def.nama} diperbarui`)
        onClose()
      }}
    >
      <Field id="lvl-kel" label="Group Kerja default" required>
        <Select value={k} onValueChange={(v) => setK(v as LevelKelompok)}>
          <SelectTrigger id="lvl-kel" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{(['Staff', 'Non Staff'] as LevelKelompok[]).map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      {changed && (
        <>
          <BerlakuField id="lvl-berlaku" value={berlaku} onChange={setBerlaku} error={err} />
          <Alert variant="info">
            <AlertDescription>
              {n.toLocaleString('id-ID')} pegawai terdampak mulai {berlaku ? formatDate(berlaku) : '…'}. Pembagi potongan kehadiran menjadi {PEMBAGI[k]}.
            </AlertDescription>
          </Alert>
        </>
      )}
    </EditSheet>
  )
}

function PosSheet({ node, onClose }: { node?: PositionDef; onClose: () => void }) {
  const [d, setD] = useState({
    nama: node?.nama ?? '',
    department: node?.department ?? '',
    section: node?.section ?? '',
    level: node?.level ?? '',
    grade: node?.grade ?? '',
  })
  const [sub, setSub] = useState(false)
  const set = (p: Partial<typeof d>) => setD((x) => ({ ...x, ...p }))
  const depts = departmentNodes().map((x) => x.nama)
  const secs = d.department ? sectionNodesOf(d.department).map((s) => s.nama) : []
  const e: Record<string, string> = {}
  if (!d.nama.trim()) e.nama = 'Nama posisi wajib diisi'
  else if (POSITIONS.some((p) => p !== node && p.nama.toLowerCase() === d.nama.trim().toLowerCase())) e.nama = 'Nama posisi sudah ada'
  if (!d.level) e.level = 'Level wajib dipilih'
  if (!d.grade) e.grade = 'Grade wajib dipilih'
  const er = (k: string) => (sub ? e[k] : undefined)
  const gradeOpts = GRADES.map((g) => g.kode)
  const n = node ? usedByPosisi(node.nama) : 0
  return (
    <EditSheet
      title={node ? 'Edit Posisi' : 'Tambah Posisi'}
      description="Posisi dipakai di Draft Pegawai untuk mengisi level dan Group Kerja."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (Object.keys(e).length) return
        const next = { nama: d.nama.trim(), department: d.department || null, section: d.section || null, level: d.level, grade: d.grade }
        if (node) {
          const nm = node.nama
          Object.assign(node, next)
          if (nm !== next.nama) ROSTER.forEach((x) => x.posisi === nm && (x.posisi = next.nama))
          addAudit({ group: 'Posisi & Level', entitas: `Posisi ${next.nama}`, perubahan: `Level ${d.level}, grade ${d.grade}`, berlaku: DEMO_TODAY })
          toast.success(`${next.nama} diperbarui`)
        } else {
          POSITIONS.push({ ...next, status: 'Aktif' })
          addAudit({ group: 'Posisi & Level', entitas: `Posisi ${next.nama}`, perubahan: `Menambah posisi ${next.nama} (level ${d.level}, grade ${d.grade})`, berlaku: DEMO_TODAY })
          toast.success(`${next.nama} ditambahkan`)
        }
        bump()
        onClose()
      }}
    >
      <Field id="pos-nama" label="Posisi" required error={er('nama')}>
        <Input id="pos-nama" value={d.nama} aria-invalid={!!er('nama')} onChange={(x) => set({ nama: x.target.value })} />
      </Field>
      <Field id="pos-dept" label="Department" helper="Kosongkan bila berlaku untuk semua department">
        <Select value={d.department || '_all'} onValueChange={(v) => set({ department: v === '_all' ? '' : v, section: '' })}>
          <SelectTrigger id="pos-dept" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Semua department</SelectItem>
            {depts.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      {d.department && (
        <Field id="pos-sec" label="Section">
          <Select value={d.section || '_all'} onValueChange={(v) => set({ section: v === '_all' ? '' : v })}>
            <SelectTrigger id="pos-sec" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Semua section</SelectItem>
              {secs.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      )}
      <Field id="pos-level" label="Level default" required error={er('level')}>
        <Select value={d.level} onValueChange={(v) => set({ level: v })}>
          <SelectTrigger id="pos-level" className="w-full" aria-invalid={!!er('level')}><SelectValue placeholder="Pilih level" /></SelectTrigger>
          <SelectContent>{LEVEL_DEFS.map((l) => <SelectItem key={l.nama} value={l.nama}>{l.nama}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field id="pos-grade" label="Grade" required error={er('grade')} helper="Contoh: G1–G2 atau G3">
        <Select value={d.grade} onValueChange={(v) => set({ grade: v })}>
          <SelectTrigger id="pos-grade" className="w-full" aria-invalid={!!er('grade')}><SelectValue placeholder="Pilih grade" /></SelectTrigger>
          <SelectContent>
            {[...new Set([...gradeOpts, ...POSITIONS.map((p) => p.grade)])].sort().map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      {node && n > 0 && (
        <Alert variant="info"><AlertDescription>{n.toLocaleString('id-ID')} pegawai memakai posisi ini. Data yang sudah tersimpan tidak berubah.</AlertDescription></Alert>
      )}
    </EditSheet>
  )
}
