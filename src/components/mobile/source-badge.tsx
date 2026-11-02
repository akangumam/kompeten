import { Smartphone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

/** Penanda pengajuan yang masuk dari aplikasi mobile karyawan. */
export function SourceBadge({ sumber, className }: { sumber?: 'web' | 'aplikasi'; className?: string }) {
  if (sumber !== 'aplikasi') return null
  return (
    <Badge variant="outline" className={className}>
      <Smartphone aria-hidden />
      Dari aplikasi
    </Badge>
  )
}
