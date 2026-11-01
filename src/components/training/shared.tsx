import { DocumentPaper } from '@/components/document-paper'
import { Award, CircleCheck, CircleX, Lock, LockOpen, Minus, Play } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { competencyOf } from '@/data/master/competencies'
import { certOf, empOf, programOf, type EnrStatus, type Program, type ProgramStatus, type Progress, type TrainingType } from '@/data/training/store'
import { formatDateLong } from '@/lib/format'
import { cn } from '@/lib/utils'

const TYPE_VARIANT: Record<TrainingType, 'info' | 'success' | 'warning'> = { Offline: 'warning', Online: 'info', YouTube: 'success' }
export const TypeBadge = ({ tipe }: { tipe: TrainingType }) => <StatusBadge variant={TYPE_VARIANT[tipe]}>{tipe}</StatusBadge>

const STATUS_VARIANT: Record<ProgramStatus, 'neutral' | 'success' | 'info'> = { Draft: 'neutral', Aktif: 'success', Selesai: 'info' }
export const ProgramStatusBadge = ({ status }: { status: ProgramStatus }) => <StatusBadge variant={STATUS_VARIANT[status]}>{status}</StatusBadge>

const ENR_VARIANT: Record<EnrStatus, 'neutral' | 'info' | 'success' | 'danger'> = { 'Belum mulai': 'neutral', Berjalan: 'info', Lulus: 'success', 'Tidak lulus': 'danger', Selesai: 'success' }
export const EnrBadge = ({ status }: { status: EnrStatus }) => <StatusBadge variant={ENR_VARIANT[status]}>{status}</StatusBadge>

export function CompChips({ program }: { program: Program }) {
  return (
    <div className="flex flex-wrap gap-1">
      {program.kompetensi.map((k) => (
        <Tooltip key={k.kode}>
          <TooltipTrigger asChild><span tabIndex={0} className="rounded-md border px-1.5 py-0.5 text-xs font-medium tabular-nums">{k.kode}</span></TooltipTrigger>
          <TooltipContent>{competencyOf(k.kode)?.nama ?? k.kode} · target level {k.target}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

export function MiniProgress({ value, total }: { value: number; total: number }) {
  const pct = total ? (value / total) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 text-sm tabular-nums">{value}/{total}</span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={total} aria-label={`${value} dari ${total} materi wajib tervalidasi`}>
        <div className="h-full rounded-full bg-chart-1" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Status uji akhir; Terkunci menampilkan alasan lewat Tooltip. */
export function UjiBadge({ pr }: { pr: Progress }) {
  if (pr.uji === 'tanpa') return <span className="text-sm text-muted-foreground">Tanpa uji</span>
  if (pr.uji === 'lulus') return <StatusBadge variant="success"><CircleCheck aria-hidden />Lulus {pr.nilai}</StatusBadge>
  if (pr.uji === 'tidak-lulus') return <StatusBadge variant="danger"><CircleX aria-hidden />Tidak lulus {pr.nilai}</StatusBadge>
  if (pr.uji === 'terbuka') return <StatusBadge variant="info"><LockOpen aria-hidden />Terbuka</StatusBadge>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><StatusBadge variant="neutral"><Lock aria-hidden />Terkunci</StatusBadge></span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{pr.lockReason}</TooltipContent>
    </Tooltip>
  )
}

export function CertLink({ no, onOpen }: { no?: string; onOpen: (no: string) => void }) {
  if (!no) return <span className="text-muted-foreground"><Minus className="size-4" aria-label="Belum ada sertifikat" /></span>
  return (
    <Button variant="link" size="sm" className="h-auto p-0 text-xs tabular-nums" onClick={() => onOpen(no)}>
      <Award aria-hidden />{no.replace('SRT/TRN-PPI/', '')}
    </Button>
  )
}

/** Pratinjau sertifikat: nomor, nama, program, tanggal, nilai, penanda tangan HR & GA Manager. */
export function CertificateDialog({ no, onClose }: { no: string | null; onClose: () => void }) {
  const cert = no ? certOf(no) : undefined
  const prog = cert ? programOf(cert.programKode) : undefined
  const emp = cert ? empOf(cert.nik) : undefined
  return (
    <Dialog open={!!cert} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Sertifikat</DialogTitle>
          <DialogDescription>Pratinjau sertifikat kelulusan uji training</DialogDescription>
        </DialogHeader>
        {cert && prog && (
          <DocumentPaper paperClassName="rounded-lg border-2 border-double p-6 text-center" className="space-y-4">
            <Logo className="mx-auto" />
            <p className="text-xs tracking-widest text-muted-foreground uppercase">Sertifikat Kelulusan</p>
            <p className="text-xs tabular-nums text-muted-foreground">No. {cert.no}</p>
            <p className="text-sm text-muted-foreground">Diberikan kepada</p>
            <p className="text-2xl font-semibold tracking-tight">{emp?.nama ?? cert.nik}</p>
            <p className="text-sm text-muted-foreground">yang telah lulus uji akhir program</p>
            <p className="text-lg font-semibold">{prog.judul}</p>
            <p className="text-sm tabular-nums">Nilai <b>{cert.nilai}</b> · {formatDateLong(cert.tanggal)}</p>
            <div className="pt-4 text-sm">
              <p className="text-muted-foreground">PT Primaplast Indonesia</p>
              <div className="mx-auto mt-8 w-48 border-t pt-1 font-medium">Lestari Wulandari</div>
              <p className="text-xs text-muted-foreground">HR &amp; GA Manager</p>
            </div>
          </DocumentPaper>
        )}
        <DialogFooter><Button onClick={onClose}>Tutup</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Kartu thumbnail placeholder untuk video YouTube (tanpa pemutar eksternal di prototipe). */
export function VideoCard({ judul, url, className }: { judul: string; url?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex aspect-video w-24 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground" aria-hidden>
        <Play className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{judul}</p>
        {url && <p className="truncate text-xs text-muted-foreground">{url}</p>}
      </div>
    </div>
  )
}
