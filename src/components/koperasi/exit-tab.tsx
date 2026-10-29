import { useState } from 'react'
import { toast } from 'sonner'
import { rp } from '@/components/koperasi/shared'
import { PersonCell } from '@/components/payroll/pay/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { memberOf } from '@/data/koperasi/members'
import { OFFS, confirmKoperasi, koperasiBalance, personOf, useOffboarding, type Off } from '@/data/offboarding'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'

const head = 'text-xs font-medium text-muted-foreground'

/** Anggota dengan proses keluar aktif. Hanya tab ini yang menampilkan saldo simpanan; HR melihat status item dan nominal potongan saja. */
export function activeExitMembers() {
  return OFFS.filter((o) => o.status === 'berjalan' && memberOf(o.nik)?.status === 'aktif')
}

export function CoopExitTab({ user }: { user: CurrentUser }) {
  useOffboarding()
  const isBend = user.role === 'bendahara'
  const [target, setTarget] = useState<string | null>(null)
  const rows = activeExitMembers()
  const off = target ? OFFS.find((o) => o.no === target) : undefined
  return (
    <Card>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Anggota yang sedang diproses keluar. Saldo simpanan dikembalikan sebagai pembayaran Koperasi terpisah setelah keanggotaan berakhir.</p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Anggota</TableHead>
                <TableHead className={head}>Tanggal keluar</TableHead>
                <TableHead className={`text-right ${head}`}>Saldo simpanan</TableHead>
                <TableHead className={`text-right ${head}`}>Sisa kewajiban</TableHead>
                <TableHead className={head}>Clearance</TableHead>
                {isBend && <TableHead className={`text-right ${head}`}>Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={isBend ? 6 : 5} className="h-24 text-center text-sm text-muted-foreground">Tidak ada anggota yang sedang diproses keluar.</TableCell></TableRow>}
              {rows.map((o) => {
                const kb = koperasiBalance(o.nik)
                const item = o.clearance.find((c) => c.key === 'koperasi')
                const p = personOf(o.nik)!
                return (
                  <TableRow key={o.no} className="h-12 hover:bg-muted/50">
                    <TableCell><PersonCell nama={p.nama} nik={p.nik} /></TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatDate(o.tanggalKeluar)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="block font-medium">{rp(kb.saldo)}</span>
                      <span className="block text-xs text-muted-foreground">Pokok {rp(kb.pokok)} · Wajib {rp(kb.wajib)} · Sukarela {rp(kb.sukarela)}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="block font-medium">{rp(kb.kewajiban)}</span>
                      <span className="block text-xs text-muted-foreground">Kasbon {rp(kb.kasbon)} · Pinjaman {rp(kb.pinjaman)}</span>
                      {kb.nonN > 0 && <span className="block text-xs text-muted-foreground">Non-Koperasi (bukan dana koperasi): {kb.nonN} aktif · sisa {rp(kb.nonSisa)}</span>}
                    </TableCell>
                    <TableCell>
                      {!item ? <StatusBadge variant="neutral">Menunggu approval keluar</StatusBadge> : item.status === 'Selesai' ? <StatusBadge variant="success">Selesai</StatusBadge> : <StatusBadge variant="warning">Perlu konfirmasi</StatusBadge>}
                      {item?.status === 'Selesai' && <span className="mt-1 block text-xs text-muted-foreground">{item.catatan}</span>}
                    </TableCell>
                    {isBend && (
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" disabled={!item || item.status === 'Selesai'} onClick={() => setTarget(o.no)}>Konfirmasi Clearance</Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {off && <ConfirmDialogKop off={off} user={user} onClose={() => setTarget(null)} />}
    </Card>
  )
}

function ConfirmDialogKop({ off, user, onClose }: { off: Off; user: CurrentUser; onClose: () => void }) {
  const kb = koperasiBalance(off.nik)
  const [pilih, setPilih] = useState<'lunas' | 'potong' | 'tunai'>(kb.kewajiban > 0 ? 'potong' : 'lunas')
  const [error, setError] = useState('')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfirmasi Clearance Koperasi</DialogTitle>
          <DialogDescription>{personOf(off.nik)?.nama} · keluar {formatDate(off.tanggalKeluar)}. Kewajiban Koperasi {rp(kb.kewajiban)}.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={pilih} onValueChange={(v) => { setPilih(v as 'lunas' | 'potong' | 'tunai'); setError('') }} className="gap-3">
          <label htmlFor="kx-lunas" className="flex items-center gap-2 text-sm"><RadioGroupItem id="kx-lunas" value="lunas" />Lunas / tidak ada kewajiban</label>
          <label htmlFor="kx-potong" className="flex items-center gap-2 text-sm"><RadioGroupItem id="kx-potong" value="potong" />Dipotong dari hak akhir {rp(kb.kewajiban)}</label>
          <label htmlFor="kx-tunai" className="flex items-center gap-2 text-sm"><RadioGroupItem id="kx-tunai" value="tunai" />Diselesaikan tunai</label>
        </RadioGroup>
        <p className="text-xs text-muted-foreground">Saldo simpanan {rp(kb.saldo)} dikembalikan setelah keanggotaan berakhir (pembayaran Koperasi terpisah). HR hanya melihat status item dan nominal potongan.</p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => { const e = confirmKoperasi(off.no, pilih, user); if (e) return setError(e); toast.success('Clearance Koperasi dikonfirmasi'); onClose() }}>Konfirmasi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
