import { useRef, useState } from 'react'
import { FileSpreadsheet, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { parseCsv, previewImport, type AttendanceState, type ParsedCsv } from '@/data/attendance'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const MAX = 5 * 1024 * 1024
const n = (v: number) => v.toLocaleString('id-ID')

export function ImportDialog({
  open,
  state,
  onClose,
  onImport,
}: {
  open: boolean
  state: AttendanceState
  onClose: () => void
  onImport: (parsed: ParsedCsv) => void
}) {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const reset = () => {
    setParsed(null)
    setFileName('')
    setError('')
    setDrag(false)
  }

  const handleFile = async (file: File | undefined) => {
    setError('')
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) return setError('Format file harus .csv')
    if (file.size > MAX) return setError('Ukuran file maksimal 5 MB')
    const res = parseCsv(await file.text())
    if (res.error) return setError(res.error)
    setFileName(file.name)
    setParsed(res)
  }

  const pv = parsed ? previewImport(parsed.rows, state) : null
  const range = pv ? (pv.from === pv.to ? formatDate(pv.from) : `${formatDate(pv.from)} – ${formatDate(pv.to)}`) : ''

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import CSV Absensi</DialogTitle>
          <DialogDescription>{parsed ? 'Langkah 2 dari 2 · Pratinjau data' : 'Langkah 1 dari 2 · Pilih file log mesin absen'}</DialogDescription>
        </DialogHeader>

        {!parsed || !pv ? (
          <div className="space-y-3">
            <label
              htmlFor="csv-file"
              onDragOver={(e) => {
                e.preventDefault()
                setDrag(true)
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDrag(false)
                void handleFile(e.dataTransfer.files[0])
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors hover:bg-accent/50 focus-within:ring-[3px] focus-within:ring-ring/50',
                drag && 'bg-accent/50',
                error && 'border-destructive',
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                <Upload className="size-5" aria-hidden />
              </span>
              <span className="text-sm font-medium">Tarik file ke sini atau klik untuk memilih</span>
              <span className="text-xs text-muted-foreground">.csv, maksimal 5 MB</span>
              <input
                ref={input}
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                aria-describedby="csv-help csv-err"
                onChange={(e) => {
                  void handleFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
            <p id="csv-help" className="text-xs text-muted-foreground">
              Kolom: PIN, Tanggal (YYYY-MM-DD), Jam (HH:MM).{' '}
              <a href="/contoh-absensi.csv" download className="font-medium text-foreground underline underline-offset-4">
                Unduh contoh format
              </a>
            </p>
            {error && (
              <p id="csv-err" role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="size-4" aria-hidden />
              <span className="truncate">{fileName}</span>
            </div>
            <p className="text-sm font-medium tabular-nums">
              {n(pv.total)} scan · {pv.pins} PIN · {range}
            </p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge variant="neutral">{n(pv.dupes)} scan ganda diabaikan</StatusBadge>
              {pv.unregistered > 0 && <StatusBadge variant="danger">{pv.unregistered} PIN tidak terdaftar</StatusBadge>}
              {pv.existing > 0 && <StatusBadge variant="info">{n(pv.existing)} sudah ada sebelumnya</StatusBadge>}
              {parsed.invalid > 0 && <StatusBadge variant="warning">{n(parsed.invalid)} baris tidak valid dilewati</StatusBadge>}
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-muted-foreground">PIN</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Tanggal</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">Jam</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.rows.slice(0, 5).map((r, i) => (
                    <TableRow key={i} className="h-12">
                      <TableCell className="tabular-nums">{r.pin}</TableCell>
                      <TableCell className="tabular-nums">{formatDate(r.date)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.time.replace(':', '.')}</TableCell>
                      <TableCell>
                        {pv.isUnregistered(r) ? (
                          <StatusBadge variant="danger">PIN tidak terdaftar</StatusBadge>
                        ) : pv.isDupe(r) ? (
                          <StatusBadge variant="neutral">Ganda</StatusBadge>
                        ) : pv.isExisting(r) ? (
                          <StatusBadge variant="info">Sudah ada</StatusBadge>
                        ) : (
                          <StatusBadge variant="success">Baru</StatusBadge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">Menampilkan {Math.min(5, parsed.rows.length)} dari {n(pv.total)} baris.</p>
          </div>
        )}

        {parsed && (
          <DialogFooter>
            <Button variant="outline" onClick={reset}>Kembali</Button>
            <Button
              onClick={() => {
                onImport(parsed)
                reset()
              }}
            >
              Proses Import
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
