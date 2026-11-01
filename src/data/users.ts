export type Role =
  | 'hr_recruitment'
  | 'hr_personalia'
  | 'hr_development'
  | 'manager'
  | 'supervisor'
  | 'payroll'
  | 'finance'
  | 'sekretaris'
  | 'bendahara'
  | 'ketua'
  | 'superadmin'

/** Pengguna aktif sesi web: `role` adalah peran aktif yang dipilih di Topbar. */
export type CurrentUser = { role: Role; nama: string; jabatan: string; initials: string; nik?: string }

export const ROLE_LABEL: Record<Role, string> = {
  hr_recruitment: 'HR Recruitment',
  hr_personalia: 'HR Personalia',
  hr_development: 'HR Development & Industrial',
  manager: 'HR & GA Manager',
  supervisor: 'Atasan',
  payroll: 'Payroll Officer',
  finance: 'Finance',
  sekretaris: 'Sekretaris KSB',
  bendahara: 'Bendahara KSB',
  ketua: 'Ketua KSB',
  superadmin: 'Super Admin IT',
}

/** Peran HR operasional (pengganti "Admin HRD"). */
export const HR_ROLES: Role[] = ['hr_recruitment', 'hr_personalia', 'hr_development']

/**
 * Referensi tetap untuk logika data (pewawancara user, dsb.). Sesi login memakai `src/data/accounts.ts`;
 * tidak ada switcher persona di dalam aplikasi.
 */
export const USERS = {
  manager: { role: 'manager', nama: 'Lestari Wulandari', jabatan: 'HR & GA Manager', initials: 'LW' },
  supervisor: { role: 'supervisor', nama: 'Hendra Gunawan', jabatan: 'Supervisor Produksi', initials: 'HG', nik: 'PPI-2019-0007' },
} satisfies Record<string, CurrentUser>

type Scoped = { atasanId: string; department: string; section?: string }
export const inScope = (user: CurrentUser, e: Scoped | undefined) =>
  user.role !== 'supervisor' || (!!e && e.atasanId === user.nik)
export const teamNote = (user: CurrentUser, emps: Scoped[]) => {
  const labels = [...new Set(emps.filter((e) => e.atasanId === user.nik).map((e) => (e.section ? `${e.department} · ${e.section}` : e.department)))]
  return `Menampilkan tim Anda: ${labels.join(', ')}`
}
