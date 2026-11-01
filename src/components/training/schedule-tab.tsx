import { Pager, usePaging } from '@/components/attendance/pager'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { enrollmentsOf, sessionRecorded, type Program } from '@/data/training/store'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'

const head = 'text-xs font-medium text-muted-foreground'

export function ScheduleTab({ programs, user, onAttend }: { programs: Program[]; user: CurrentUser; onAttend: (kode: string, sesiId: string) => void }) {
  const rows = programs
    .filter((p) => p.tipe === 'Offline' && p.status !== 'Draft')
    .flatMap((p) => p.sesi.map((s, i) => ({ p, s, no: i + 1 })))
    .sort((a, b) => b.s.tanggal.localeCompare(a.s.tanggal) || a.p.kode.localeCompare(b.p.kode))
  const paging = usePaging(rows, rows.length + programs.map((p) => p.kode).join())
  const admin = user.role === 'admin'
  return (
    <Card>
      <CardHeader>
        <CardTitle>Jadwal sesi offline</CardTitle>
        <CardDescription>Daftar hadir dicatat HR pada atau setelah tanggal sesi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={head}>Tanggal</TableHead>
              <TableHead className={head}>Jam (WIB)</TableHead>
              <TableHead className={head}>Program</TableHead>
              <TableHead className={head}>Lokasi</TableHead>
              <TableHead className={head}>Trainer</TableHead>
              <TableHead className={`text-right ${head}`}>Kuota terisi</TableHead>
              <TableHead className={head}>Kehadiran</TableHead>
              {admin && <TableHead className={`text-right ${head}`}>Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={admin ? 8 : 7} className="h-24 text-center text-sm text-muted-foreground">Tidak ada sesi offline.</TableCell></TableRow>}
            {paging.rows.map(({ p, s, no }) => {
              const past = s.tanggal <= DEMO_TODAY
              const rec = sessionRecorded(p.kode, s.id)
              const terisi = enrollmentsOf(p.kode).length
              return (
                <TableRow key={s.id} className="h-12">
                  <TableCell className="whitespace-nowrap font-medium tabular-nums">{formatDate(s.tanggal)}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{s.mulai}–{s.selesai}</TableCell>
                  <TableCell><span className="font-medium">{p.judul}</span> <span className="text-xs text-muted-foreground tabular-nums">{p.kode} · sesi {no}</span></TableCell>
                  <TableCell>{s.lokasi}</TableCell>
                  <TableCell>{s.trainer}</TableCell>
                  <TableCell className="text-right tabular-nums">{terisi}{p.kuota ? `/${p.kuota}` : ''}</TableCell>
                  <TableCell>{rec ? <StatusBadge variant="success">Tercatat</StatusBadge> : <StatusBadge variant="neutral">{past ? 'Belum dicatat' : 'Belum berlangsung'}</StatusBadge>}</TableCell>
                  {admin && (
                    <TableCell className="text-right">
                      {past ? (
                        <Button size="sm" variant={rec ? 'outline' : 'default'} onClick={() => onAttend(p.kode, s.id)}>Daftar Hadir</Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild><span tabIndex={0} className="inline-flex"><Button size="sm" variant="outline" disabled>Daftar Hadir</Button></span></TooltipTrigger>
                          <TooltipContent>Sesi belum berlangsung</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <Pager total={rows.length} paging={paging} />
      </CardContent>
    </Card>
  )
}
