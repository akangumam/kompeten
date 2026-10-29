import { TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TRANSISI_NOTE, type AttPeriod } from '@/data/master/attendance-rules'

/** Peringatan periode peralihan cut-off; hanya tampil bila periode terpilih adalah periode transisi. */
export function TransitionAlert({ period }: { period: AttPeriod }) {
  if (!period.transisi) return null
  return (
    <Alert variant="warning">
      <TriangleAlert />
      <AlertDescription>{TRANSISI_NOTE(period)}</AlertDescription>
    </Alert>
  )
}
