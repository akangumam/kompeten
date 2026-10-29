import type { Role } from '@/data/users'

/** Pengurus koperasi (KSB). Mereka juga anggota; permintaan mereka sendiri tidak pernah disetujui oleh dirinya. */
export type KsbRole = 'ketua' | 'sekretaris' | 'bendahara'
export const KSB: Record<KsbRole, { nik: string; nama: string; peran: string; jabatan: string }> = {
  ketua: { nik: 'PPI-2018-0013', nama: 'Rudi Hartanto', peran: 'Ketua', jabatan: 'Ketua Koperasi' },
  sekretaris: { nik: 'PPI-2024-0076', nama: 'Ratna Dewi', peran: 'Sekretaris', jabatan: 'Sekretaris Koperasi' },
  bendahara: { nik: 'PPI-2017-0012', nama: 'Nina Marlina', peran: 'Bendahara', jabatan: 'Bendahara Koperasi' },
}
export const KSB_ROLES = Object.keys(KSB) as KsbRole[]
export const isKsbRole = (r: Role) => (KSB_ROLES as string[]).includes(r)
export const ksbRoleOf = (nik: string): KsbRole | undefined => KSB_ROLES.find((r) => KSB[r].nik === nik)

/** Bila pengaju memegang peran tahap tersebut, tahap diambil alih pengurus lain. */
const FALLBACK: Record<KsbRole, KsbRole> = { ketua: 'sekretaris', sekretaris: 'ketua', bendahara: 'ketua' }

export type Actor = { role: KsbRole; nama: string; note: string | null }
export function stageActor(stage: KsbRole, applicantNik: string): Actor {
  if (ksbRoleOf(applicantNik) !== stage) return { role: stage, nama: KSB[stage].nama, note: null }
  const role = FALLBACK[stage]
  return { role, nama: KSB[role].nama, note: `Diproses oleh ${KSB[role].nama} karena pengaju adalah ${KSB[stage].peran}` }
}
