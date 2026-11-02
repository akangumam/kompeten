import { LogOut } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { accountOf, needsOtp, rolesOf, type Account } from '@/data/accounts'
import { Toaster } from '@/components/ui/sonner'
import { ROLE_LABEL } from '@/data/users'
import { endSession, presentAs } from '@/lib/session'

const RINGKAS: Record<string, string> = {
  'PPI-2016-0322': 'Lowongan, kandidat, DICAP, penawaran, dan master rekrutmen.',
  'PPI-2016-0323': 'Dua peran HR: pemilih peran aktif muncul di dalam perspektif ini.',
  'PPI-2016-0003': 'Persetujuan akhir HR, boleh mewakili atasan, melihat audit log.',
  'PPI-2019-0007': 'Atasan: tim Injection saja, tanpa Rupiah.',
  'PPI-2020-0031': 'Proses payroll, komponen, slip, dan perubahan gaji.',
  'PPI-2017-0009': 'Daftar pembayaran, rekonsiliasi potongan, dan pesangon (transfer).',
  'PPI-2024-0076': 'Anggota, simpanan, kasbon, dan pinjaman koperasi.',
  'PPI-2017-0012': 'Kas koperasi, master budget, unit dagang, dan SHU.',
  'PPI-2018-0013': 'Persetujuan akhir koperasi dan pengaturan KSB.',
  'DIR-0001': 'Baca saja: dashboard dan laporan lintas modul, tanpa Rupiah per pegawai.',
  'PPI-2024-0058': 'Akun pengguna, peran, kebijakan keamanan, dan audit log.',
}

/** Mode Presentasi: pilih akun demo yang akan "dilihat". Aplikasi berjalan persis seperti akun itu, tanpa OTP. */
export default function PerspectivePicker({ host }: { host: Account }) {
  const items = Object.keys(RINGKAS).map((nip) => accountOf(nip)).filter((a): a is Account => !!a)
  return (
    <div className="min-h-svh bg-background">
      <Toaster />
      <header className="flex h-16 items-center justify-between gap-3 border-b px-4 md:px-8">
        <Logo />
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{host.nama}</span>
          <Button variant="outline" size="sm" onClick={() => endSession('logout')}><LogOut /> Keluar</Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pilih perspektif</h1>
          <p className="text-sm text-muted-foreground">Aplikasi berjalan persis seperti akun yang dipilih (peran, cakupan data, menu, notifikasi), tanpa OTP. Aksi yang dijalankan tetap berjalan dan tercatat di audit sebagai mode presentasi.</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => {
            const roles = rolesOf(a)
            return (
              <li key={a.nip}>
                <button
                  type="button"
                  onClick={() => presentAs(a.nip)}
                  className="flex h-full w-full flex-col gap-2 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-medium">{a.nama}</span>
                    {needsOtp(roles) && <StatusBadge variant="info">OTP</StatusBadge>}
                  </span>
                  <span className="text-sm font-medium">{roles.map((r) => ROLE_LABEL[r]).join(' + ')}</span>
                  <span className="text-sm text-muted-foreground">{RINGKAS[a.nip]}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  )
}
