import { MIG_UD, monthName, postLedger, SEED_UDG } from '@/data/koperasi/finance'
import { UD_KATEGORI } from '@/data/koperasi/settings'
import { bump } from '@/data/koperasi/store'
import { DEMO_TODAY } from '@/lib/today'

/** Unit Dagang: uang masuk dan keluar. Selisih (masuk − keluar) menjadi pendapatan Koperasi untuk SHU. Append-only: koreksi = transaksi baru. */
export type UdJenis = 'Masuk' | 'Keluar'
export type UdTx = {
  id: string
  tanggal: string
  jenis: UdJenis
  kategori: string
  keterangan: string
  nominal: number
  bukti: string
  oleh: string
  migrasi?: boolean
  dikoreksiOleh?: string
  koreksiDari?: string
}
const lastDay = (ym: string) => `${ym}-${String(new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate()).padStart(2, '0')}`
const migrated: UdTx[] = Object.entries(MIG_UD).flatMap(([bulan, [masuk, keluar]]) => [
  { id: `MIG-${bulan}-M`, tanggal: lastDay(bulan), jenis: 'Masuk' as UdJenis, kategori: 'Penjualan tunai', keterangan: `Ringkasan ${monthName(bulan)} (data migrasi)`, nominal: masuk, bukti: '—', oleh: 'Data migrasi', migrasi: true },
  { id: `MIG-${bulan}-K`, tanggal: lastDay(bulan), jenis: 'Keluar' as UdJenis, kategori: 'Pembelian barang dagang', keterangan: `Ringkasan ${monthName(bulan)} (data migrasi)`, nominal: keluar, bukti: '—', oleh: 'Data migrasi', migrasi: true },
])
export const UDG: UdTx[] = [...SEED_UDG.map((u) => ({ ...u, oleh: 'Nina Marlina' })).reverse(), ...migrated.reverse()]
let seq = 1007

export const udMonth = (bulan: string) => UDG.filter((t) => t.tanggal.startsWith(bulan))
export const masuk = (bulan: string) => udMonth(bulan).filter((t) => t.jenis === 'Masuk').reduce((a, t) => a + t.nominal, 0)
export const keluar = (bulan: string) => udMonth(bulan).filter((t) => t.jenis === 'Keluar').reduce((a, t) => a + t.nominal, 0)
export const selisih = (bulan: string) => masuk(bulan) - keluar(bulan)
export const selisihTahun = (year: string) => UDG.filter((t) => t.tanggal.startsWith(year)).reduce((a, t) => a + (t.jenis === 'Masuk' ? t.nominal : -t.nominal), 0)
export const kategoriOptions = (j: UdJenis) => UD_KATEGORI[j].filter((k) => k.aktif).map((k) => k.nama)

export type UdInput = { jenis: UdJenis; tanggal: string; kategori: string; nominal: number; keterangan: string; bukti: string; koreksiDari?: string }
export function createUd(i: UdInput, by: string): { id?: string; error?: string } {
  if (i.tanggal > DEMO_TODAY) return { error: 'Tanggal tidak boleh setelah hari ini' }
  if (!i.nominal || i.nominal <= 0) return { error: 'Nominal wajib diisi' }
  const id = `UDG-2026-${seq++}`
  UDG.unshift({ id, tanggal: i.tanggal, jenis: i.jenis, kategori: i.kategori, keterangan: i.keterangan.trim(), nominal: i.nominal, bukti: i.bukti, oleh: by, koreksiDari: i.koreksiDari })
  if (i.koreksiDari) {
    const o = UDG.find((t) => t.id === i.koreksiDari)
    if (o) o.dikoreksiOleh = id
  }
  postLedger({ tanggal: i.tanggal, tipe: i.jenis === 'Masuk' ? 'ud-masuk' : 'ud-keluar', nominal: i.nominal, ref: id, label: i.keterangan.trim() })
  bump()
  return { id }
}
