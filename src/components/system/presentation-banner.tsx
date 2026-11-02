import { Presentation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROLE_LABEL } from '@/data/users'
import { endSession, leavePerspective, type Session } from '@/lib/session'

/** Banner tetap saat Mode Presentasi: menunjukkan perspektif yang sedang dilihat. */
export function PresentationBanner({ session }: { session: Session }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-info/10 px-4 py-2 text-sm text-info">
      <Presentation className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">Mode presentasi — melihat sebagai <strong>{session.account.nama}</strong> ({ROLE_LABEL[session.role]})</p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={leavePerspective}>Ganti perspektif</Button>
        <Button size="sm" variant="outline" onClick={() => endSession('logout')}>Keluar</Button>
      </div>
    </div>
  )
}
