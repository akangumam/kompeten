export type HolidayType = 'Libur Nasional' | 'Cuti Bersama' | 'Libur Perusahaan'
export type Holiday = { tanggal: string; ket: string; jenis: HolidayType; diberlakukan: boolean }

const L = (tanggal: string, ket: string): Holiday => ({ tanggal, ket, jenis: 'Libur Nasional', diberlakukan: true })
const C = (tanggal: string, ket: string, on = false): Holiday => ({ tanggal, ket, jenis: 'Cuti Bersama', diberlakukan: on })

export const HOLIDAYS: Holiday[] = [
  L('2026-01-01', 'Tahun Baru 2026 Masehi'),
  L('2026-01-16', 'Isra Mikraj'),
  C('2026-02-16', 'Cuti Bersama Tahun Baru Imlek'),
  L('2026-02-17', 'Tahun Baru Imlek 2577'),
  C('2026-03-18', 'Cuti Bersama Hari Suci Nyepi'),
  L('2026-03-19', 'Hari Suci Nyepi'),
  C('2026-03-20', 'Cuti Bersama Idulfitri 1447 H'),
  L('2026-03-21', 'Idulfitri 1447 H'),
  L('2026-03-22', 'Idulfitri 1447 H'),
  C('2026-03-23', 'Cuti Bersama Idulfitri 1447 H', true),
  C('2026-03-24', 'Cuti Bersama Idulfitri 1447 H', true),
  L('2026-04-03', 'Wafat Yesus Kristus'),
  L('2026-04-05', 'Paskah'),
  L('2026-05-01', 'Hari Buruh Internasional'),
  L('2026-05-14', 'Kenaikan Yesus Kristus'),
  C('2026-05-15', 'Cuti Bersama Kenaikan Yesus Kristus'),
  L('2026-05-27', 'Iduladha 1447 H'),
  C('2026-05-28', 'Cuti Bersama Iduladha 1447 H'),
  L('2026-05-31', 'Waisak 2570 BE'),
  L('2026-06-01', 'Hari Lahir Pancasila'),
  L('2026-06-16', '1 Muharam 1448 H'),
  L('2026-08-17', 'Proklamasi Kemerdekaan'),
  L('2026-08-25', 'Maulid Nabi Muhammad SAW'),
  C('2026-12-24', 'Cuti Bersama Kelahiran Yesus Kristus', true),
  L('2026-12-25', 'Kelahiran Yesus Kristus'),
]

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
export const dayNameOf = (iso: string) => DAYS[new Date(iso + 'T00:00:00Z').getUTCDay()]

export const holidayOn = (iso: string) => HOLIDAYS.find((h) => h.tanggal === iso && h.diberlakukan)
export const isHoliday = (iso: string) => !!holidayOn(iso)
export const cutiBersamaIn = (start: string, end: string) =>
  HOLIDAYS.filter((h) => h.jenis === 'Cuti Bersama' && h.diberlakukan && h.tanggal >= start && h.tanggal <= end).length
