import { ROSTER } from '@/data/employees'
import { addPayAudit } from '@/data/payroll/audit'
import type { BpjsParts } from '@/data/payroll/calc'
import { datedAt, datedPush, type Dated } from '@/data/payroll/dated'
import { bump } from '@/data/payroll/store'
import { rosterRecord } from '@/data/profiles'

/**
 * Kepesertaan BPJS per pegawai (effective-dated). Iuran hanya dihitung untuk program berstatus Aktif pada periode.
 * Pencatatan di sini tidak otomatis dilaporkan ke BPJS.
 */
export type Kepesertaan = 'Aktif' | 'Dalam pendaftaran' | 'Nonaktif'
export const KEPESERTAAN: Kepesertaan[] = ['Aktif', 'Dalam pendaftaran', 'Nonaktif']
export type TkProgram = 'JHT' | 'JP' | 'JKK' | 'JKM'
export const TK_PROGRAMS: TkProgram[] = ['JHT', 'JP', 'JKK', 'JKM']

export type Membership = {
  kesNomor: string
  kesStatus: Kepesertaan
  tkNomor: string
  tkStatus: Kepesertaan
  programs: TkProgram[]
}

type Hire = { nik: string; nama: string; tanggalMasuk: string }
/** Pegawai yang diaktifkan setelah data awal (mis. dari Draft Pegawai); mulai dari "Dalam pendaftaran". */
export const HIRES: Hire[] = []

const EDITS: Record<string, Dated<Membership>[]> = {}
const baseCache = new Map<string, Membership>()

function baseOf(nik: string): Membership {
  let b = baseCache.get(nik)
  if (!b) {
    const form = rosterRecord(nik)?.form
    const hire = HIRES.find((h) => h.nik === nik)
    b = hire
      ? { kesNomor: '', kesStatus: 'Dalam pendaftaran', tkNomor: '', tkStatus: 'Dalam pendaftaran', programs: [...TK_PROGRAMS] }
      : { kesNomor: form?.bpjsKes ?? '', kesStatus: 'Aktif', tkNomor: form?.bpjsTk ?? '', tkStatus: 'Aktif', programs: [...TK_PROGRAMS] }
    baseCache.set(nik, b)
  }
  return b
}

const masukOf = (nik: string) => ROSTER.find((e) => e.nik === nik)?.tanggalMasuk ?? HIRES.find((h) => h.nik === nik)?.tanggalMasuk ?? '2000-01-01'

export const historyOf = (nik: string): Dated<Membership>[] => [{ berlakuMulai: masukOf(nik), value: baseOf(nik), oleh: 'Data awal', alasan: 'Data awal pegawai' }, ...(EDITS[nik] ?? [])]
export const entryAt = (nik: string, date: string) => datedAt(historyOf(nik), date)
export const membershipAt = (nik: string, date: string): Membership => entryAt(nik, date).value

/** Daftar pegawai yang tampil di tab: pegawai aktif roster ditambah pegawai yang baru diaktifkan. */
export const membershipPeople = () => [
  ...ROSTER.map((e) => ({ nik: e.nik, nama: e.nama, department: e.department, tanggalMasuk: e.tanggalMasuk })),
  ...HIRES.map((h) => ({ nik: h.nik, nama: h.nama, department: '—', tanggalMasuk: h.tanggalMasuk })),
]

export function saveMembership(nik: string, nama: string, value: Membership, berlakuMulai: string, alasan: string, oleh: string) {
  const prev = membershipAt(nik, berlakuMulai)
  datedPush((EDITS[nik] ??= []), { berlakuMulai, value, oleh, alasan })
  const parts: string[] = []
  if (prev.kesStatus !== value.kesStatus || prev.kesNomor !== value.kesNomor) parts.push(`BPJS Kesehatan ${prev.kesStatus} → ${value.kesStatus}`)
  if (prev.tkStatus !== value.tkStatus || prev.tkNomor !== value.tkNomor || prev.programs.join() !== value.programs.join())
    parts.push(`BPJS Ketenagakerjaan ${prev.tkStatus} → ${value.tkStatus} (${value.programs.join(' · ') || 'tanpa program'})`)
  addPayAudit({ by: oleh, group: 'BPJS & PPh 21', entitas: `Kepesertaan BPJS ${nama} (${nik})`, perubahan: parts.join(' · ') || 'Perubahan nomor kepesertaan', berlaku: berlakuMulai, alasan })
  bump()
}

/** Pegawai baru yang diaktifkan mulai dari "Dalam pendaftaran"; muncul di peringatan Prasyarat sampai Aktif. */
export function enrollNewHire(nik: string, nama: string, tanggalMasuk: string) {
  if (ROSTER.some((e) => e.nik === nik) || HIRES.some((h) => h.nik === nik)) return
  HIRES.push({ nik, nama, tanggalMasuk })
  bump()
}

/** Jumlah pegawai yang sudah bergabung pada periode tetapi belum Aktif di BPJS Kesehatan atau Ketenagakerjaan. */
export function notActiveMembers(sampai: string, bayar: string) {
  return membershipPeople().filter((p) => {
    if (p.tanggalMasuk > sampai) return false
    const m = membershipAt(p.nik, bayar)
    return m.kesStatus !== 'Aktif' || m.tkStatus !== 'Aktif'
  })
}

/** Iuran dinolkan untuk program yang belum Aktif pada periode. Bila semua Aktif hasilnya sama persis dengan `b`. */
export function applyMembership(b: BpjsParts, m: Membership): BpjsParts {
  const kes = m.kesStatus === 'Aktif'
  const on = (p: TkProgram) => m.tkStatus === 'Aktif' && m.programs.includes(p)
  const out: BpjsParts = {
    ...b,
    kesCo: kes ? b.kesCo : 0,
    kesP: kes ? b.kesP : 0,
    jhtCo: on('JHT') ? b.jhtCo : 0,
    jhtP: on('JHT') ? b.jhtP : 0,
    jpCo: on('JP') ? b.jpCo : 0,
    jpP: on('JP') ? b.jpP : 0,
    jkk: on('JKK') ? b.jkk : 0,
    jkm: on('JKM') ? b.jkm : 0,
  }
  out.bpjsPegawai = out.kesP + out.jhtP + out.jpP
  out.bebanCo = out.kesCo + out.jhtCo + out.jpCo + out.jkk + out.jkm
  out.bebanBruto = out.kesCo + out.jkk + out.jkm
  return out
}
