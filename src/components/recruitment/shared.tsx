import { Ban, CalendarClock, CheckCircle2, CircleCheck, CircleX, Clock, FileText, Loader2, Lock, Mail, Send, TriangleAlert } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Stage } from '@/data/candidates'
import type { JobStatus } from '@/data/recruitment/jobs'
import type { OfferStatus } from '@/data/recruitment/offers'
import type { TestStatus } from '@/data/recruitment/tests'

export const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
export const SHEET_RECRUIT = 'w-full gap-0 overflow-y-auto p-0 sm:max-w-[560px]'

/** Tombol dengan aturan bisnis: bila `reason` ada, tombol disabled dan Tooltip menyebut alasannya. */
export function GatedButton({ reason, children, ...props }: ComponentProps<typeof Button> & { reason?: string | false; children: ReactNode }) {
  if (!reason) return <Button {...props}>{children}</Button>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          <Button {...props} disabled className="pointer-events-none">{children}</Button>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">{reason}</TooltipContent>
    </Tooltip>
  )
}

const STAGE_CFG = {
  'Seleksi Administrasi': { variant: 'warning', Icon: FileText },
  Tes: { variant: 'info', Icon: CalendarClock },
  Interview: { variant: 'info', Icon: CalendarClock },
  Penawaran: { variant: 'info', Icon: Mail },
  Diterima: { variant: 'success', Icon: CircleCheck },
  Ditolak: { variant: 'danger', Icon: CircleX },
  Batal: { variant: 'neutral', Icon: Ban },
} as const satisfies Record<Stage, { variant: 'warning' | 'info' | 'success' | 'danger' | 'neutral'; Icon: typeof FileText }>
export function StageBadge({ stage }: { stage: Stage }) {
  const { variant, Icon } = STAGE_CFG[stage]
  return <StatusBadge variant={variant}><Icon aria-hidden />{stage}</StatusBadge>
}

const JOB_CFG = { Draft: ['neutral', FileText], 'Menunggu Approval': ['info', Clock], Dibuka: ['success', CheckCircle2], Ditutup: ['neutral', Lock] } as const
export function JobBadge({ status }: { status: JobStatus }) {
  const [v, Icon] = JOB_CFG[status]
  return <StatusBadge variant={v}><Icon aria-hidden />{status}</StatusBadge>
}

const OFFER_CFG = {
  Draft: ['neutral', FileText], 'Menunggu Approval': ['info', Clock], Disetujui: ['success', CheckCircle2], Dikirim: ['info', Send],
  'Diterima kandidat': ['success', CircleCheck], 'Ditolak kandidat': ['danger', CircleX], Kedaluwarsa: ['warning', TriangleAlert],
} as const
export function OfferBadge({ status }: { status: OfferStatus }) {
  const [v, Icon] = OFFER_CFG[status]
  return <StatusBadge variant={v}><Icon aria-hidden />{status}</StatusBadge>
}

const TEST_CFG = { Dijadwalkan: ['info', CalendarClock], 'Sedang dikerjakan': ['info', Loader2], Selesai: ['success', CheckCircle2], Kedaluwarsa: ['warning', TriangleAlert] } as const
export function TestBadge({ status }: { status: TestStatus }) {
  const [v, Icon] = TEST_CFG[status]
  return <StatusBadge variant={v}><Icon aria-hidden />{status}</StatusBadge>
}
export function LulusBadge({ lulus }: { lulus: boolean | undefined }) {
  if (lulus === undefined) return <span className="text-muted-foreground">—</span>
  return lulus ? <StatusBadge variant="success"><CheckCircle2 aria-hidden />Lulus</StatusBadge> : <StatusBadge variant="danger"><CircleX aria-hidden />Tidak lulus</StatusBadge>
}

export const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[132px_1fr] gap-2 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="min-w-0 break-words font-medium">{children}</dd>
  </div>
)
