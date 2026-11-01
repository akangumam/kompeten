import { DocumentPaper } from '@/components/document-paper'
import { Logo } from '@/components/brand/logo'
import { Download, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/status-badge'
import { nowStamp } from '@/data/attendance'
import { empOf, longDate, teamLabel, type LeavePeriod } from '@/data/leave'
import { dayTypeLabel, dayTypeOf, fj, rp, type RekapRow } from '@/data/overtime'
import { formatDate } from '@/lib/format'

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export function SlipDialog({
  row,
  period,
  final,
  onClose,
}: {
  row: RekapRow | null
  period: LeavePeriod
  final: boolean
  onClose: () => void
}) {
  const emp = row ? empOf(row.nik) : null
  const month = MONTHS[Number(period.end.slice(5, 7)) - 1]
  const range = `${formatDate(period.start)} – ${formatDate(period.end)}`
  return (
    <Dialog open={row !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-full overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="print:hidden">
          <DialogTitle>Slip Lembur</DialogTitle>
          <DialogDescription>{emp?.nama} · {period.label}</DialogDescription>
        </DialogHeader>
        {row && emp && (
          <DocumentPaper as="article" draft={!final} paperClassName="mx-auto w-full max-w-xl p-6">
            <header className="flex items-start justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <Logo />
                <p className="border-l pl-3 font-semibold">PT Primaplast Indonesia</p>
              </div>
              <div className="text-right">
                <p className="font-semibold tracking-wide">SLIP LEMBUR</p>
                <p className="text-xs text-muted-foreground tabular-nums">Periode {period.label} ({range})</p>
              </div>
            </header>
            {!final && (
              <div className="mt-3">
                <StatusBadge variant="warning">Draft — final setelah Closing Kehadiran</StatusBadge>
              </div>
            )}
            <dl className="mt-4 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1">
              <dt className="text-muted-foreground">Nama</dt><dd className="font-medium">{emp.nama}</dd>
              <dt className="text-muted-foreground">NIP</dt><dd className="tabular-nums">{emp.nik}</dd>
              <dt className="text-muted-foreground">Department</dt><dd>{teamLabel(emp)}</dd>
              <dt className="text-muted-foreground">Group Kerja</dt><dd>{emp.kelompok}</dd>
              <dt className="text-muted-foreground">Upah sejam</dt><dd className="tabular-nums">{rp(row.upah)}</dd>
            </dl>
            <table className="mt-4 w-full text-xs">
              <thead>
                <tr className="border-y text-left text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Tanggal</th>
                  <th className="py-2 pr-2 font-medium">Jenis Hari</th>
                  <th className="py-2 pr-2 font-medium">No. SPL</th>
                  <th className="py-2 pr-2 text-right font-medium">Jam</th>
                  <th className="py-2 pr-2 font-medium">Rincian Pengali</th>
                  <th className="py-2 text-right font-medium">Nominal</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {row.lines.map(({ rec, paid }) => (
                  <tr key={rec.id} className="border-b align-top">
                    <td className="py-2 pr-2">{formatDate(rec.date)}</td>
                    <td className="py-2 pr-2">{dayTypeLabel(dayTypeOf(emp, rec.date))}</td>
                    <td className="py-2 pr-2">{rec.no}</td>
                    <td className="py-2 pr-2 text-right">{fj(paid.jam)}</td>
                    <td className="py-2 pr-2">{paid.breakdown.text} = {fj(paid.breakdown.pengali)}</td>
                    <td className="py-2 text-right">{rp(paid.nominal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="tabular-nums">
                <tr className="font-semibold">
                  <td colSpan={3} className="py-2">Total</td>
                  <td className="py-2 pr-2 text-right">{fj(row.jam)}</td>
                  <td className="py-2 pr-2">{fj(row.pengali)} jam-pengali</td>
                  <td className="py-2 text-right">{rp(row.total)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">Dibayarkan bersama gaji periode {month}</p>
            <footer className="mt-6 border-t pt-3 text-xs text-muted-foreground tabular-nums">
              Dicetak {nowStamp()} · Dokumen dibuat oleh sistem
            </footer>
          </DocumentPaper>
        )}
        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => toast.info('Dibuat di tahap berikutnya')}>
            <Download className="size-4" />
            Unduh PDF
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="size-4" />
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
