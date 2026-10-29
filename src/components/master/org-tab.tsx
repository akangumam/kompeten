import { ChevronRight, Plus } from 'lucide-react'
import { DEMO_TODAY } from '@/lib/today'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { AktifBadge, BerlakuField, ConfirmDialog, MasterCard, RowMenu, SearchBar, UsedBy, type TabProps } from '@/components/master/common'
import { nameOf, orgCount } from '@/components/master/stats'
import { EmployeeCombobox } from '@/components/shift/employee-combobox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ALL, type DirPreset } from '@/data/directory'
import { ensureSupervisor, ROSTER } from '@/data/employees'
import { addAudit } from '@/data/master/audit-log'
import { nextPeriodStart } from '@/data/master/attendance-rules'
import { POLA_DEFS } from '@/data/master/shifts'
import { POSITIONS } from '@/data/master/positions'
import { atasanKey } from '@/data/roster-gen'
import {
  childrenOf,
  descendantSectionIds,
  ORG,
  orgById,
  type OrgNode,
  type OrgType,
} from '@/data/master/organization'
import { bump } from '@/data/master/store'
import { formatDate } from '@/lib/format'

const head = 'text-xs font-medium text-muted-foreground'
const TYPES: OrgType[] = ['Divisi', 'Department', 'Section']

/** Filter Direktori Pegawai yang setara dengan satu unit organisasi. */
const orgPreset = (n: OrgNode): DirPreset => {
  if (n.jenis === 'Divisi') return { extra: { divisi: n.nama } }
  if (n.jenis === 'Department') return { department: n.nama }
  return { department: orgById(n.parentId)?.nama ?? ALL, section: n.nama }
}

type Row = { node: OrgNode | null; depth: number }
type Draft = { jenis: OrgType; parentId: string; nama: string; kode: string; kepala: string; berlaku: string }
type Errs = Partial<Record<'parentId' | 'nama' | 'kode' | 'kepala' | 'berlaku', string>>

function affectedBy(node: OrgNode, newNik: string) {
  const ids = new Set(descendantSectionIds(node.id))
  const old = atasanKey(node.kepalaNik)
  return ROSTER.filter((e) => ids.has(e.sec) && e.atasanId === old && e.nik !== newNik)
}

