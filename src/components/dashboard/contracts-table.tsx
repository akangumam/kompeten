import { useState } from 'react'
import { Clock, MoreHorizontal } from 'lucide-react'
import { TrxCreateSheet } from '@/components/transactions/create-sheet'
import { formatDate } from '@/lib/format'
import { useDirectoryNav } from '@/lib/directory-nav'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { LeaveRequest } from '@/data/leave'
import { canCreate, expiringContracts, ineligibleReason, useTrx, type TrxJenis } from '@/data/transactions'
import type { CurrentUser } from '@/data/users'

const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('')

function SisaBadge({ days }: { days: number }) {
  const variant = days <= 14 ? 'danger' : days <= 30 ? 'warning' : 'neutral'
  return (
    <StatusBadge variant={variant}>
      <Clock aria-hidden />
      {days} hari
    </StatusBadge>
  )
}

export function ContractsTable({ user, leaves }: { user: CurrentUser; leaves: LeaveRequest[] }) {
  const { openDirectory, openEmployee, openOffboarding } = useDirectoryNav()
  useTrx()
  const [create, setCreate] = useState<{ jenis: TrxJenis; nik: string } | null>(null)
  const admin = canCreate(user)
  // Satu sumber: pegawai Kontrak aktif yang kontraknya berakhir dalam 45 hari dan belum ditangani (Perpanjangan/Pengangkatan Tetap disetujui keluar dari daftar).
  const rows = expiringContracts().map(({ emp: e, sisa, pending, ending }) => ({
    nama: e.nama,
    nik: e.nik,
    dept: e.department,
    posisi: e.posisi,
    status: e.statusKerja,
    berakhir: formatDate(e.tanggalAkhir!),
    sisa,
    pending,
    ending,
    organik: (e.jenis ?? 'Organik') === 'Organik',
    emp: e,
  }))
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kontrak Berakhir ≤ 45 Hari</CardTitle>
        <CardDescription>Karyawan Kontrak yang perlu ditindaklanjuti</CardDescription>
        <CardAction className="self-center">
          <Button variant="link" className="px-0" onClick={() => openDirectory({ tab: 'aktif', kontrak45: true })}>
            Lihat semua
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 bg-card text-xs font-medium text-muted-foreground">Nama</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Department</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Posisi</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Status Kerja</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Tanggal Berakhir</TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground">Sisa Hari</TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.nik} className="group h-12 hover:bg-muted/50">
                <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">{initials(r.nama)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col leading-tight">
                      <span className="whitespace-nowrap font-medium">{r.nama}</span>
                      <span className="text-xs text-muted-foreground">{r.nik}</span>
                      {r.pending && <StatusBadge variant="info" className="mt-1 w-fit">{r.pending}</StatusBadge>}
                      {r.ending && <StatusBadge variant="warning" className="mt-1 w-fit">{r.ending === 'diproses' ? 'Berakhir diproses' : 'Pengakhiran diajukan'}</StatusBadge>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">{r.dept}</TableCell>
                <TableCell className="whitespace-nowrap">{r.posisi}</TableCell>
                <TableCell>
                  <StatusBadge variant="neutral">{r.status}</StatusBadge>
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{r.berakhir}</TableCell>
                <TableCell className="text-right">
                  <SisaBadge days={r.sisa} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Aksi">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openEmployee({ type: 'roster', key: r.nik })}>Lihat Profil</DropdownMenuItem>
                      {admin && (
                        <>
                          <DropdownMenuItem disabled={!!ineligibleReason('Perpanjangan Kontrak', r.emp)} onSelect={() => setCreate({ jenis: 'Perpanjangan Kontrak', nik: r.nik })}>Perpanjang Kontrak</DropdownMenuItem>
                          {r.organik && <DropdownMenuItem disabled={!!ineligibleReason('Pengangkatan Tetap', r.emp)} onSelect={() => setCreate({ jenis: 'Pengangkatan Tetap', nik: r.nik })}>Angkat Tetap</DropdownMenuItem>}
                          <DropdownMenuItem disabled={!!r.ending} onSelect={() => openOffboarding(r.nik, 'Habis Kontrak')}>Proses Berakhir</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground tabular-nums">Menampilkan {rows.length} dari {rows.length} data</p>
      </CardFooter>
      <TrxCreateSheet open={create !== null} onOpenChange={(o) => !o && setCreate(null)} user={user} leaves={leaves} initial={create ?? undefined} />
    </Card>
  )
}
