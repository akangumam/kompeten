import { MoreHorizontal } from 'lucide-react'
import { Pager, usePaging } from '@/components/attendance/pager'
import { CompChips, ProgramStatusBadge, TypeBadge } from '@/components/training/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { paketOf } from '@/data/recruitment/tests'
import { empOf, enrollmentsOf, materiCount, passingOf, setProgramStatus, type Program } from '@/data/training/store'
import type { CurrentUser } from '@/data/users'

const head = 'text-xs font-medium text-muted-foreground'

export function ProgramTab({ programs, user, onOpen, onPropose }: { programs: Program[]; user: CurrentUser; onOpen: (p: Program, edit: boolean) => void; onPropose: (p: Program) => void }) {
  const paging = usePaging(programs, programs.map((p) => p.kode).join())
  const admin = user.role === 'admin'
  const spv = user.role === 'supervisor'
  const pesertaOf = (p: Program) => enrollmentsOf(p.kode).filter((e) => !spv || empOf(e.nik)?.atasanId === user.nik).length
  return (
    <Card>
      <CardHeader>
        <CardTitle>Program training</CardTitle>
        <CardDescription>{spv ? 'Jumlah peserta menghitung tim Anda' : 'Setiap program terkait ke satu atau lebih kompetensi'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={head}>Kode</TableHead>
              <TableHead className={head}>Judul</TableHead>
              <TableHead className={head}>Kompetensi</TableHead>
              <TableHead className={`text-right ${head}`}>Materi</TableHead>
              <TableHead className={`text-right ${head}`}>Peserta</TableHead>
              <TableHead className={head}>Uji akhir</TableHead>
              <TableHead className={head}>Status</TableHead>
              <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">Tidak ada program yang cocok dengan filter.</TableCell></TableRow>}
            {paging.rows.map((p) => {
              const m = materiCount(p)
              const paket = paketOf(p.paketId ?? '')
              return (
                <TableRow key={p.kode} className="h-14">
                  <TableCell className="font-medium tabular-nums">{p.kode}</TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1"><span className="font-medium">{p.judul}</span><TypeBadge tipe={p.tipe} /></div>
                  </TableCell>
                  <TableCell><CompChips program={p} /></TableCell>
                  <TableCell className="text-right tabular-nums">{m.total} <span className="text-muted-foreground">({m.wajib} wajib)</span></TableCell>
                  <TableCell className="text-right tabular-nums">{pesertaOf(p)}</TableCell>
                  <TableCell>{paket ? <span>{paket.nama} <span className="text-muted-foreground tabular-nums">· passing {passingOf(p)}</span></span> : <span className="text-muted-foreground">Tanpa uji</span>}</TableCell>
                  <TableCell><ProgramStatusBadge status={p.status} /></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Aksi"><MoreHorizontal /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onOpen(p, admin)}>{admin ? 'Edit Program' : 'Lihat Detail'}</DropdownMenuItem>
                        {spv && p.status !== 'Selesai' && <DropdownMenuItem onSelect={() => onPropose(p)}>Usulkan peserta</DropdownMenuItem>}
                        {admin && p.status === 'Draft' && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setProgramStatus(p.kode, 'Aktif')}>Aktifkan</DropdownMenuItem></>}
                        {admin && p.status === 'Aktif' && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setProgramStatus(p.kode, 'Selesai')}>Tandai Selesai</DropdownMenuItem></>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <Pager total={programs.length} paging={paging} />
      </CardContent>
    </Card>
  )
}
