/**
 * page-title.ts
 * Memetakan PageId ke judul halaman (Bahasa Indonesia) dan memformat
 * judul dokumen lengkap sesuai pedoman KOMPETEN.
 *
 * Tidak mengimpor dari App.tsx agar tidak menciptakan dependensi siklik.
 */

type PageId =
  | 'dashboard'
  | 'dashboard-produksi'
  | 'dashboard-presensi'
  | 'recruitment'
  | 'recruitment-jobs'
  | 'recruitment-form'
  | 'recruitment-tests'
  | 'employees'
  | 'payroll-components'
  | 'salary-change'
  | 'payroll-run'
  | 'payslips'
  | 'payments'
  | 'payroll-recon'
  | 'coop-members'
  | 'coop-withdrawals'
  | 'coop-cash-advance'
  | 'coop-loans'
  | 'coop-payroll-deductions'
  | 'coop-budget'
  | 'coop-shu'
  | 'coop-settings'
  | 'coop-trading'
  | 'employee-draft'
  | 'employee-transactions'
  | 'industrial-relations'
  | 'final-pay'
  | 'attendance'
  | 'leave'
  | 'shift-swap'
  | 'overtime'
  | 'master-data'

const PAGE_LABELS: Record<PageId, string> = {
  dashboard: 'Dashboard',
  'dashboard-produksi': 'Produksi',
  'dashboard-presensi': 'Presensi',
  recruitment: 'Daftar Kandidat',
  'recruitment-jobs': 'Lowongan',
  'recruitment-form': 'Form Rekrutmen',
  'recruitment-tests': 'Tes & Seleksi',
  employees: 'Direktori Pegawai',
  'payroll-components': 'Komponen Gaji',
  'salary-change': 'Perubahan Gaji',
  'payroll-run': 'Proses & Closing Payroll',
  payslips: 'Slip Gaji',
  payments: 'Daftar Pembayaran',
  'payroll-recon': 'Rekonsiliasi Potongan',
  'coop-members': 'Anggota Koperasi',
  'coop-withdrawals': 'Simpanan & Penarikan',
  'coop-cash-advance': 'Kasbon',
  'coop-loans': 'Pinjaman',
  'coop-payroll-deductions': 'Tagihan Payroll',
  'coop-budget': 'Anggaran & Keuangan',
  'coop-shu': 'SHU',
  'coop-settings': 'Pengaturan Koperasi',
  'coop-trading': 'Unit Dagang',
  'employee-draft': 'Profil Pegawai',
  'employee-transactions': 'Transaksi Kepegawaian',
  'industrial-relations': 'Hubungan Industrial',
  'final-pay': 'Kompensasi & Pesangon',
  attendance: 'Kehadiran',
  leave: 'Cuti & Izin',
  'shift-swap': 'Tukar Shift',
  overtime: 'Overtime',
  'master-data': 'Data Master',
}

/**
 * Mengembalikan judul halaman yang sesuai dengan konteks:
 * - KSB di Dashboard → "Dashboard Koperasi"
 * - employee-draft dengan nama → nama pegawai (atau "Draft Baru" bila belum ada)
 * - Halaman lain → label standar dari PAGE_LABELS
 */
export function pageTitleFor(
  page: PageId,
  draft?: { nama: string; activated: boolean },
  ksb = false,
): string {
  if (page === 'dashboard' && ksb) return 'Dashboard Koperasi'
  if (page === 'employee-draft') {
    if (!draft?.nama) return 'Draft Pegawai Baru'
    return draft.nama
  }
  return PAGE_LABELS[page] ?? 'KOMPETEN'
}

/** Memformat judul dokumen lengkap: "{judul} · KOMPETEN HRIS & Koperasi" */
export const formatDocTitle = (title: string): string =>
  `${title} \u00B7 KOMPETEN HRIS & Koperasi`

