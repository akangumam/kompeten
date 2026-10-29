import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { rp, SHEET_W } from '@/components/koperasi/shared'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { JENIS, balanceOf, mutationsOf, type Jenis } from '@/data/koperasi/ledger'
import { MASA_MIN, PLAFOND_KALI } from '@/data/koperasi/settings'
import { changesOf, monthsAsMember, stepsOf, type Member } from '@/data/koperasi/members'
import { dipesan, scheduledChange, tersedia } from '@/data/koperasi/requests'
import { formatDate } from '@/lib/format'

const head = 'text-xs font-medium text-muted-foreground'
const PAGE = 25

/** Plafon pinjaman = pengali × Saldo Wajib; belum berlaku sebelum masa keanggotaan minimum (Pengaturan Koperasi). */
export const plafonOf = (m: Member, wajib: number) => (monthsAsMember(m) < MASA_MIN ? null : PLAFOND_KALI * wajib)

export function MemberSheet({ member, onOpenChange }: { member: Member | null; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={!!member} onOpenChange={onOpenChange}>
      <SheetContent className={SHEET_W}>{member && <Body key={member.nik} m={member} />}</SheetContent>
    </Sheet>
  )
}

function Body({ m }: { m: Member }) {
  const [jenis, setJenis] = useState<'all' | Jenis>('all')
  const [limit, setLimit] = useState(PAGE)
  const bal = balanceOf(m.nik)
  const dp = dipesan(m.nik)
  const muts = mutationsOf(m.nik).filter((x) => jenis === 'all' || x.jenis === jenis).slice().reverse()
  const plafon = plafonOf(m, bal.Wajib)
  const history = (['Wajib', 'Sukarela'] as const).flatMap((j) => {
    const steps = stepsOf(m, j)
    return changesOf(m, j).map((c, i) => ({ jenis: j, berlaku: c.berlaku, lama: steps[i].nominal, baru: c.nominal }))
  }).sort((a, b) => b.berlaku.localeCompare(a.berlaku))

  return (
    <>
      <SheetHeader>
        <SheetTitle>{m.nama}</SheetTitle>
        <SheetDescription className="space-y-1">
          <span className="block tabular-nums">{m.nik} · {m.department}</span>
          <span className="flex flex-wrap items-center gap-2">
            <span>Anggota sejak {formatDate(m.sejak)}</span>
            <StatusBadge variant={m.status === 'aktif' ? 'success' : 'neutral'}>{m.status === 'aktif' ? 'Aktif' : 'Nonaktif'}</StatusBadge>
          </span>
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 px-4 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Simpanan Pokok', value: bal.Pokok, sub: 'Sekali bayar' },
            { label: 'Simpanan Wajib', value: bal.Wajib, sub: 'Per bulan, wajib' },
            { label: 'Simpanan Sukarela', value: bal.Sukarela, sub: dp > 0 ? `Dipesan ${rp(dp)} · tersedia ${rp(tersedia(m.nik))}` : `Tersedia ${rp(tersedia(m.nik))}` },
          ].map((c) => (
            <Card key={c.label} className="h-full gap-2 py-4">
              <CardContent className="space-y-1 px-4">
                <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                <p className="text-lg font-bold tabular-nums tracking-tight">{rp(c.value)}</p>
                <p className="text-xs text-muted-foreground">{c.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="rounded-lg border p-3 text-sm tabular-nums">
          <span className="font-medium">Plafon pinjaman</span>{' '}
          {plafon === null ? <StatusBadge variant="neutral">Belum {MASA_MIN} bulan</StatusBadge> : <>{rp(plafon)} <span className="text-muted-foreground">= 3 × Saldo Wajib {rp(bal.Wajib)}</span></>}
        </p>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Riwayat setoran</h3>
          {(['Wajib', 'Sukarela'] as const).map((j) => {
            const sc = scheduledChange(m.nik, j)
            return sc ? <p key={j} className="text-xs text-muted-foreground">Terjadwal: Simpanan {j} {rp(sc.lama)} → {rp(sc.nominal)} mulai {formatDate(sc.berlaku)}</p> : null
          })}
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada perubahan setoran sejak bergabung.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={head}>Berlaku</TableHead>
                  <TableHead className={head}>Jenis</TableHead>
                  <TableHead className={head}>Lama → Baru</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={`${h.jenis}-${h.berlaku}`}>
                    <TableCell className="tabular-nums">{formatDate(h.berlaku)}</TableCell>
                    <TableCell>{h.jenis}</TableCell>
                    <TableCell className="tabular-nums">{rp(h.lama)} → <span className="font-medium">{rp(h.baru)}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Mutasi</h3>
            <Select value={jenis} onValueChange={(v) => { setJenis(v as 'all' | Jenis); setLimit(PAGE) }}>
              <SelectTrigger aria-label="Filter jenis" className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua jenis</SelectItem>
                {JENIS.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Tanggal</TableHead>
                <TableHead className={head}>Jenis</TableHead>
                <TableHead className={head}>Keterangan</TableHead>
                <TableHead className={`text-right ${head}`}>Debit</TableHead>
                <TableHead className={`text-right ${head}`}>Kredit</TableHead>
                <TableHead className={`text-right ${head}`}>Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {muts.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="h-20 text-center text-sm text-muted-foreground">Belum ada mutasi. Potongan pertama dibukukan setelah payroll berikutnya.</TableCell></TableRow>}
              {muts.slice(0, limit).map((x) => (
                <TableRow key={x.id} className="h-12">
                  <TableCell className="whitespace-nowrap tabular-nums">{formatDate(x.tanggal)}</TableCell>
                  <TableCell>{x.jenis}</TableCell>
                  <TableCell>
                    <span className="block">{x.keterangan}</span>
                    <span className="block text-xs text-muted-foreground">{x.sumber} · {x.oleh}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{x.debit ? rp(x.debit) : '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{x.kredit ? rp(x.kredit) : '—'}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{rp(x.saldo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {muts.length > limit && (
            <Button variant="outline" size="sm" onClick={() => setLimit(limit + PAGE)}>Tampilkan lebih banyak ({(muts.length - limit).toLocaleString('id-ID')} lagi)</Button>
          )}
        </section>
      </div>
    </>
  )
}
