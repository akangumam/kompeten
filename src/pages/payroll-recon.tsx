import type { PageId } from '@/App'
import { PageHeader } from '@/components/payroll/pay/shared'
import { ReconPanel } from '@/components/payroll/recon-tab'
import type { RunCtx } from '@/data/payroll/runs'
import type { CurrentUser } from '@/data/users'

/** Halaman Rekonsiliasi Potongan untuk Finance (tab yang sama dengan Komponen & Potongan, tanpa data gaji pegawai). */
export default function PayrollReconPage({ user, ctx, onNavigate }: { user: CurrentUser; ctx: RunCtx; onNavigate: (page: PageId) => void }) {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Rekonsiliasi Potongan" subtitle="Mencocokkan potongan payroll dengan tagihan Koperasi" />
      <ReconPanel user={user} ctx={ctx} onNavigate={onNavigate} />
    </div>
  )
}
