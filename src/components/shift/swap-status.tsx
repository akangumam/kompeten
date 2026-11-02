import { Hourglass } from 'lucide-react'
import { LeaveStatusBadge } from '@/components/leave/status'
import { StatusBadge } from '@/components/ui/status-badge'
import { SWAP_STATUS_LABEL, type SwapStatus } from '@/data/shift-swaps'

export const swapStatusLabel = (s: SwapStatus, labels: Record<string, string>) => (s === 'menunggu-konfirmasi' ? SWAP_STATUS_LABEL : labels[s])

export function SwapStatusBadge({ status }: { status: SwapStatus }) {
  if (status === 'menunggu-konfirmasi') {
    return (
      <StatusBadge variant="warning">
        <Hourglass aria-hidden />
        {SWAP_STATUS_LABEL}
      </StatusBadge>
    )
  }
  return <LeaveStatusBadge status={status} />
}
