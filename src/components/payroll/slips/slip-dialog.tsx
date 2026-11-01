import { DocumentPaper } from '@/components/document-paper'
import { Download, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/brand/logo'
import { idr } from '@/components/payroll/pay/shared'
import { slipDoc, type Line } from '@/components/payroll/slips/slip-doc'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/status-badge'
import { nowStamp } from '@/data/attendance'
import { cutoffText, type PayPeriod, type PayRow } from '@/data/payroll/runs'
import { formatDate, terbilang } from '@/lib/format'

function Lines({ title, lines, total, totalLabel, negativeAsMinus }: { title: string; lines: Line[]; total: number; totalLabel: string; negativeAsMinus?: boolean }) {
  return (
    <section className="space-y-2">
      <h3 className="border-b pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <ul className="space-y-1 text-xs">
        {lines.map((l) => (
          <li key={l.label} className="flex items-start justify-between gap-3">
            <span>{l.label}</span>
            <span className="shrink-0 tabular-nums">{negativeAsMinus && l.amount < 0 ? `− ${idr(-l.amount)}` : idr(l.amount)}</span>
          </li>
        ))}
      </ul>
      <p className="flex items-center justify-between gap-3 border-t pt-1.5 text-xs font-semibold">
        <span>{totalLabel}</span>
        <span className="tabular-nums">{idr(total)}</span>
      </p>
    </section>
  )
}

/** Pratinjau slip gaji A5 portrait; saat dicetak hanya lembar slip yang tampil. */
export function SlipDialog({ row, period, onClose }: { row: PayRow | null; period: PayPeriod; onClose: () => void }) {
  const doc = row ? slipDoc(row, period) : null
  return (
    <Dialog open={row !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-full overflow-y-auto sm:max-w-[640px]">
        <DialogHeader className="print:hidden">
          <DialogTitle>Slip Gaji</DialogTitle>
          <DialogDescription>{row?.nama} · {period.label}</DialogDescription>
        </DialogHeader>
        {row && doc && (
          <DocumentPaper as="article" paperClassName="mx-auto w-full max-w-[560px] p-6" className="space-y-4">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
              <div className="flex items-center gap-3">
                <Logo />
                <p className="border-l pl-3 text-sm font-semibold">PT Primaplast Indonesia</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-semibold tracking-wide">SLIP GAJI</p>
                <StatusBadge variant="success">Final</StatusBadge>
              </div>
            </header>
            <p className="text-xs text-muted-foreground tabular-nums">
              Periode {period.label} · {formatDate(period.dari)} – {formatDate(period.sampai)} · Dibayar {formatDate(period.bayar)}
            </p>

            <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Nama</dt><dd className="font-medium">{row.nama}</dd>
              <dt className="text-muted-foreground">NIP</dt><dd className="tabular-nums">{row.nik}</dd>
              <dt className="text-muted-foreground">Department</dt><dd>{row.department}{row.section ? ` · ${row.section}` : ''}</dd>
              <dt className="text-muted-foreground">Posisi</dt><dd>{row.posisi} · Grade {doc.emp.grade}</dd>
              <dt className="text-muted-foreground">Status PTKP</dt><dd>{row.ptkp}</dd>
              <dt className="text-muted-foreground">Rekening</dt><dd className="tabular-nums">{doc.rekening}</dd>
            </dl>

            <div className="grid gap-6 sm:grid-cols-2">
              <Lines title="Pendapatan" lines={doc.pendapatan} total={row.pendapatan} totalLabel="Total Pendapatan" negativeAsMinus />
              <Lines title="Potongan" lines={doc.potongan} total={row.potongan} totalLabel="Total Potongan" />
            </div>

            <div className="rounded-md bg-muted p-3">
              <p className="flex items-center justify-between gap-3 text-sm font-semibold">
                <span>Diterima (neto)</span>
                <span className="text-base tabular-nums">{idr(row.neto)}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Terbilang: {terbilang(row.neto)}</p>
            </div>

            <p className="rounded-md border p-3 text-xs text-muted-foreground">
              Ditanggung perusahaan (tidak memotong gaji):{' '}
              {doc.company.map((c, i) => (
                <span key={c.label}>{i > 0 && ' · '}{c.label} <span className="tabular-nums">{idr(c.amount)}</span></span>
              ))}
              .
            </p>

            <p className="text-xs text-muted-foreground tabular-nums">
              Kehadiran ({cutoffText(period)}): Hari kerja {row.hariKerja} · Hadir {row.hadir} · Alfa {row.alfa} · Izin {row.izin} · Cuti {row.cuti} · Sakit {row.sakit} · Lembur {row.lemburJam.toLocaleString('id-ID')} jam
            </p>
            <footer className="border-t pt-3 text-xs text-muted-foreground">
              Dokumen dibuat oleh sistem, tidak memerlukan tanda tangan · Dicetak {nowStamp()}
            </footer>
          </DocumentPaper>
        )}
        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => toast.info('Dibuat di tahap berikutnya')}><Download className="size-4" />Unduh PDF</Button>
          <Button onClick={() => window.print()}><Printer className="size-4" />Cetak</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
