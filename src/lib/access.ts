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
const DIR: R = 'direksi'
const KSB: R[] = ['sekretaris', 'bendahara', 'ketua']

/** Urutan peran (kolom matriks): peran aktif default = peran pertama akun menurut urutan ini. */
export const ROLE_ORDER: R[] = ['hr_recruitment', 'hr_personalia', 'hr_development', 'manager', 'direksi', 'supervisor', 'payroll', 'finance', 'sekretaris', 'bendahara', 'ketua', 'superadmin']

export const PAGE_ROLES: Record<PageId | 'system-settings', R[]> = {
  dashboard: [REC, PERS, DEV, 'manager', DIR, 'supervisor', 'payroll', 'finance', ...KSB],
  recruitment: [REC, 'manager', DIR, 'supervisor'],
  'recruitment-jobs': [REC, 'manager'],
  'recruitment-form': [REC],
  'recruitment-tests': [REC, DEV, 'manager'],
  employees: [REC, PERS, DEV, 'manager', DIR, 'supervisor', 'payroll'],
  'employee-draft': [REC, PERS, DEV, 'manager', DIR, 'supervisor', 'payroll'],
  'employee-transactions': [PERS, DEV, 'manager', DIR, 'supervisor', 'payroll'],
  'industrial-relations': [PERS, DEV, 'manager', DIR, 'supervisor', 'payroll'],
  attendance: [PERS, 'manager', DIR, 'supervisor', 'payroll'],
  leave: [PERS, 'manager', DIR, 'supervisor', 'payroll'],
  'shift-swap': [PERS, 'manager', DIR, 'supervisor', 'payroll'],
  overtime: [PERS, 'manager', DIR, 'supervisor', 'payroll'],
  'dev-competency': [DEV, 'manager', DIR, 'supervisor'],
  'dev-training': [DEV, 'manager', DIR, 'supervisor'],
  'dev-kpi': [DEV, 'manager', DIR, 'supervisor'],
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

/** Peran yang tidak boleh melihat Rupiah per pegawai (Atasan dan Direksi). */
export const hidesPay = (user: Pick<CurrentUser, 'role'>) => user.role === 'supervisor' || user.role === 'direksi'

export const NO_ACCESS_TITLE = 'Anda tidak memiliki akses ke halaman ini'

/** Matriks akses menu (docs/peran-dan-akses.md §3 v2.2). Kolom: HR Rekrut., HR Personalia, HR Dev & Ind., HR & GA Mgr, Direksi, Atasan, Payroll, Finance, KSB, Super Admin. [kode, catatan] */
export const MATRIX_COLS = ['HR Rekrut.', 'HR Personalia', 'HR Dev & Ind.', 'HR & GA Mgr', 'Direksi', 'Atasan', 'Payroll', 'Finance', 'KSB', 'Super Admin'] as const
export const MATRIX: { menu: string; cells: [string, string][] }[] = [
  { menu: "Dashboard Umum & Rekrutmen", cells: [["P", ""], ["P", ""], ["B", ""], ["P", ""], ["B", ""], ["T", ""], ["B", ""], ["B", ""], ["—", ""], ["—", ""]] },
  { menu: "Dashboard Produksi", cells: [["B", ""], ["P", ""], ["B", ""], ["P", ""], ["B", ""], ["T", "section sendiri"], ["—", ""], ["—", ""], ["—", ""], ["—", ""]] },
  { menu: "Dashboard Presensi (kategori sakit hanya agregat)", cells: [["—", ""], ["P", ""], ["—", ""], ["P", ""], ["B", "agregat"], ["T", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""]] },
  { menu: "Dashboard Koperasi", cells: [["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["P", ""], ["—", ""]] },
  { menu: "Recruitment: lowongan, kandidat, DICAP, penawaran", cells: [["P", ""], ["—", ""], ["—", ""], ["S", "lowongan, penawaran"], ["B", "tanpa catatan internal & nilai interview per orang"], ["T", "interview dept sendiri, tanpa gaji"], ["—", ""], ["—", ""], ["—", ""], ["—", ""]] },
  { menu: "Recruitment: Menu Tes (bank soal)", cells: [["P", ""], ["—", ""], ["P", "paket sumber Training"], ["B", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""]] },
  { menu: "Direktori Pegawai", cells: [["B", "tanpa KTP/bank/pajak"], ["P", ""], ["B", "tanpa KTP/bank/pajak"], ["B", ""], ["B", "tanpa KTP/bank/pajak"], ["T", "baca, tanpa KTP/bank/pajak"], ["B", "termasuk KTP/bank/pajak/BPJS untuk penggajian; tanpa catatan disiplin & exit interview"], ["—", ""], ["—", ""], ["—", ""]] },
  { menu: "Draft Pegawai", cells: [["B", "hasil generate"], ["P", "verifikasi & aktifkan"], ["—", ""], ["B", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""]] },
  { menu: "Transaksi Kepegawaian", cells: [["—", ""], ["P", ""], ["B", ""], ["S", "akhir"], ["B", ""], ["S", "langkah 1, tim"], ["B", "yang disetujui"], ["—", ""], ["—", ""], ["—", ""]] },
  { menu: "Hubungan Industrial", cells: [["—", ""], ["B", "Pegawai Keluar"], ["P", ""], ["S", ""], ["B", "tanpa exit interview"], ["T", "draf SP tim; tanpa exit interview"], ["B", "Pegawai Keluar"], ["—", ""], ["*", "konfirmasi clearance koperasi"], ["—", ""]] },
  { menu: "Kehadiran (absensi, cuti, tukar shift, lembur) + kategori sakit", cells: [["—", ""], ["P", ""], ["—", ""], ["S", "eskalasi"], ["B", "rekap, tanpa kategori sakit"], ["S", "tim, tanpa kategori sakit"], ["B", "rekap"], ["—", ""], ["—", ""], ["—", ""]] },
  { menu: "People Development (kompetensi, training, KPI)", cells: [["—", ""], ["—", ""], ["P", "verifikasi, template"], ["S", "mewakili / B"], ["B", ""], ["T", "menilai, input KPI, usul peserta"], ["—", ""], ["—", ""], ["—", ""], ["—", ""]] },
  { menu: "Payroll: proses, komponen, slip, perubahan gaji", cells: [["—", ""], ["—", ""], ["—", ""], ["S", "baca + approval"], ["—", ""], ["—", ""], ["P", ""], ["—", ""], ["—", ""], ["—", ""]] },
  { menu: "Payroll: Daftar Pembayaran & Rekonsiliasi", cells: [["—", ""], ["—", ""], ["—", ""], ["B", ""], ["—", ""], ["—", ""], ["P", ""], ["P", "pembayaran"], ["—", ""], ["—", ""]] },
  { menu: "Kompensasi & Pesangon", cells: [["—", ""], ["—", ""], ["B", ""], ["S", ""], ["—", ""], ["—", ""], ["P", ""], ["P", "pembayaran"], ["—", ""], ["—", ""]] },
  { menu: "Koperasi (semua halaman)", cells: [["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["P", "sesuai jabatan"], ["—", ""]] },
  { menu: "Data Master: organisasi, posisi, grade, shift, cuti, libur, Matriks Penyetuju, standar tenaga kerja, tier", cells: [["—", ""], ["P", ""], ["B", ""], ["B", ""], ["—", ""], ["—", ""], ["B", "grade, komponen"], ["—", ""], ["—", ""], ["—", ""]] },
  { menu: "Data Master: rekrutmen (sumber lowongan, ambang interview, masa simpan data pelamar, nilai tes ke pelamar)", cells: [["P", ""], ["B", ""], ["—", ""], ["B", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""]] },
  { menu: "Data Master: kompetensi, standar posisi, template & predikat KPI, parameter HI (SP, pelanggaran, alasan keluar, uang pisah, pengali)", cells: [["—", ""], ["B", ""], ["P", ""], ["B", ""], ["—", ""], ["—", ""], ["B", "pengali & uang pisah"], ["—", ""], ["—", ""], ["—", ""]] },
  { menu: "Pengaturan Koperasi", cells: [["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["P", "Ketua"], ["—", ""]] },
  { menu: "Pengaturan Sistem: pengguna, peran, kebijakan keamanan", cells: [["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["P", ""]] },
  { menu: "Pengaturan Sistem: audit log", cells: [["—", ""], ["—", ""], ["—", ""], ["B", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["—", ""], ["P", ""]] },
]
