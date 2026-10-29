import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { RecapRow } from '@/data/attendance'
import { initials } from '@/data/candidates'
import { cn } from '@/lib/utils'

const head = 'text-xs font-medium text-muted-foreground'
const num = 'text-right tabular-nums'

export function RecapTable({ rows, all }: { rows: RecapRow[]; all: RecapRow[] }) {
  const sum = (k: keyof Omit<RecapRow, 'emp'>) => all.reduce((a, r) => a + r[k], 0)
  const alfa = (v: number) => cn(num, v > 0 && 'font-medium text-danger')
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={`sticky left-0 z-10 bg-card ${head}`}>Pegawai</TableHead>
            <TableHead className={head}>Department</TableHead>
            <TableHead className={`${num} ${head}`}>Hari Kerja</TableHead>
            <TableHead className={`${num} ${head}`}>Hadir</TableHead>
            <TableHead className={`${num} ${head}`}>Telat (kali · menit)</TableHead>
            <TableHead className={`${num} ${head}`}>Pulang Cepat</TableHead>
            <TableHead className={`${num} ${head}`}>Sakit</TableHead>
            <TableHead className={`${num} ${head}`}>Izin</TableHead>
            <TableHead className={`${num} ${head}`}>Cuti</TableHead>
            <TableHead className={`${num} ${head}`}>Dinas</TableHead>
            <TableHead className={`${num} ${head}`}>Alfa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.emp.nik} className="group h-12 hover:bg-muted/50">
              <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">{initials(r.emp.nama)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col leading-tight">
                    <span className="whitespace-nowrap font-medium">{r.emp.nama}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{r.emp.nik}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">{r.emp.department}</TableCell>
              <TableCell className={num}>{r.hariKerja}</TableCell>
              <TableCell className={num}>{r.hadir}</TableCell>
              <TableCell className={num}>{r.telat} · {r.telatMenit} mnt</TableCell>
              <TableCell className={num}>{r.cepat}</TableCell>
              <TableCell className={num}>{r.sakit}</TableCell>
              <TableCell className={num}>{r.izin}</TableCell>
              <TableCell className={num}>{r.cuti}</TableCell>
              <TableCell className={num}>{r.dinas}</TableCell>
              <TableCell className={alfa(r.alfa)}>{r.alfa}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="h-12 bg-muted/30 font-medium hover:bg-muted/30">
            <TableCell className="sticky left-0 z-10 bg-card">Total ({all.length} pegawai)</TableCell>
            <TableCell />
            <TableCell className={num}>{sum('hariKerja')}</TableCell>
            <TableCell className={num}>{sum('hadir')}</TableCell>
            <TableCell className={num} data-testid="telat-total">{sum('telat')} · {sum('telatMenit')} mnt</TableCell>
            <TableCell className={num}>{sum('cepat')}</TableCell>
            <TableCell className={num}>{sum('sakit')}</TableCell>
            <TableCell className={num}>{sum('izin')}</TableCell>
            <TableCell className={num}>{sum('cuti')}</TableCell>
            <TableCell className={num}>{sum('dinas')}</TableCell>
            <TableCell className={alfa(sum('alfa'))}>{sum('alfa')}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
