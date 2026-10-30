import { useState } from 'react'
import { Plus, Trash2, Edit2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { MasterCard, type TabProps } from '@/components/master/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AGE_TIERS,
  DEFAULT_AGE_TIERS,
  DEFAULT_TENURE_TIERS,
  formatTierLabel,
  saveAgeTiers,
  saveTenureTiers,
  TENURE_TIERS,
  validateTiers,
  type TierItem,
} from '@/data/master/tier-ranges'
import { useMaster } from '@/data/master/store'

const head = 'text-xs font-medium text-muted-foreground'

export function DashboardTab({ canEdit }: TabProps) {
  useMaster()
  const [editType, setEditType] = useState<'tenure' | 'age' | null>(null)
  const [draftTiers, setDraftTiers] = useState<{ id: string; min: number; max: number | null }[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  const openEditor = (type: 'tenure' | 'age') => {
    const source = type === 'tenure' ? TENURE_TIERS : AGE_TIERS
    setDraftTiers(source.map((t) => ({ id: t.id, min: t.min, max: t.max })))
    setErrorMsg('')
    setEditType(type)
  }

  const handleReset = () => {
    if (editType === 'tenure') {
      setDraftTiers(DEFAULT_TENURE_TIERS.map((t) => ({ id: t.id, min: t.min, max: t.max })))
    } else {
      setDraftTiers(DEFAULT_AGE_TIERS.map((t) => ({ id: t.id, min: t.min, max: t.max })))
    }
    setErrorMsg('')
  }

  const handleSave = () => {
    const val = validateTiers(draftTiers)
    if (!val.valid) {
      setErrorMsg(val.error || 'Validasi gagal')
      return
    }
    const unit = 'tahun'
    const finalTiers: TierItem[] = draftTiers.map((t, idx) => ({
      id: t.id || `${editType}-${idx + 1}`,
      min: t.min,
      max: t.max,
      label: formatTierLabel(t, unit),
    }))

    if (editType === 'tenure') {
      saveTenureTiers(finalTiers)
      toast.success('Rentang tier masa kerja berhasil diperbarui')
    } else {
      saveAgeTiers(finalTiers)
      toast.success('Rentang tier usia berhasil diperbarui')
    }
    setEditType(null)
  }

  const updateDraft = (idx: number, field: 'min' | 'max', val: string) => {
    setDraftTiers((prev) => {
      const copy = [...prev]
      const cur = { ...copy[idx] }
      if (field === 'min') {
        cur.min = Math.max(0, parseInt(val, 10) || 0)
      } else {
        cur.max = val.trim() === '' ? null : Math.max(0, parseInt(val, 10) || 0)
      }
      copy[idx] = cur
      return copy
    })
    setErrorMsg('')
  }

  const addRow = () => {
    const last = draftTiers[draftTiers.length - 1]
    const newMin = last && last.max !== null ? last.max + 1 : 0
    setDraftTiers((prev) => [
      ...prev,
      { id: `${editType}-${Date.now()}`, min: newMin, max: null },
    ])
    setErrorMsg('')
  }

  const removeRow = (idx: number) => {
    setDraftTiers((prev) => prev.filter((_, i) => i !== idx))
    setErrorMsg('')
  }

  return (
    <div className="space-y-6">
      {/* Tier Masa Kerja */}
      <MasterCard
        title="Rentang Tier Masa Kerja"
        description="Pengelompokan masa kerja untuk chart demografi di Dashboard Umum"
        action={
          canEdit && (
            <Button variant="outline" size="sm" onClick={() => openEditor('tenure')}>
              <Edit2 className="size-4" /> Edit Rentang
            </Button>
          )
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Label</TableHead>
                <TableHead className={head}>Batas Bawah (Tahun)</TableHead>
                <TableHead className={head}>Batas Atas (Tahun)</TableHead>
                <TableHead className={head}>Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TENURE_TIERS.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.label}</TableCell>
                  <TableCell className="tabular-nums">{t.min}</TableCell>
                  <TableCell className="tabular-nums">{t.max !== null ? t.max : 'Tak terbatas'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {t.max === null ? `Pegawai dengan masa kerja ≥ ${t.min} tahun` : `Masa kerja antara ${t.min} hingga ${t.max} tahun`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </MasterCard>

      {/* Tier Usia */}
      <MasterCard
        title="Rentang Tier Usia"
        description="Pengelompokan usia pegawai untuk chart demografi di Dashboard Umum"
        action={
          canEdit && (
            <Button variant="outline" size="sm" onClick={() => openEditor('age')}>
              <Edit2 className="size-4" /> Edit Rentang
            </Button>
          )
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Label</TableHead>
                <TableHead className={head}>Batas Bawah (Tahun)</TableHead>
                <TableHead className={head}>Batas Atas (Tahun)</TableHead>
                <TableHead className={head}>Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {AGE_TIERS.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.label}</TableCell>
                  <TableCell className="tabular-nums">{t.min}</TableCell>
                  <TableCell className="tabular-nums">{t.max !== null ? t.max : 'Tak terbatas'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {t.max === null ? `Pegawai berusia > ${t.min - 1} tahun` : `Usia antara ${t.min} hingga ${t.max} tahun`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </MasterCard>

      {/* Dialog Edit Tier */}
      <Dialog open={!!editType} onOpenChange={(o) => !o && setEditType(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Rentang Tier {editType === 'tenure' ? 'Masa Kerja' : 'Usia'}</DialogTitle>
            <DialogDescription>
              Atur batas bawah dan batas atas. Rentang harus kontinu (tidak boleh tumpang tindih dan tidak boleh berlubang). Kosongkan batas atas untuk baris terakhir (tak terbatas).
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger font-medium">
              {errorMsg}
            </div>
          )}

          <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            <div className="grid grid-cols-[1fr_1fr_40px] gap-2 px-1 text-xs font-semibold text-muted-foreground">
              <span>Batas Bawah</span>
              <span>Batas Atas (opsional)</span>
              <span></span>
            </div>
            {draftTiers.map((t, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  className="h-10 tabular-nums"
                  value={t.min}
                  onChange={(e) => updateDraft(idx, 'min', e.target.value)}
                  placeholder="Min"
                />
                <Input
                  type="number"
                  min={t.min}
                  className="h-10 tabular-nums"
                  value={t.max === null ? '' : t.max}
                  onChange={(e) => updateDraft(idx, 'max', e.target.value)}
                  placeholder="Tak terbatas (kosong)"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 text-muted-foreground hover:text-danger"
                  onClick={() => removeRow(idx)}
                  disabled={draftTiers.length <= 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addRow}>
                <Plus className="size-4" /> Tambah Rentang
              </Button>
              <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleReset}>
                <RotateCcw className="size-4" /> Reset Default
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditType(null)}>Batal</Button>
            <Button onClick={handleSave}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

