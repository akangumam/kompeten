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
  { title: 'Dashboard', icon: LayoutDashboard, items: ['Umum & Rekrutmen', 'Produksi', 'Presensi'] },
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
    items: ['Matrix Kompetensi', 'Offline Training', 'Evaluasi KPI'],
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
  'Dashboard/Umum & Rekrutmen': 'dashboard',
  'Dashboard/Produksi': 'dashboard-produksi',
  'Dashboard/Presensi': 'dashboard-presensi',
  'Recruitment/Daftar Kandidat': 'recruitment',
  'Recruitment/Lowongan': 'recruitment-jobs',
  'Recruitment/Form DICAP': 'recruitment-form',
  'Recruitment/Menu Tes': 'recruitment-tests',
  'Data Pegawai/Direktori & Draft': 'employees',
  'Data Pegawai/Transaksi Kepegawaian': 'employee-transactions',
  'Data Pegawai/Hubungan Industrial': 'industrial-relations',
  'Data Pegawai/Data Master': 'master-data',
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

type NavProps = { activePage: PageId; onNavigate: (page: PageId) => void; role: Role }
type GroupProps = Pick<NavProps, 'activePage' | 'onNavigate'> & {
  entry: NavItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Halaman profil pegawai adalah anak dari Direktori, jadi grup Data Pegawai tetap terbuka dan item Direktori tetap menyala.
const groupOf = (page: PageId) =>
  NAV.find((n) => n.items.some((l) => PAGES[`${n.title}/${l}`] === (page === 'employee-draft' ? 'employees' : page)))?.title ?? null

function NavGroup({ entry, activePage, onNavigate, open, onOpenChange, hidden }: GroupProps & { hidden: string[] }) {
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
            {entry.items.filter((l) => !hidden.includes(`${entry.title}/${l}`)).map((label) => {
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

/**
 * Menu per peran. Payroll: Payroll Officer dan HR & GA Manager; Finance hanya Daftar Pembayaran, Rekonsiliasi Potongan, dan Kompensasi & Pesangon; Admin HRD hanya Kompensasi & Pesangon (baca saja). Atasan tidak melihat Data Master.
 * Payroll Officer hanya melihat Dashboard, Direktori, Kehadiran (baca saja), dan Payroll. Koperasi hanya untuk pengurus KSB.
 */
function hiddenFor(role: Role): { groups: string[]; items: string[]; showSystemSettings: boolean } {
  switch (role) {
    case 'admin':
      // Admin HRD hanya membaca Kompensasi & Pesangon di menu Payroll.
      return { groups: ['Koperasi'], items: ['Payroll/Proses & Closing', 'Payroll/Komponen & Potongan', 'Payroll/Perubahan Gaji', 'Payroll/Slip Gaji', 'Payroll/Daftar Pembayaran', 'Payroll/Rekonsiliasi Potongan'], showSystemSettings: true }
    case 'supervisor':
      return { groups: ['Payroll', 'Koperasi'], items: ['Data Pegawai/Data Master', 'Dashboard/Produksi', 'Recruitment/Lowongan', 'Recruitment/Form DICAP', 'Recruitment/Menu Tes'], showSystemSettings: false }
    case 'payroll':
      return {
        groups: ['Recruitment', 'People Development', 'Koperasi'],
        items: ['Dashboard/Produksi', 'Dashboard/Presensi', 'Data Pegawai/Data Master', 'Payroll/Rekonsiliasi Potongan'],
        showSystemSettings: false,
      }
    case 'sekretaris':
    case 'bendahara':
    case 'ketua':
      // Pengurus koperasi (KSB) hanya melihat Dashboard Koperasi dan menu Koperasi; saldo Koperasi tidak pernah tampil untuk persona HR dan Payroll.
      return { groups: ['Dashboard', 'Recruitment', 'Data Pegawai', 'Kehadiran', 'People Development', 'Payroll'], items: [], showSystemSettings: false }
    case 'finance':
      // Finance melihat Daftar Pembayaran, Rekonsiliasi Potongan, dan Kompensasi & Pesangon (transfer terpisah); tanpa data pegawai, kehadiran, atau gaji.
      return {
        groups: ['Recruitment', 'Data Pegawai', 'Kehadiran', 'People Development', 'Koperasi'],
        items: ['Dashboard/Produksi', 'Dashboard/Presensi', 'Payroll/Proses & Closing', 'Payroll/Komponen & Potongan', 'Payroll/Perubahan Gaji', 'Payroll/Slip Gaji'],
        showSystemSettings: false,
      }
    default:
      // HR & GA Manager: seluruh halaman Payroll; Rekonsiliasi Potongan ada sebagai tab di Komponen & Potongan.
      return { groups: ['Koperasi'], items: ['Payroll/Rekonsiliasi Potongan', 'Recruitment/Form DICAP'], showSystemSettings: true }
  }
}

export function AppSidebar({ activePage, onNavigate, role }: NavProps) {
  const hide = hiddenFor(role)
  const hideSystemSettings = !hide.showSystemSettings
  const isKsb = role === 'ketua' || role === 'sekretaris' || role === 'bendahara'
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
            {isKsb && (
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Dashboard" isActive={activePage === 'dashboard'} onClick={() => onNavigate('dashboard')}>
                  <LayoutDashboard className="size-4" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {NAV.filter((entry) => !hide.groups.includes(entry.title)).map((entry) => (
              <NavGroup
                key={entry.title}
                entry={entry}
                activePage={activePage}
                onNavigate={onNavigate}
                hidden={hide.items}
                open={openGroup === entry.title}
                onOpenChange={(o) => setOpenGroup(o ? entry.title : null)}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {!hideSystemSettings && (
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Pengaturan Sistem">
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
