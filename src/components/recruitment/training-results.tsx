import { PagedFooter, pageSlice } from '@/components/recruitment/pager'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { paketOf } from '@/data/recruitment/tests'
import { ENROLLMENTS, empOf, programOf, useTraining } from '@/data/training/store'
import { formatDate } from '@/lib/format'
import { useState } from 'react'

const head = 'text-xs font-medium text-muted-foreground'

/** Hasil uji akhir program Training (sumber "Training"), terpisah dari hasil tes Rekrutmen. */
export const trainingResults = () =>
  ENROLLMENTS.flatMap((e) => e.uji.map((a, i) => ({ e, a, i, p: programOf(e.programKode)! })))
    .filter((x) => x.p)
    .sort((x, y) => y.a.tanggal.localeCompare(x.a.tanggal) || x.p.kode.localeCompare(y.p.kode))

export function TrainingResultsTable() {
  useTraining()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const all = trainingResults()
  const rows = pageSlice(all, page, perPage)
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={head}>Pegawai</TableHead>
            <TableHead className={head}>Program</TableHead>
            <TableHead className={head}>Paket</TableHead>
            <TableHead className={head}>Tanggal</TableHead>
            <TableHead className={`text-right ${head}`}>Nilai</TableHead>
            <TableHead className={head}>Lulus?</TableHead>
            <TableHead className={head}>Sumber</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">Belum ada hasil uji training.</TableCell></TableRow>}
          {rows.map(({ e, a, i, p }) => (
            <TableRow key={`${e.programKode}|${e.nik}|${i}`} className="h-12 hover:bg-muted/50">
              <TableCell><div className="flex flex-col leading-tight"><span className="whitespace-nowrap font-medium">{empOf(e.nik)?.nama}</span><span className="text-xs tabular-nums text-muted-foreground">{e.nik}</span></div></TableCell>
              <TableCell><span className="font-medium">{p.judul}</span> <span className="text-xs tabular-nums text-muted-foreground">{p.kode}</span></TableCell>
              <TableCell className="whitespace-nowrap">{paketOf(p.paketId ?? '')?.nama}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{formatDate(a.tanggal)}</TableCell>
              <TableCell className="text-right tabular-nums">{a.nilai}</TableCell>
              <TableCell><StatusBadge variant={a.lulus ? 'success' : 'danger'}>{a.lulus ? 'Lulus' : 'Tidak lulus'}</StatusBadge></TableCell>
              <TableCell><StatusBadge variant="info">Training · {a.sumber === 'aplikasi' ? 'Aplikasi' : 'Manual'}</StatusBadge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PagedFooter total={all.length} page={page} perPage={perPage} setPage={setPage} setPerPage={setPerPage} />
    </>
  )
}
