export type KhususDef = { id: string; label: string; hari: number }

export const LEAVE_RULES = {
  tahunan: { hak: 12, syaratBulan: 12, berlaku: ['Tetap', 'Kontrak'] as string[] },
  khusus: [
    { id: 'menikah', label: 'Menikah', hari: 3 },
    { id: 'menikahkan', label: 'Menikahkan anak', hari: 2 },
    { id: 'khitan', label: 'Khitan / baptis anak', hari: 2 },
    { id: 'melahirkan', label: 'Istri melahirkan / keguguran', hari: 2 },
    { id: 'inti', label: 'Keluarga inti meninggal', hari: 2 },
    { id: 'serumah', label: 'Anggota serumah meninggal', hari: 1 },
  ] as KhususDef[],
  sakit: { suratDokter: 'Selalu wajib' },
  approval: 'Atasan langsung · diteruskan ke atasan berikutnya bila pengaju adalah atasan',
}
