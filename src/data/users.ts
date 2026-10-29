export type Role = 'admin' | 'supervisor' | 'manager' | 'payroll' | 'finance' | 'sekretaris' | 'bendahara' | 'ketua'

export type CurrentUser = { role: Role; nama: string; jabatan: string; initials: string; nik?: string }

export const USERS: Record<Role, CurrentUser> = {
  admin: { role: 'admin', nama: 'Admin HRD', jabatan: 'HR Admin', initials: 'AH' },
  manager: { role: 'manager', nama: 'Lestari Wulandari', jabatan: 'HR & GA Manager', initials: 'LW' },
  supervisor: { role: 'supervisor', nama: 'Hendra Gunawan', jabatan: 'Supervisor Produksi', initials: 'HG', nik: 'PPI-2019-0007' },
  payroll: { role: 'payroll', nama: 'Mira Andriani', jabatan: 'Payroll Officer', initials: 'MA', nik: 'PPI-2020-0031' },
  // Yohanes Kristanto: Kepala Finance di roster (PPI-2017-0009).
  // Pengurus koperasi (KSB); NIP mengikuti pegawai yang sama di roster.
  sekretaris: { role: 'sekretaris', nama: 'Ratna Dewi', jabatan: 'Sekretaris Koperasi', initials: 'RD', nik: 'PPI-2024-0076' },
  bendahara: { role: 'bendahara', nama: 'Nina Marlina', jabatan: 'Bendahara Koperasi', initials: 'NM', nik: 'PPI-2017-0012' },
  ketua: { role: 'ketua', nama: 'Rudi Hartanto', jabatan: 'Ketua Koperasi', initials: 'RH', nik: 'PPI-2018-0013' },
  finance: { role: 'finance', nama: 'Yohanes Kristanto', jabatan: 'Finance', initials: 'YK', nik: 'PPI-2017-0009' },
}

type Scoped = { atasanId: string; department: string; section?: string }
export const inScope = (user: CurrentUser, e: Scoped | undefined) =>
  user.role !== 'supervisor' || (!!e && e.atasanId === user.nik)
export const teamNote = (user: CurrentUser, emps: Scoped[]) => {
  const labels = [...new Set(emps.filter((e) => e.atasanId === user.nik).map((e) => (e.section ? `${e.department} · ${e.section}` : e.department)))]
  return `Menampilkan tim Anda: ${labels.join(', ')}`
}