export function OrgTab({ canEdit, onHistory }: TabProps) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set(['ROOT', 'DIV-OPS', 'DIV-CRP']))
  const [sheet, setSheet] = useState<{ mode: 'add' | 'edit'; node?: OrgNode } | null>(null)
  const [del, setDel] = useState<OrgNode | null>(null)
  const total = ROSTER.length

  const rows = useMemo(() => {
    const out: Row[] = []
    const term = q.trim().toLowerCase()
    const matches = (n: OrgNode): boolean =>
      `${n.nama} ${n.kode}`.toLowerCase().includes(term) || childrenOf(n.id).some(matches)
    const walk = (n: OrgNode, depth: number) => {
      if (term && !matches(n)) return
      out.push({ node: n, depth })
      if (term || open.has(n.id)) childrenOf(n.id).forEach((c) => walk(c, depth + 1))
    }
    if (!term) out.push({ node: null, depth: 0 })
    if (!term || open.has('ROOT')) ORG.filter((o) => o.parentId === null).forEach((d) => walk(d, term ? 0 : 1))
    return out
  }, [q, open, ORG.length, sheet, del])

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const toggleStatus = (n: OrgNode) => {
    n.status = n.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
    addAudit({ group: 'Organisasi', entitas: `Organisasi ${n.nama}`, perubahan: `Status ${n.nama}: ${n.status === 'Aktif' ? 'Nonaktif → Aktif' : 'Aktif → Nonaktif'}`, berlaku: DEMO_TODAY })
    bump()
    toast.success(`${n.nama} ${n.status === 'Aktif' ? 'diaktifkan' : 'dinonaktifkan'}`)
  }

  return (
    <MasterCard
      title="Organisasi"
      description="Divisi, department, dan section beserta kepala unit dan jumlah pegawai"
      action={
        canEdit && (
          <Button onClick={() => setSheet({ mode: 'add' })}>
            <Plus /> Tambah Unit
          </Button>
        )
      }
    >
      <SearchBar value={q} onChange={setQ} placeholder="Cari nama atau kode unit" />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={head}>Nama</TableHead>
              <TableHead className={head}>Kode</TableHead>
              <TableHead className={head}>Kepala / Atasan</TableHead>
              <TableHead className={`text-right ${head}`}>Jumlah Pegawai</TableHead>
              <TableHead className={head}>Status</TableHead>
              <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ node, depth }) => {
              if (!node) {
                const expanded = open.has('ROOT')
                return (
                  <TableRow key="ROOT" className="h-12 bg-muted/30 hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="size-6" aria-expanded={expanded} aria-label={`${expanded ? 'Ciutkan' : 'Buka'} PT Primaplast Indonesia`} onClick={() => toggle('ROOT')}>
                          <ChevronRight className={`size-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                        </Button>
                        <span className="font-medium">PT Primaplast Indonesia</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{total.toLocaleString('id-ID')}</TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                )
              }
              const kids = childrenOf(node.id)
              const expanded = !!q.trim() || open.has(node.id)
              const count = orgCount(node)
              return (
                <TableRow key={node.id} className="h-12 hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
                      {kids.length > 0 ? (
                        <Button variant="ghost" size="icon" className="size-6" aria-expanded={expanded} aria-label={`${expanded ? 'Ciutkan' : 'Buka'} ${node.nama}`} onClick={() => toggle(node.id)}>
                          <ChevronRight className={`size-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                        </Button>
                      ) : (
                        <span className="size-6 shrink-0" aria-hidden />
                      )}
                      <span className="font-medium">{node.nama}</span>
                      <StatusBadge variant="neutral">{node.jenis}</StatusBadge>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{node.kode}</TableCell>
                  <TableCell>
                    <div className="flex flex-col leading-tight">
                      <span>{nameOf(node.kepalaNik)}</span>
                      {node.kepalaNext && (
                        <span className="text-xs text-muted-foreground">
                          Mulai {formatDate(node.kepalaNext.from)}: {nameOf(node.kepalaNext.nik)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <UsedBy n={count} unit="" preset={orgPreset(node)} />
                  </TableCell>
                  <TableCell>
                    <AktifBadge status={node.status} />
                  </TableCell>
                  <TableCell>
                    <RowMenu
                      canEdit={canEdit}
                      status={node.status}
                      used={count + kids.length}
                      onEdit={() => setSheet({ mode: 'edit', node })}
                      onToggle={() => toggleStatus(node)}
                      onDelete={() => setDel(node)}
                      onHistory={() => onHistory(node.nama)}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        Jumlah pegawai induk = jumlah seluruh pegawai di bawahnya. Total {total.toLocaleString('id-ID')} pegawai aktif.
      </p>
      {sheet && <OrgSheet key={sheet.node?.id ?? 'new'} mode={sheet.mode} node={sheet.node} onClose={() => setSheet(null)} />}
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Hapus ${del?.nama ?? ''}?`}
        description="Unit ini tidak dipakai oleh pegawai mana pun. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        destructive
        onConfirm={() => {
          if (!del) return
          ORG.splice(ORG.indexOf(del), 1)
          addAudit({ group: 'Organisasi', entitas: `Organisasi ${del.nama}`, perubahan: `Menghapus ${del.jenis} ${del.nama} (${del.kode})`, berlaku: DEMO_TODAY })
          bump()
          toast.success(`${del.nama} dihapus`)
          setDel(null)
        }}
      />
    </MasterCard>
  )
}

function OrgSheet({ mode, node, onClose }: { mode: 'add' | 'edit'; node?: OrgNode; onClose: () => void }) {
  const edit = mode === 'edit' && !!node
  const [d, setD] = useState<Draft>({
    jenis: node?.jenis ?? 'Department',
    parentId: node?.parentId ?? '',
    nama: node?.nama ?? '',
    kode: node?.kode ?? '',
    kepala: node?.kepalaNik ?? '',
    berlaku: nextPeriodStart(),
  })
  const [touched, setTouched] = useState<Partial<Record<keyof Draft, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))

  const parentOptions = ORG.filter((o) => o.status === 'Aktif' && o.jenis === (d.jenis === 'Section' ? 'Department' : 'Divisi'))
  const kepalaChanged = edit && d.kepala !== node!.kepalaNik
  const affected = kepalaChanged ? affectedBy(node!, d.kepala) : []

  const errors: Errs = {}
  const show = (k: keyof Errs) => submitted || touched[k]
  if (d.jenis !== 'Divisi' && !d.parentId) errors.parentId = 'Induk wajib dipilih'
  if (!d.nama.trim()) errors.nama = 'Nama wajib diisi'
  if (!d.kode.trim()) errors.kode = 'Kode wajib diisi'
  else if (ORG.some((o) => o.kode === d.kode && o !== node)) errors.kode = `Kode ${d.kode} sudah dipakai`
  if (!d.kepala) errors.kepala = 'Kepala wajib dipilih'
  if (kepalaChanged && !d.berlaku) errors.berlaku = 'Berlaku mulai wajib diisi'
  const err = (k: keyof Errs) => (show(k) ? errors[k] : undefined)

  const save = () => {
    setSubmitted(true)
    if (Object.keys(errors).length) return
    if (!edit) {
      ORG.push({ id: d.kode, kode: d.kode, nama: d.nama.trim(), jenis: d.jenis, parentId: d.jenis === 'Divisi' ? null : d.parentId, kepalaNik: d.kepala, status: 'Aktif' })
      ensureSupervisor(d.kepala, `Kepala ${d.nama.trim()}`)
      addAudit({ group: 'Organisasi', entitas: `Organisasi ${d.nama.trim()}`, perubahan: `Menambah ${d.jenis} ${d.nama.trim()} (${d.kode})`, berlaku: DEMO_TODAY })
      toast.success(`${d.jenis} ${d.nama.trim()} ditambahkan`)
    } else {
      const n = node!
      const oldName = n.nama
      const newName = d.nama.trim()
      if (newName !== oldName) {
        if (n.jenis === 'Department') {
          const ids = new Set(descendantSectionIds(n.id))
          ROSTER.forEach((e) => ids.has(e.sec) && (e.department = newName))
          POSITIONS.forEach((p) => p.department === oldName && (p.department = newName))
          POLA_DEFS.forEach((p) => (p.departments = p.departments.map((x) => (x === oldName ? newName : x))))
        } else if (n.jenis === 'Section') {
          ROSTER.forEach((e) => e.sec === n.id && e.section && (e.section = newName))
          POSITIONS.forEach((p) => p.section === oldName && (p.section = newName))
        }
        n.nama = newName
        addAudit({ group: 'Organisasi', entitas: `Organisasi ${newName}`, perubahan: `Nama: ${oldName} → ${newName}`, berlaku: DEMO_TODAY })
      }
      if (kepalaChanged) {
        const from = nameOf(n.kepalaNik)
        ensureSupervisor(d.kepala, `Kepala ${n.nama}`)
        if (d.berlaku <= DEMO_TODAY) {
          affected.forEach((e) => (e.atasanId = atasanKey(d.kepala)))
          n.kepalaNik = d.kepala
          n.kepalaNext = undefined
        } else {
          n.kepalaNext = { from: d.berlaku, nik: d.kepala }
        }
        addAudit({ group: 'Organisasi', entitas: `Organisasi ${n.nama}`, perubahan: `Kepala ${n.nama}: ${from} → ${nameOf(d.kepala)}`, berlaku: d.berlaku })
      }
      toast.success(`${n.nama} diperbarui`)
    }
    bump()
    onClose()
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>{edit ? `Edit ${node!.jenis}` : 'Tambah Unit Organisasi'}</SheetTitle>
          <SheetDescription>Struktur organisasi dipakai di Draft Pegawai, Absensi, dan approval.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <Field id="org-jenis" label="Jenis" required>
            {edit ? (
              <Input id="org-jenis" readOnly value={d.jenis} className="bg-muted/50 text-foreground" />
            ) : (
              <Select value={d.jenis} onValueChange={(v) => set({ jenis: v as OrgType, parentId: '' })}>
                <SelectTrigger id="org-jenis" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </Field>
          {d.jenis !== 'Divisi' && (
            <Field id="org-induk" label="Induk" required error={err('parentId')} helper={d.jenis === 'Section' ? 'Pilih department induk' : 'Pilih divisi induk'}>
              {edit ? (
                <Input id="org-induk" readOnly value={orgById(d.parentId)?.nama ?? ''} className="bg-muted/50 text-foreground" />
              ) : (
                <Select value={d.parentId} onValueChange={(v) => set({ parentId: v })}>
                  <SelectTrigger id="org-induk" className="w-full" aria-invalid={!!err('parentId')} onBlur={() => setTouched((t) => ({ ...t, parentId: true }))}>
                    <SelectValue placeholder="Pilih induk" />
                  </SelectTrigger>
                  <SelectContent>{parentOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.nama}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </Field>
          )}
          <Field id="org-nama" label="Nama" required error={err('nama')}>
            <Input id="org-nama" value={d.nama} aria-invalid={!!err('nama')} onChange={(e) => set({ nama: e.target.value })} onBlur={() => setTouched((t) => ({ ...t, nama: true }))} />
          </Field>
          <Field id="org-kode" label="Kode" required error={err('kode')} helper={edit ? 'Kode tidak dapat diubah setelah dibuat' : 'Huruf kapital, unik. Contoh: SEC-INJ'}>
            <Input
              id="org-kode"
              value={d.kode}
              readOnly={edit}
              className={edit ? 'bg-muted/50 text-foreground' : undefined}
              aria-invalid={!!err('kode')}
              onChange={(e) => set({ kode: e.target.value.toUpperCase().replace(/\s/g, '') })}
              onBlur={() => setTouched((t) => ({ ...t, kode: true }))}
            />
          </Field>
          <Field id="org-kepala" label="Kepala" required error={err('kepala')} helper="Kepala unit menjadi atasan langsung anggota unit">
            <EmployeeCombobox id="org-kepala" value={d.kepala} options={ROSTER} onChange={(nik) => set({ kepala: nik })} placeholder="Cari nama atau NIP…" emptyText="Pegawai tidak ditemukan." invalid={!!err('kepala')} />
          </Field>
          {kepalaChanged && (
            <>
              <BerlakuField id="org-berlaku" value={d.berlaku} onChange={(v) => set({ berlaku: v })} error={submitted ? errors.berlaku : undefined} />
              <Alert variant="info">
                <AlertDescription>
                  {affected.length.toLocaleString('id-ID')} pegawai berganti atasan mulai {d.berlaku ? formatDate(d.berlaku) : '…'}. Pengajuan yang masih menunggu tetap ditinjau atasan lama.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save}>Simpan</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
