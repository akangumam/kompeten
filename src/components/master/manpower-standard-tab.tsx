import { useState } from 'react'
import { Edit2, Plus, History } from 'lucide-react'
import { toast } from 'sonner'
import { MasterCard, SearchBar, type TabProps } from '@/components/master/common'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  MANPOWER_STANDARDS,
  updateManpowerStandard,
  addManpowerStandard,
  type ManpowerStandard,
} from '@/data/master/manpower-standards'
import { DEMO_TODAY } from '@/lib/today'
import { formatDate } from '@/lib/format'
import { useMaster } from '@/data/master/store'

const head = 'text-xs font-medium text-muted-foreground'

export function ManpowerStandardTab({ canEdit, onHistory }: TabProps) {
  useMaster()
  const [q, setQ] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [editingItem, setEditingItem] = useState<ManpowerStandard | null>(null)
  const [newStandar, setNewStandar] = useState(0)
  const [newBerlaku, setNewBerlaku] = useState(DEMO_TODAY)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    dept: 'Produksi',
    section: 'Injection',
    posisi: '',
    standar: 1,
    berlaku: DEMO_TODAY,
  })

  const departments = ['all', ...new Set(MANPOWER_STANDARDS.map((s) => s.department))]

  const filtered = MANPOWER_STANDARDS.filter((s) => {
    const matchDept = deptFilter === 'all' || s.department === deptFilter
    const matchQ =
      !q.trim() ||
      `${s.department} ${s.section} ${s.posisi}`.toLowerCase().includes(q.trim().toLowerCase())
    return matchDept && matchQ
  })

  const openEdit = (item: ManpowerStandard) => {
    setEditingItem(item)
    setNewStandar(item.standar)
    setNewBerlaku(DEMO_TODAY)
  }

  const handleSaveEdit = () => {
    if (!editingItem) return
    if (newStandar < 0) {
      toast.error('Standar tenaga kerja tidak boleh negatif')
      return
    }
    updateManpowerStandard(editingItem.id, newStandar, newBerlaku)
    toast.success(`Standar ${editingItem.posisi} berhasil diperbarui`)
    setEditingItem(null)
  }

  const handleSaveAdd = () => {
    if (!addForm.posisi.trim()) {
      toast.error('Posisi wajib diisi')
      return
    }
    addManpowerStandard(
      addForm.dept,
      addForm.section,
      addForm.posisi.trim(),
      addForm.standar,
      addForm.berlaku,
    )
    toast.success(`Standar ${addForm.posisi} berhasil ditambahkan`)
    setIsAddOpen(false)
  }

  return (
    <MasterCard
      title="Standar Tenaga Kerja"
      description="Standar kebutuhan tenaga kerja (manpower standard) per department, section, dan jabatan"
      action={
        canEdit && (
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="size-4" /> Tambah Standar
          </Button>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-50">
          <SearchBar value={q} onChange={setQ} placeholder="Cari posisi atau section…" />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Semua Department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d === 'all' ? 'Semua Department' : d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={head}>Department</TableHead>
              <TableHead className={head}>Section</TableHead>
              <TableHead className={head}>Jabatan / Posisi</TableHead>
              <TableHead className={`text-right ${head}`}>Standar (Orang)</TableHead>
              <TableHead className={head}>Berlaku Mulai</TableHead>
              <TableHead className={head}>Status</TableHead>
              <TableHead className="w-16"><span className="sr-only">Aksi</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-sm text-muted-foreground">
                  Tidak ada data standar tenaga kerja.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.department}</TableCell>
                  <TableCell>{s.section}</TableCell>
                  <TableCell className="font-medium text-foreground">{s.posisi}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{s.standar}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums text-xs">
                    {formatDate(s.berlakuMulai)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={s.status === 'Aktif' ? 'success' : 'neutral'}>
                      {s.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(s)} aria-label={`Edit ${s.posisi}`}>
                        <Edit2 className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Standard Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(o) => !o && setEditingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Standar Tenaga Kerja</DialogTitle>
            <DialogDescription>
              {editingItem?.department} · {editingItem?.section} · {editingItem?.posisi}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="std-val">Standar (Orang) *</Label>
              <Input
                id="std-val"
                type="number"
                min={0}
                className="tabular-nums"
                value={newStandar}
                onChange={(e) => setNewStandar(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="std-date">Berlaku Mulai *</Label>
              <Input
                id="std-date"
                type="date"
                value={newBerlaku}
                onChange={(e) => setNewBerlaku(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Perubahan standar akan berlaku efektif pada tanggal ini.
              </p>
            </div>

            {editingItem && editingItem.history.length > 0 && (
              <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <History className="size-3.5" /> Riwayat Perubahan
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground max-h-32 overflow-y-auto">
                  {editingItem.history.map((h, i) => (
                    <div key={i} className="flex justify-between border-b pb-1 last:border-0 last:pb-0">
                      <span>{h.standar} orang ({formatDate(h.berlakuMulai)})</span>
                      <span className="text-xs">{h.by}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingItem(null)}>Batal</Button>
            <Button onClick={handleSaveEdit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Standard Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Standar Tenaga Kerja</DialogTitle>
            <DialogDescription>Tetapkan standar kebutuhan untuk posisi kerja baru</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Department *</Label>
              <Select value={addForm.dept} onValueChange={(v) => setAddForm({ ...addForm, dept: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Produksi', 'Quality Assurance', 'Maintenance', 'PPIC', 'Warehouse', 'Engineering', 'HR & GA', 'Finance'].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Section *</Label>
              <Input
                value={addForm.section}
                onChange={(e) => setAddForm({ ...addForm, section: e.target.value })}
                placeholder="Contoh: Injection"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Jabatan / Posisi *</Label>
              <Input
                value={addForm.posisi}
                onChange={(e) => setAddForm({ ...addForm, posisi: e.target.value })}
                placeholder="Contoh: Operator Injection"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Standar (Orang) *</Label>
              <Input
                type="number"
                min={1}
                value={addForm.standar}
                onChange={(e) => setAddForm({ ...addForm, standar: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Berlaku Mulai *</Label>
              <Input
                type="date"
                value={addForm.berlaku}
                onChange={(e) => setAddForm({ ...addForm, berlaku: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button onClick={handleSaveAdd}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MasterCard>
  )
}

