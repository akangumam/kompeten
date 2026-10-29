import { Clock } from 'lucide-react'
import { PersonCell } from '@/components/transactions/shared'
import { Blocked } from '@/components/payroll/run/shared'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { monthsText } from '@/data/master/contract-limit'
import { expiringContracts, ineligibleReason } from '@/data/transactions'
import { formatDate } from '@/lib/format'
import { useDirectoryNav } from '@/lib/directory-nav'
import { teamOf } from '@/data/directory'
import { ROSTER } from '@/data/employees'
import type { CurrentUser } from '@/data/users'
import type { TrxJenis } from '@/data/transactions'

const head = 'text-xs font-medium text-muted-foreground'

export function SisaBadge({ days }: { days: number }) {
  const variant = days <= 14 ? 'danger' : days <= 30 ? 'warning' : 'neutral'
  return <StatusBadge variant={variant}><Clock aria-hidden />{days} hari</StatusBadge>
}

/** Preview table (maks. 5 baris): kontrak berakhir ≤ 45 hari yang belum ditangani. */
export function ExpiringCard({ user, canAct, onAct }: { user: CurrentUser; canAct: boolean; onAct: (jenis: TrxJenis, nik: string) => void }) {
  const { openDirectory, openOffboarding } = useDirectoryNav()
  const team = user.role === 'supervisor' ? teamOf(user) : null
  const all = expiringContracts((e) => user.role !== 'supervisor' || e.atasanId === user.nik)
  const rows = all.slice(0, 5)
  return (
    <Card id="trx-expiring">
      <CardHeader>
        <CardTitle>Perlu tindakan: kontrak berakhir ≤ 45 hari</CardTitle>
        <CardDescription>
          {team ? `Menampilkan tim Anda: ${team.department} · ${team.section}` : 'Pegawai Kontrak yang belum diperpanjang atau diangkat tetap'}
        </CardDescription>
        <CardAction className="self-center">
          <Button variant="link" className="px-0" onClick={() => openDirectory({ tab: 'aktif', kontrak45: true })}>Lihat semua</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={`sticky left-0 z-10 bg-card ${head}`}>Pegawai</TableHead>
              <TableHead className={head}>Department · Posisi</TableHead>
              <TableHead className={head}>Berakhir</TableHead>
              <TableHead className={`text-right ${head}`}>Sisa hari</TableHead>
              <TableHead className={`text-right ${head}`}>Kontrak ke-</TableHead>
              <TableHead className={`text-right ${head}`}>Total masa kontrak</TableHead>
              {canAct && <TableHead className={`text-right ${head}`}>Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent"><TableCell colSpan={canAct ? 7 : 6} className="h-24 text-center text-sm text-muted-foreground">Tidak ada kontrak yang berakhir dalam 45 hari.</TableCell></TableRow>
            )}
            {rows.map((r) => {
              const full = ROSTER.find((e) => e.nik === r.emp.nik)!
              const extReason = ineligibleReason('Perpanjangan Kontrak', full)
              const tetapReason = ineligibleReason('Pengangkatan Tetap', full)
              const organik = (full.jenis ?? 'Organik') === 'Organik'
              return (
                <TableRow key={r.emp.nik} className="group h-12 hover:bg-muted/50">
                  <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted">
                    <div className="flex flex-col items-start gap-1">
                      <PersonCell nik={r.emp.nik} />
                      {r.pending && <StatusBadge variant="info">{r.pending}</StatusBadge>}
                      {r.ending && <StatusBadge variant="warning">{r.ending === 'diproses' ? 'Berakhir diproses' : 'Pengakhiran diajukan'}</StatusBadge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col leading-tight">
                      <span>{r.emp.department}</span>
                      <span className="text-xs text-muted-foreground">{r.emp.posisi}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{formatDate(r.emp.tanggalAkhir!)}</TableCell>
                  <TableCell className="text-right"><SisaBadge days={r.sisa} /></TableCell>
                  <TableCell className="text-right tabular-nums">{r.ke}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{monthsText(r.total)}</TableCell>
                  {canAct && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Blocked reason={extReason}><Button variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={!!extReason} onClick={() => onAct('Perpanjangan Kontrak', r.emp.nik)}>Perpanjang</Button></Blocked>
                        {organik && <Blocked reason={tetapReason}><Button variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={!!tetapReason} onClick={() => onAct('Pengangkatan Tetap', r.emp.nik)}>Angkat Tetap</Button></Blocked>}
                        <Blocked reason={r.ending ? 'Pengakhiran kontrak sudah diproses' : null}><Button variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={!!r.ending} onClick={() => openOffboarding(r.emp.nik, 'Habis Kontrak')}>Proses Berakhir</Button></Blocked>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground tabular-nums">Menampilkan {rows.length} dari {all.length} data</p>
      </CardFooter>
    </Card>
  )
}
