import { History, MoreHorizontal, Pencil, Search, Eye } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DirectoryFooter } from '@/components/employees/directory-footer'
import { idr } from '@/components/master/common'
import { SalarySheet } from '@/components/payroll/salary-sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { initials } from '@/data/candidates'
import { departments, ROSTER } from '@/data/employees'
import { GRADES } from '@/data/master/grades'
import { upahHarianAt } from '@/data/payroll/components'
import { maskRekening, salaryEntryAt, hasPending, terLabel, upahBpjs } from '@/data/payroll/salaries'
import { PTKP_LIST } from '@/data/payroll/statutory'
import { usePayroll } from '@/data/payroll/store'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'

const ALL = 'all'
const head = 'text-xs font-medium text-muted-foreground'

type Props = { canEdit: boolean; actor: string; onHistory: (query: string) => void; onGotoChange?: () => void }

export function SalaryTab({ canEdit, actor, onHistory, onGotoChange }: Props) {
  usePayroll()
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [dept, setDept] = useState(ALL)
  const [grade, setGrade] = useState(ALL)
  const [ptkp, setPtkp] = useState(ALL)
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [openNik, setOpenNik] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [input])
  useEffect(() => setPage(1), [q, dept, grade, ptkp, perPage])

  const rows = useMemo(
    () =>
      ROSTER.filter((e) => {
        if (q && !`${e.nama} ${e.nik}`.toLowerCase().includes(q)) return false
        if (dept !== ALL && e.department !== dept) return false
        if (grade !== ALL && e.grade !== grade) return false
        if (ptkp !== ALL && e.ptkp !== ptkp) return false
        return true
      }).sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    [q, dept, grade, ptkp],
  )
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * perPage
  const pageRows = rows.slice(start, start + perPage)
  const active = input !== '' || dept !== ALL || grade !== ALL || ptkp !== ALL
  const reset = () => {
    setInput('')
    setDept(ALL)
    setGrade(ALL)
    setPtkp(ALL)
  }
  const sel = ROSTER.find((e) => e.nik === openNik)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gaji Pegawai</CardTitle>
        <CardDescription>Gaji Pokok per pegawai selalu berada dalam rentang Grade; perubahannya lewat Ajukan Perubahan Gaji. Tunjangan Jabatan mengikuti Level. Pegawai Harian memakai Upah Harian (Komponen); perubahan upah harian ke depan lewat Promosi/Transaksi Pegawai.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="Cari pegawai" placeholder="Cari nama atau NIP…" className="pl-9" value={input} onChange={(e) => setInput(e.target.value)} />
          </div>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger aria-label="Department" className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Department</SelectItem>
              {departments().map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger aria-label="Grade" className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Grade</SelectItem>
              {GRADES.map((g) => <SelectItem key={g.kode} value={g.kode}>{g.kode}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ptkp} onValueChange={setPtkp}>
            <SelectTrigger aria-label="PTKP" className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua PTKP</SelectItem>
              {PTKP_LIST.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={!active} onClick={reset}>Reset</Button>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Menampilkan {rows.length.toLocaleString('id-ID')} pegawai aktif
          {dept !== ALL ? ` di Department ${dept}` : ''}
          {grade !== ALL ? ` pada Grade ${grade}` : ''}
          {ptkp !== ALL ? ` dengan PTKP ${ptkp}` : ''}
          {q ? ` dengan kata kunci “${input.trim()}”` : ''} per {formatDate(DEMO_TODAY)}.
        </p>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={`sticky left-0 z-10 bg-card ${head}`}>Pegawai</TableHead>
              <TableHead className={head}>Department · Posisi · Grade</TableHead>
              <TableHead className={`text-right ${head}`}>Gaji Pokok</TableHead>
              <TableHead className={`text-right ${head}`}>Tunjangan Jabatan</TableHead>
              <TableHead className={`text-right ${head}`}>Upah BPJS</TableHead>
              <TableHead className={head}>Rekening / PTKP · TER</TableHead>
              <TableHead className={head}>Berlaku mulai</TableHead>
              <TableHead className={`text-right ${head}`}>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-28 text-center text-sm text-muted-foreground">
                  Tidak ada pegawai yang sesuai filter.
                  <Button variant="link" className="ml-1 h-auto p-0" onClick={reset}>Reset filter</Button>
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((e) => {
              const entry = salaryEntryAt(e, DEMO_TODAY)
              const pending = hasPending(e)
              return (
                <TableRow key={e.nik} className="group h-12 hover:bg-muted/50">
                  <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">{initials(e.nama)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col leading-tight">
                        <span className="whitespace-nowrap font-medium">{e.nama}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">{e.nik}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-col leading-tight">
                      <span>{e.department}</span>
                      <span className="text-xs text-muted-foreground">{e.posisi} · Grade {e.grade}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {e.kelompok === 'Harian' ? <span title="Rp 100.000/hari (Upah Harian)">{idr(upahHarianAt(DEMO_TODAY))} / hari</span> : idr(e.gajiPokok)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{e.kelompok === 'Harian' ? '—' : idr(e.tunjanganTetap)}</TableCell>
                  <TableCell className="text-right tabular-nums">{e.kelompok === 'Harian' ? <span className="text-muted-foreground">Dari upah periode</span> : idr(upahBpjs(e))}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    <div>{maskRekening(e.bank, e.nomorRekening)}</div>
                    <div className="text-xs text-muted-foreground">{terLabel(e.ptkp)}</div>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    <div className="flex flex-col items-start gap-1">
                      <span>{formatDate(entry.berlakuMulai)}</span>
                      {pending && <StatusBadge variant="info">Ada perubahan terjadwal</StatusBadge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Aksi ${e.nama}`}><MoreHorizontal className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setOpenNik(e.nik)}>
                          {canEdit ? <Pencil /> : <Eye />} {canEdit ? 'Edit gaji' : 'Lihat gaji & simulasi'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onHistory(e.nama)}>
                          <History /> Lihat riwayat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
      <DirectoryFooter total={rows.length} start={start} perPage={perPage} current={current} totalPages={totalPages} onPerPage={setPerPage} onPage={setPage} />
      {sel && <SalarySheet key={sel.nik} emp={sel} canEdit={canEdit} actor={actor} onGotoChange={onGotoChange} onClose={() => setOpenNik(null)} />}
    </Card>
  )
}
