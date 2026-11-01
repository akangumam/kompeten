import { Settings } from 'lucide-react'
import { ROLE_LABEL, type CurrentUser } from '@/data/users'

/** Pengaturan Sistem (pengguna, peran, kebijakan keamanan, audit log) dibuat di tahap 12b. */
export default function SystemSettingsPage({ user }: { user: CurrentUser }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted"><Settings className="size-6 text-muted-foreground" aria-hidden /></div>
      <h1 className="text-xl font-semibold tracking-tight">Pengaturan Sistem</h1>
      <p className="text-sm text-muted-foreground">Halaman ini tersedia di tahap berikutnya. Peran aktif Anda: {ROLE_LABEL[user.role]}.</p>
    </div>
  )
}
