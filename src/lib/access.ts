import type { PageId } from '@/App'
import type { CurrentUser, Role } from '@/data/users'

/**
 * Matriks akses web: satu-satunya sumber untuk sidebar, pembatasan halaman, dan izin aksi.
 * Mengikuti docs/peran-dan-akses.md §3. Jangan menulis daftar peran di halaman; panggil `can()` atau `canOpen()`.
 */
type R = Role
const REC: R = 'hr_recruitment'
const PERS: R = 'hr_personalia'
const DEV: R = 'hr_development'
const KSB: R[] = ['sekretaris', 'bendahara', 'ketua']

/** Urutan peran (kolom matriks): peran aktif default = peran pertama akun menurut urutan ini. */
export const ROLE_ORDER: R[] = ['hr_recruitment', 'hr_personalia', 'hr_development', 'manager', 'supervisor', 'payroll', 'finance', 'sekretaris', 'bendahara', 'ketua', 'superadmin']

export const PAGE_ROLES: Record<PageId | 'system-settings', R[]> = {
  dashboard: [REC, PERS, DEV, 'manager', 'supervisor', 'payroll', 'finance', ...KSB],
  recruitment: [REC, 'manager', 'supervisor'],
  'recruitment-jobs': [REC, 'manager'],
  'recruitment-form': [REC],
  'recruitment-tests': [REC, DEV, 'manager'],
  employees: [REC, PERS, DEV, 'manager', 'supervisor', 'payroll'],
  'employee-draft': [REC, PERS, DEV, 'manager', 'supervisor', 'payroll'],
  'employee-transactions': [PERS, DEV, 'manager', 'supervisor', 'payroll'],
  'industrial-relations': [PERS, DEV, 'manager', 'supervisor', 'payroll'],
  attendance: [PERS, 'manager', 'supervisor', 'payroll'],
  leave: [PERS, 'manager', 'supervisor', 'payroll'],
  'shift-swap': [PERS, 'manager', 'supervisor', 'payroll'],
  overtime: [PERS, 'manager', 'supervisor', 'payroll'],
  'dev-competency': [DEV, 'manager', 'supervisor'],
  'dev-training': [DEV, 'manager', 'supervisor'],
  'dev-kpi': [DEV, 'manager', 'supervisor'],
  'payroll-run': ['payroll', 'manager'],
  payslips: ['payroll', 'manager'],
  'salary-change': ['payroll', 'manager'],
  'payroll-components': ['payroll', 'manager'],
  payments: ['payroll', 'manager', 'finance'],
  'payroll-recon': ['finance'],
  'final-pay': [DEV, 'manager', 'payroll', 'finance'],
  'master-data': [REC, PERS, DEV, 'manager', 'payroll'],
  'coop-members': KSB,
  'coop-withdrawals': KSB,
  'coop-cash-advance': KSB,
  'coop-loans': KSB,
  'coop-payroll-deductions': KSB,
  'coop-budget': KSB,
  'coop-shu': KSB,
  'coop-settings': KSB,
  'coop-trading': KSB,
  'system-settings': ['superadmin', 'manager'],
}

export const canOpen = (role: Role, page: PageId | 'system-settings') => PAGE_ROLES[page]?.includes(role) ?? false

/** Izin aksi (di luar akses halaman). Nilai = peran yang memilikinya. */
const PERMS = {
  // Recruitment
  'recruitment.manage': [REC], // lowongan, kandidat, DICAP, penawaran, tes
  'recruitment.score-hr': [REC], // nilai HR interview, catatan internal
  'recruitment.notes': [REC, 'manager'], // catatan internal HRD
  'tests.manage': [REC],
  'tests.package': [REC, DEV], // paket tes sumber Training
  // Pegawai
  'employee.add': [PERS], // draft langsung, aktivasi
  'employee.edit': [PERS],
  'employee.sensitive': [PERS, 'manager', 'payroll'], // KTP, bank, pajak
  'draft.view': [REC, PERS, 'manager'],
  'trx.manage': [PERS],
  'trx.view-all': [PERS, DEV, 'manager'],
  // Hubungan Industrial
  'ir.manage': [DEV], // SP, disiplin, offboarding
  'ir.interview': [DEV, 'manager'], // exit interview + rehire
  'ir.clearance': [DEV, 'manager'],
  'ir.discipline-view': [DEV, 'manager', 'supervisor'],
  'ir.off-view': [PERS, DEV, 'manager', 'payroll'],
  // Kehadiran
  'attendance.manage': [PERS], // verifikasi, koreksi, alfa, tukar shift, lembur
  'attendance.sick-category': [PERS, 'manager'],
  // People Development
  'dev.manage': [DEV],
  // Final pay (baca)
  'finalpay.readonly': [DEV],
  // Data Master (pengganti: lihat masterAccess)
} as const satisfies Record<string, readonly R[]>

export type Perm = keyof typeof PERMS
export const can = (user: Pick<CurrentUser, 'role'>, perm: Perm) => (PERMS[perm] as readonly R[]).includes(user.role)

/** Data Master: tab → kelompok. P/B per peran dari matriks §3. */
export type MasterTab = 'org' | 'pos' | 'grade' | 'shift' | 'holiday' | 'leave' | 'approver' | 'industrial' | 'recruit' | 'dashboard' | 'competency'
const ORG_GROUP: MasterTab[] = ['org', 'pos', 'grade', 'shift', 'holiday', 'leave', 'approver', 'dashboard']
const DEV_GROUP: MasterTab[] = ['industrial', 'competency']
/** Akses tab Data Master: 'edit' (P), 'read' (B), atau undefined (tersembunyi). */
export function masterAccess(role: Role, tab: MasterTab): 'edit' | 'read' | undefined {
  if (role === REC) return tab === 'recruit' ? 'edit' : undefined
  if (role === PERS) return ORG_GROUP.includes(tab) ? 'edit' : 'read'  // termasuk 'recruit' (B)
  if (role === DEV) return tab === 'recruit' ? undefined : DEV_GROUP.includes(tab) ? 'edit' : 'read'
  if (role === 'manager') return 'read'
  if (role === 'payroll') return tab === 'grade' || tab === 'industrial' ? 'read' : undefined
  return undefined
}

export const NO_ACCESS_TITLE = 'Anda tidak memiliki akses ke halaman ini'
