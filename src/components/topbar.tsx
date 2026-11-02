import { Fragment } from 'react'
import { Bell, CalendarCheck, ChevronsUpDown, KeyRound, LogOut, Wallet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import type { PageId } from '@/App'
import { markRead, notifsFor, unreadOf, useNotifs } from '@/data/notifications'
import { StatusBadge } from '@/components/ui/status-badge'
import { ROLE_LABEL, type CurrentUser, type Role } from '@/data/users'
import { DEMO_MODE } from '@/lib/demo'
import type { Account } from '@/data/accounts'
import { ChangePasswordDialog } from '@/components/change-password-dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

/** Halaman profil pegawai; `from` menentukan jejak breadcrumb. */
type Draft = { nama: string; activated: boolean; from: 'directory' | 'recruitment' }
type Crumb = { label: string; to?: PageId }

const DASH_CRUMB: Record<string, string> = { umum: 'Umum & Rekrutmen', produksi: 'Produksi', presensi: 'Presensi' }

function crumbsFor(activePage: PageId, draft?: Draft, ksb = false, dashTab = 'umum'): Crumb[] {
  const c = (...labels: string[]): Crumb[] => labels.map((label) => ({ label }))
  if (activePage === 'system-settings') return c('Pengaturan Sistem')
  if (activePage === 'recruitment') return c('Recruitment', 'Daftar Kandidat')
  if (activePage === 'recruitment-jobs') return c('Recruitment', 'Lowongan')
  if (activePage === 'recruitment-form') return c('Recruitment', 'Form Calon Pegawai (DICAP)')
  if (activePage === 'recruitment-tests') return c('Recruitment', 'Menu Tes')
  if (activePage === 'employees') return c('Data Pegawai', 'Direktori Pegawai')
  if (activePage === 'employee-draft') {
    const nama = draft?.nama || 'Draft baru'
    if (draft?.from === 'directory') return [{ label: 'Data Pegawai' }, { label: 'Direktori Pegawai', to: 'employees' }, { label: nama }]
    return draft?.activated ? c('Data Pegawai', nama) : c('Data Pegawai', 'Draft Pegawai', nama)
  }
  if (activePage === 'final-pay') return c('Payroll', 'Kompensasi & Pesangon')
  if (activePage === 'industrial-relations') return c('Data Pegawai', 'Hubungan Industrial')
  if (activePage === 'employee-transactions') return c('Data Pegawai', 'Transaksi Kepegawaian')
  if (activePage === 'master-data') return c('Data Pegawai', 'Data Master')
  if (activePage === 'dev-competency') return c('People Development', 'Kompetensi')
  if (activePage === 'dev-training') return c('People Development', 'Training')
  if (activePage === 'dev-kpi') return c('People Development', 'KPI')
  if (activePage === 'payroll-components') return c('Payroll', 'Komponen Gaji')
  if (activePage === 'payroll-run') return c('Payroll', 'Proses & Closing')
  if (activePage === 'coop-members') return c('Koperasi', 'Anggota & Simpanan')
  if (activePage === 'coop-withdrawals') return c('Koperasi', 'Pencairan Sukarela')
  if (activePage === 'coop-cash-advance') return c('Koperasi', 'Kasbon')
  if (activePage === 'coop-loans') return c('Koperasi', 'Pinjaman')
  if (activePage === 'coop-payroll-deductions') return c('Koperasi', 'Potongan Payroll')
  if (activePage === 'coop-budget') return c('Koperasi', 'Master Budget')
  if (activePage === 'coop-shu') return c('Koperasi', 'SHU')
  if (activePage === 'coop-trading') return c('Koperasi', 'Unit Dagang')
  if (activePage === 'coop-settings') return c('Koperasi', 'Pengaturan')
  if (activePage === 'salary-change') return c('Payroll', 'Perubahan Gaji')
  if (activePage === 'payslips') return c('Payroll', 'Slip Gaji')
  if (activePage === 'payments') return c('Payroll', 'Daftar Pembayaran')
  if (activePage === 'payroll-recon') return c('Payroll', 'Rekonsiliasi Potongan')
  if (activePage === 'attendance') return c('Kehadiran', 'Absensi Harian & Rekap')
  if (activePage === 'leave') return c('Kehadiran', 'Cuti, Izin, Sakit & Dinas')
  if (activePage === 'shift-swap') return c('Kehadiran', 'Tukar Shift')
  if (activePage === 'overtime') return c('Kehadiran', 'Input & Slip Overtime')
  return ksb ? c('Dashboard', 'Koperasi') : c('Dashboard', DASH_CRUMB[dashTab] ?? 'Umum & Rekrutmen')
}

export function Topbar({
  activePage,
  dashTab,
  draft,
  user,
  account,
  roles,
  onRoleChange,
  onLogout,
  onNavigate,
  attendanceClosed,
  onScenario,
  payrollFinal,
  onFinishPayroll,
}: {
  activePage: PageId
  dashTab?: string
  draft?: Draft
  user: CurrentUser
  account: Account
  /** Peran web milik akun; pemilih peran hanya tampil bila lebih dari satu. */
  roles: Role[]
  onRoleChange: (role: Role) => void
  onLogout: () => void
  onNavigate: (page: PageId) => void
  attendanceClosed: boolean
  onScenario: () => void
  payrollFinal: boolean
  onFinishPayroll: () => void
}) {
  useNotifs()
  const [pwOpen, setPwOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const notes = notifsFor(user.role)
  const unread = notes.filter((n) => !n.read).length
  // Notifikasi peran lain milik akun yang sama tidak hilang saat peran itu sedang tidak aktif.
  const others = roles.filter((r) => r !== user.role).map((r) => [r, unreadOf(r)] as const).filter(([, n]) => n > 0)
  const otherTotal = others.reduce((a, [, n]) => a + n, 0)
  const crumbs = crumbsFor(activePage, draft, user.role === 'ketua' || user.role === 'sekretaris' || user.role === 'bendahara', dashTab)
  return (
    <header className="z-20 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger aria-label="Buka/tutup sidebar" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map(({ label, to }, i) => {
            const last = i === crumbs.length - 1
            return (
              <Fragment key={label + i}>
                <BreadcrumbItem className={last ? undefined : 'hidden sm:block'}>
                  {last ? (
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (to) onNavigate(to)
                      }}
                    >
                      {label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!last && <BreadcrumbSeparator className="hidden sm:block" />}
              </Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu onOpenChange={(o) => { if (!o && unread) markRead(user.role) }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label={unread || otherTotal ? `${unread} notifikasi baru${otherTotal ? `, ${otherTotal} di peran lain` : ''}` : 'Notifikasi'}>
              <Bell className="size-4" />
              {(unread > 0 || otherTotal > 0) && <span aria-hidden className={`absolute right-2 top-2 size-2 rounded-full ring-2 ring-background ${unread > 0 ? 'bg-danger' : 'bg-warning'}`} />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
            {notes.length === 0 && <p className="px-2 py-4 text-center text-sm text-muted-foreground">Tidak ada notifikasi.</p>}
            {others.length > 0 && (
              <>
                {notes.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">Peran lain</DropdownMenuLabel>
                {others.map(([r, n]) => (
                  <DropdownMenuItem key={r} onSelect={() => onRoleChange(r)}>
                    <span className="flex-1">{n} untuk {ROLE_LABEL[r]}</span>
                    <span className="text-xs text-muted-foreground">Ganti peran</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {notes.map((n) => (
              <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5" onSelect={() => onNavigate(n.page)}>
                <span className="text-sm font-medium">{n.title}{!n.read && <span className="sr-only"> (baru)</span>}</span>
                <span className="text-xs text-muted-foreground">{n.body}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{n.at}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-2 flex items-center gap-3 rounded-md p-1 pr-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 hover:bg-accent"
              aria-label="Menu akun"
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">{user.initials}</AvatarFallback>
              </Avatar>
              <span className="hidden flex-col leading-tight md:flex">
                <span className="text-sm font-medium">{user.nama}</span>
                <span className="text-xs text-muted-foreground">{user.jabatan} · PT Primaplast</span>
              </span>
              <ChevronsUpDown className="hidden size-4 text-muted-foreground md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{account.nama}</p>
              <p className="text-xs text-muted-foreground">{account.emailKantor}</p>
            </DropdownMenuLabel>
            {roles.length > 1 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">Peran aktif</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={user.role} onValueChange={(v) => onRoleChange(v as Role)}>
                  {roles.map((r) => {
                    const n = unreadOf(r)
                    return (
                      <DropdownMenuRadioItem key={r} value={r}>
                        <span className="flex-1">{ROLE_LABEL[r]}</span>
                        {n > 0 && <StatusBadge variant="danger">{n}<span className="sr-only"> notifikasi belum dibaca</span></StatusBadge>}
                      </DropdownMenuRadioItem>
                    )
                  })}
                </DropdownMenuRadioGroup>
              </>
            )}
            <DropdownMenuSeparator />
            {DEMO_MODE && (
              <>
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Skenario (demo)</DropdownMenuLabel>
            {attendanceClosed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block">
                    <DropdownMenuItem disabled><CalendarCheck className="size-4" />Tutup kehadiran Oktober 2026</DropdownMenuItem>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left">Sudah closing</TooltipContent>
              </Tooltip>
            ) : (
              <DropdownMenuItem onSelect={onScenario}><CalendarCheck className="size-4" />Tutup kehadiran Oktober 2026</DropdownMenuItem>
            )}
            {payrollFinal ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block">
                    <DropdownMenuItem disabled><Wallet className="size-4" />Selesaikan payroll Oktober 2026</DropdownMenuItem>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left">Payroll Oktober sudah Final</TooltipContent>
              </Tooltip>
            ) : (
              <DropdownMenuItem onSelect={onFinishPayroll}><Wallet className="size-4" />Selesaikan payroll Oktober 2026</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onSelect={() => setPwOpen(true)}><KeyRound className="size-4" />Ganti kata sandi</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLogoutOpen(true)}><LogOut className="size-4" />Keluar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ChangePasswordDialog account={account} open={pwOpen} onClose={() => setPwOpen(false)} />
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari KOMPETEN?</AlertDialogTitle>
            <AlertDialogDescription>Sesi Anda akan diakhiri dan Anda kembali ke halaman Masuk.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={onLogout}>Keluar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}
