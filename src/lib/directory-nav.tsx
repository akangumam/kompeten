import { createContext, useContext } from 'react'
import type { DirPreset, DirRef } from '@/data/directory'

export type DirectoryNav = {
  /** Buka Direktori Pegawai dengan filter bawaan (semua filter lain di-reset). */
  openDirectory: (preset?: DirPreset) => void
  /** Buka halaman profil pegawai/draft dari Direktori. */
  openEmployee: (ref: DirRef) => void
  /** Buka Hubungan Industrial › Pegawai Keluar dengan form Proses Keluar terisi (mis. Proses Berakhir untuk Habis Kontrak). */
  openOffboarding: (nik: string, reason?: string) => void
  /** Buka Hubungan Industrial › Disiplin dengan form Buat terisi (mis. Surat Panggilan dari Absensi). */
  openDiscipline: (nik: string, jenis?: string) => void
  /** Buka Payroll › Kompensasi & Pesangon (opsional: langsung ke Detail satu catatan). */
  openFinalPay: (no?: string) => void
}

export const DirectoryNavContext = createContext<DirectoryNav>({ openDirectory: () => {}, openEmployee: () => {}, openOffboarding: () => {}, openDiscipline: () => {}, openFinalPay: () => {} })
export const useDirectoryNav = () => useContext(DirectoryNavContext)
