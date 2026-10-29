/**
 * Aset yang dipegang pegawai: sumber untuk tab Aset di profil dan checklist Clearance saat keluar.
 * Selama tab Aset di profil belum berisi data, Clearance memakai daftar bawaan yang diturunkan dari department dan level.
 */
export const PROFILE_ASSETS: Record<string, string[]> = {}
export const registeredAssets = (nik: string): string[] => PROFILE_ASSETS[nik] ?? []
