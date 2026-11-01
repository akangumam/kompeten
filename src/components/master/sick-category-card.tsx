import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AktifBadge, MasterCard } from '@/components/master/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMaster } from '@/data/master/store'
import { addSickCategory, SICK_CATEGORIES, toggleSickCategory } from '@/data/master/sick-categories'

/** Master Kategori Sakit: dipilih HR Personalia saat verifikasi Sakit. Kategori yang sudah dipakai tidak dihapus, hanya dinonaktifkan. */
export function SickCategoryCard({ canEdit }: { canEdit: boolean }) {
  useMaster()
  const [nama, setNama] = useState('')
  const [error, setError] = useState('')
  const add = () => {
    const err = addSickCategory(nama)
    if (err) return setError(err)
    toast.success(`Kategori sakit ${nama.trim()} ditambahkan`)
    setNama('')
    setError('')
  }
  return (
    <MasterCard title="Kategori Sakit" description="Dipilih HR Personalia saat verifikasi Sakit. Hanya terlihat HR Personalia dan HR & GA Manager; dashboard menampilkannya sebagai agregat.">
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground">Kategori</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="w-32 text-right"><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SICK_CATEGORIES.map((c) => (
                <TableRow key={c.nama}>
                  <TableCell className="font-medium">{c.nama}</TableCell>
                  <TableCell><AktifBadge status={c.aktif ? 'Aktif' : 'Nonaktif'} /></TableCell>
                  <TableCell className="text-right">
                    {canEdit && <Button variant="ghost" size="sm" onClick={() => toggleSickCategory(c)}>{c.aktif ? 'Nonaktifkan' : 'Aktifkan'}</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {canEdit && (
          <div className="max-w-md space-y-2">
            <Label htmlFor="kat-sakit">Tambah kategori</Label>
            <div className="flex gap-2">
              <Input
                id="kat-sakit"
                value={nama}
                placeholder="Contoh: Gangguan Mata"
                aria-invalid={!!error || undefined}
                onChange={(e) => { setNama(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && add()}
              />
              <Button variant="outline" onClick={add}><Plus /> Tambah</Button>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        )}
      </div>
    </MasterCard>
  )
}
