import {
  CalendarCheck,
  ChevronRight,
  CircleHelp,
  GraduationCap,
  LayoutDashboard,
  PiggyBank,
  Settings,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PageId } from '@/App'
import { Logo } from '@/components/brand/logo'
import type { Role } from '@/data/users'
import { canOpen } from '@/lib/access'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'

type NavItem = { title: string; icon: LucideIcon; items: string[] }

const NAV: NavItem[] = [
  { title: 'Recruitment', icon: UserPlus, items: ['Daftar Kandidat', 'Lowongan', 'Form DICAP', 'Menu Tes'] },
  {
    title: 'Data Pegawai',
    icon: Users,
    items: ['Direktori & Draft', 'Transaksi Kepegawaian', 'Hubungan Industrial', 'Data Master'],
  },
  {
    title: 'Kehadiran',
    icon: CalendarCheck,
    items: ['Absensi & Rekap', 'Cuti/Izin/Sakit/Dinas', 'Tukar Shift', 'Overtime'],
  },
  {
    title: 'People Development',
    icon: GraduationCap,
    items: ['Kompetensi', 'Training', 'KPI'],
  },
  {
    title: 'Payroll',
    icon: Wallet,
    items: ['Proses & Closing', 'Komponen & Potongan', 'Perubahan Gaji', 'Slip Gaji', 'Daftar Pembayaran', 'Rekonsiliasi Potongan', 'Kompensasi & Pesangon'],
  },
  {
    title: 'Koperasi',
    icon: PiggyBank,
    items: ['Anggota & Simpanan', 'Pencairan Sukarela', 'Kasbon', 'Pinjaman', 'Potongan Payroll', 'Master Budget', 'Unit Dagang', 'SHU', 'Pengaturan'],
  },
]

const PAGES: Record<string, PageId> = {
  'Recruitment/Daftar Kandidat': 'recruitment',
  'Recruitment/Lowongan': 'recruitment-jobs',
  'Recruitment/Form DICAP': 'recruitment-form',
  'Recruitment/Menu Tes': 'recruitment-tests',
  'Data Pegawai/Direktori & Draft': 'employees',
  'Data Pegawai/Transaksi Kepegawaian': 'employee-transactions',
  'Data Pegawai/Hubungan Industrial': 'industrial-relations',
  'Data Pegawai/Data Master': 'master-data',
  'People Development/Kompetensi': 'dev-competency',
  'People Development/Training': 'dev-training',
  'People Development/KPI': 'dev-kpi',
  'Payroll/Proses & Closing': 'payroll-run',
  'Payroll/Komponen & Potongan': 'payroll-components',
  'Payroll/Perubahan Gaji': 'salary-change',
  'Payroll/Slip Gaji': 'payslips',
  'Payroll/Daftar Pembayaran': 'payments',
  'Payroll/Rekonsiliasi Potongan': 'payroll-recon',
  'Payroll/Kompensasi & Pesangon': 'final-pay',
  'Koperasi/Anggota & Simpanan': 'coop-members',
  'Koperasi/Pencairan Sukarela': 'coop-withdrawals',
  'Koperasi/Kasbon': 'coop-cash-advance',
  'Koperasi/Pinjaman': 'coop-loans',
  'Koperasi/Potongan Payroll': 'coop-payroll-deductions',
  'Koperasi/Master Budget': 'coop-budget',
  'Koperasi/SHU': 'coop-shu',
  'Koperasi/Unit Dagang': 'coop-trading',
  'Koperasi/Pengaturan': 'coop-settings',
  'Kehadiran/Absensi & Rekap': 'attendance',
  'Kehadiran/Cuti/Izin/Sakit/Dinas': 'leave',
  'Kehadiran/Tukar Shift': 'shift-swap',
  'Kehadiran/Overtime': 'overtime',
}

/** Menu per peran aktif: hanya halaman yang diizinkan matriks akses (src/lib/access.ts). */
const visibleItems = (entry: NavItem, role: Role) => entry.items.filter((l) => canOpen(role, PAGES[`${entry.title}/${l}`]))

type NavProps = { activePage: PageId; onNavigate: (page: PageId) => void; role: Role }
type GroupProps = Pick<NavProps, 'activePage' | 'onNavigate'> & {
  entry: NavItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Halaman profil pegawai adalah anak dari Direktori, jadi grup Data Pegawai tetap terbuka dan item Direktori tetap menyala.
const groupOf = (page: PageId) =>
  NAV.find((n) => n.items.some((l) => PAGES[`${n.title}/${l}`] === (page === 'employee-draft' ? 'employees' : page)))?.title ?? null

function NavGroup({ entry, activePage, onNavigate, open, onOpenChange, role }: GroupProps & { role: Role }) {
  const { state, setOpen } = useSidebar()
  const Icon = entry.icon
  const containsActive = groupOf(activePage) === entry.title
  return (
    <Collapsible asChild open={open} onOpenChange={onOpenChange} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={entry.title}
            isActive={containsActive && !open}
            onClick={() => state === 'collapsed' && setOpen(true)}
          >
            <Icon className="size-4" />
            <span>{entry.title}</span>
            <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {visibleItems(entry, role).map((label) => {
              const page = PAGES[`${entry.title}/${label}`]
              const active = page === activePage || (page === 'employees' && activePage === 'employee-draft')
              return (
                <SidebarMenuSubItem key={label}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={active}
                    className={active ? 'bg-sidebar-accent font-medium' : undefined}
                  >
                    <a
                      href="#"
                      aria-current={active ? 'page' : undefined}
                      onClick={(e) => {
                        e.preventDefault()
                        if (page) onNavigate(page)
                      }}
                    >
                      <span>{label}</span>
                    </a>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function AppSidebar({ activePage, onNavigate, role }: NavProps) {
  const showSystemSettings = canOpen(role, 'system-settings')
  const [openGroup, setOpenGroup] = useState<string | null>(() => groupOf(activePage))
  useEffect(() => setOpenGroup(groupOf(activePage)), [activePage])
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex flex-col gap-1 p-1 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-0">
          <Logo className="group-data-[collapsible=icon]:hidden" />
          <Logo markOnly className="hidden group-data-[collapsible=icon]:inline-flex" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {/* Dashboard: satu item tanpa submenu dan tanpa chevron; tab (Umum/Produksi/Presensi) ada di halamannya. */}
            {canOpen(role, 'dashboard') && (
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Dashboard" isActive={activePage === 'dashboard'} onClick={() => onNavigate('dashboard')}>
                  <LayoutDashboard className="size-4" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {NAV.filter((entry) => visibleItems(entry, role).length > 0).map((entry) => (
              <NavGroup
                key={entry.title}
                entry={entry}
                activePage={activePage}
                onNavigate={onNavigate}
                role={role}
                open={openGroup === entry.title}
                onOpenChange={(o) => setOpenGroup(o ? entry.title : null)}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {showSystemSettings && (
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Pengaturan Sistem" isActive={activePage === 'system-settings'} onClick={() => onNavigate('system-settings')}>
                <Settings className="size-4" />
                <span>Pengaturan Sistem</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Bantuan">
              <CircleHelp className="size-4" />
              <span>Bantuan</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
