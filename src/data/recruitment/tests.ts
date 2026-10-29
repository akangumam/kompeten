import { DEMO_TODAY } from '@/lib/today'
import { bump } from './store'

export type TestKind = 'online' | 'psikotes' | 'praktik'
export const KIND_LABEL: Record<TestKind, string> = { online: 'Online pilihan ganda', psikotes: 'Psikotes eksternal', praktik: 'Praktik/offline' }
export type Soal = { id: string; tanya: string; opsi: [string, string, string, string]; kunci: 0 | 1 | 2 | 3; bobot: number }
export type PaketTes = {
  id: string
  nama: string
  jenis: TestKind
  /** Menit; 0 bila tidak ada batas (psikotes/praktik). */
  durasi: number
  /** Nilai lulus (0–100); null untuk Psikotes (rekomendasi). */
  passing: number | null
  soal: Soal[]
  acak: boolean
  status: 'Aktif' | 'Nonaktif'
  catatan?: string
}

/* ---------- bank soal contoh ---------- */
type Q = [tanya: string, benar: string, salah: [string, string, string]]
const place = (i: number, benar: string, salah: string[]): { opsi: [string, string, string, string]; kunci: 0 | 1 | 2 | 3 } => {
  const k = (i % 4) as 0 | 1 | 2 | 3
  const o = [...salah]
  o.splice(k, 0, benar)
  return { opsi: o as [string, string, string, string], kunci: k }
}
const build = (prefix: string, hand: Q[], gen: ((n: number) => Q)[], total: number): Soal[] => {
  const all: Q[] = [...hand]
  for (let i = 0; all.length < total; i++) all.push(gen[i % gen.length](i + 2))
  return all.slice(0, total).map(([tanya, benar, salah], i) => ({ id: `${prefix}-${String(i + 1).padStart(2, '0')}`, tanya, bobot: 1, ...place(i, benar, salah) }))
}
const num = (n: number) => n.toLocaleString('id-ID')

const UMUM_HAND: Q[] = [
  ['Sinonim kata "efisien" adalah ...', 'Hemat waktu dan tenaga', ['Boros', 'Lambat', 'Rumit']],
  ['Lawan kata "disiplin" adalah ...', 'Lalai', ['Tertib', 'Patuh', 'Rajin']],
  ['Ibu kota Provinsi Banten adalah ...', 'Serang', ['Tangerang', 'Cilegon', 'Pandeglang']],
  ['Jika semua operator wajib memakai sepatu safety dan Budi seorang operator, maka ...', 'Budi wajib memakai sepatu safety', ['Budi boleh tidak memakai sepatu safety', 'Budi tidak perlu APD', 'Sepatu safety hanya untuk supervisor']],
  ['Warna rambu yang berarti larangan pada K3 adalah ...', 'Merah', ['Hijau', 'Biru', 'Kuning']],
  ['Apa yang pertama dilakukan bila melihat kebakaran kecil di area kerja?', 'Membunyikan alarm dan memadamkan dengan APAR bila aman', ['Mengabaikannya', 'Meninggalkan area tanpa memberi tahu', 'Menyiram dengan air pada kebakaran listrik']],
  ['Satuan tekanan dalam SI adalah ...', 'Pascal', ['Joule', 'Watt', 'Newton meter']],
  ['Kata baku yang benar adalah ...', 'Analisis', ['Analisa', 'Analis is', 'Anilisis']],
  ['Kalimat efektif di bawah ini adalah ...', 'Laporan produksi harus diserahkan hari ini.', ['Laporan produksi itu harus supaya diserahkan hari ini juga.', 'Hari ini laporan produksi dikumpulkan harus sudah.', 'Diserahkan harus laporan produksi hari ini ya.']],
  ['Waktu terbaik melaporkan kondisi mesin yang tidak normal adalah ...', 'Segera kepada atasan', ['Setelah shift berakhir', 'Menunggu mesin rusak', 'Tidak perlu dilaporkan']],
  ['Dalam tim, perbedaan pendapat sebaiknya diselesaikan dengan ...', 'Diskusi terbuka dan saling menghargai', ['Menghindari rekan kerja', 'Memaksakan pendapat', 'Mengadu tanpa bicara langsung']],
  ['Jam kerja 08.00–16.00 dengan istirahat 1 jam. Total jam kerja efektif adalah ...', '7 jam', ['8 jam', '6 jam', '9 jam']],
]
const UMUM_GEN: ((n: number) => Q)[] = [
  (n) => { const a = 6 + n, b = 3 + (n % 7); return [`Berapa hasil ${a} × ${b}?`, num(a * b), [num(a * b + b), num(a * b - a), num(a * b + 10)]] },
  (n) => { const p = 10 + (n % 4) * 5, y = 200 + n * 20; return [`${p}% dari ${num(y)} adalah ...`, num((p * y) / 100), [num((p * y) / 100 + 10), num((p * y) / 100 - 5), num(p * y / 10)]] },
  (n) => { const s = 2 + n, d = 3 + (n % 3); return [`Lanjutkan deret: ${s}, ${s + d}, ${s + 2 * d}, ${s + 3 * d}, ...`, String(s + 4 * d), [String(s + 4 * d + 1), String(s + 3 * d + 2), String(s + 5 * d)]] },
  (n) => { const km = 2 + (n % 6); return [`${km} kilometer sama dengan ... meter`, num(km * 1000), [num(km * 100), num(km * 10000), num(km * 10)]] },
]

const OPERATOR_HAND: Q[] = [
  ['Pada mesin injection molding, bahan plastik dilelehkan di bagian ...', 'Barrel', ['Hopper', 'Clamping unit', 'Ejector']],
  ['Fungsi utama clamping unit adalah ...', 'Menjaga cetakan tetap tertutup saat injeksi', ['Memanaskan resin', 'Mengeringkan resin', 'Mendinginkan oli']],
  ['Cacat "short shot" disebabkan oleh ...', 'Material yang diinjeksikan tidak memenuhi rongga cetakan', ['Cetakan terlalu dingin saja', 'Operator terlambat', 'Ejector patah']],
  ['Sebelum membuka pengaman mesin untuk membersihkan cetakan, operator wajib ...', 'Mematikan mesin dan melakukan lockout/tagout', ['Menjaga mesin tetap berjalan', 'Memakai sarung tangan kain saja', 'Meminta rekan menekan tombol start']],
  ['APD wajib di area produksi plastik panas adalah ...', 'Sarung tangan tahan panas dan sepatu safety', ['Sandal jepit', 'Kacamata renang', 'Jaket tebal']],
  ['Pada mesin blow molding, produk botol dibentuk dengan cara ...', 'Menggembungkan parison dengan udara bertekanan di dalam cetakan', ['Memotong plat plastik', 'Menyuntik resin ke cetakan tertutup', 'Menekan resin dingin']],
  ['Hopper dryer digunakan untuk ...', 'Mengeringkan resin sebelum diproses', ['Mendinginkan produk jadi', 'Memotong sprue', 'Mencuci cetakan']],
  ['Bila terdapat flash pada produk, penyebab yang paling mungkin adalah ...', 'Gaya clamp kurang atau cetakan aus', ['Resin terlalu kering', 'Mesin terlalu dingin', 'Ejector terlalu cepat']],
  ['Apa yang dimaksud dengan cycle time?', 'Waktu yang dibutuhkan untuk satu siklus produksi', ['Jumlah operator per shift', 'Suhu barrel rata-rata', 'Berat satu produk']],
  ['Saat produk reject ditemukan berulang, tindakan operator yang benar adalah ...', 'Menghentikan mesin dan melapor ke leader', ['Melanjutkan produksi', 'Mencampur reject ke produk baik', 'Mengubah setting sendiri tanpa izin']],
]
const OPERATOR_GEN: ((n: number) => Q)[] = [
  (n) => { const c = 20 + (n % 5) * 5, p = 2 + (n % 3) * 2; const h = Math.floor(3600 / c) * p; return [`Mesin dengan cycle time ${c} detik menghasilkan ${p} pcs per siklus. Berapa pcs per jam (dibulatkan ke bawah)?`, num(h), [num(h + p), num(h - p * 2), num(h + 100)]] },
  (n) => { const t = 400 + n * 25, r = 5 + (n % 4); return [`Target ${num(t)} pcs dengan reject ${r}%. Berapa pcs baik yang tersisa?`, num(Math.round(t * (100 - r) / 100)), [num(t - r), num(Math.round(t * (100 - r) / 100) + 10), num(t)]] },
  (n) => { const w = 12 + (n % 5) * 2, q = 150 + n * 10; return [`Satu produk berat ${w} gram. Berapa kilogram resin untuk ${num(q)} produk?`, (w * q / 1000).toLocaleString('id-ID'), [(w * q / 100).toLocaleString('id-ID'), (w * q / 10000).toLocaleString('id-ID'), (w * q / 500).toLocaleString('id-ID')]] },
]

const QC_HAND: Q[] = [
  ['Tujuan utama inspeksi kualitas produk adalah ...', 'Memastikan produk sesuai spesifikasi sebelum dikirim', ['Mempercepat produksi', 'Mengurangi jumlah operator', 'Menaikkan harga jual']],
  ['Alat untuk mengukur dimensi dengan ketelitian 0,05 mm adalah ...', 'Jangka sorong', ['Penggaris plastik', 'Meteran gulung', 'Timbangan']],
  ['AQL adalah singkatan dari ...', 'Acceptable Quality Limit', ['Actual Quality Level', 'Approved Quantity List', 'Average Quality Line']],
  ['Cacat "sink mark" tampak sebagai ...', 'Cekungan pada permukaan produk', ['Bercak hitam', 'Retak memanjang', 'Lubang tembus']],
  ['Cacat "black spot" biasanya disebabkan oleh ...', 'Material terdegradasi atau kontaminasi', ['Cetakan terlalu dingin', 'Tekanan terlalu rendah', 'Ejector bengkok']],
  ['Dokumen yang mencatat hasil pemeriksaan per lot disebut ...', 'Laporan inspeksi (inspection report)', ['Slip gaji', 'Surat jalan', 'Daftar hadir']],
  ['Produk yang lolos inspeksi tetapi diragukan sebaiknya ...', 'Ditahan dan dilaporkan ke atasan QC', ['Dikirim saja', 'Dibuang tanpa catatan', 'Dicampur ke lot lain']],
  ['Standar manajemen mutu yang umum dipakai pabrik adalah ...', 'ISO 9001', ['ISO 14001 saja', 'ISO 22000', 'ISO 45001 saja']],
  ['Sampel acak diambil agar ...', 'Mewakili seluruh lot secara adil', ['Pemeriksaan lebih cepat selesai', 'Hanya produk terbaik diperiksa', 'Operator mudah dinilai']],
  ['Kalibrasi alat ukur dilakukan untuk ...', 'Menjaga akurasi hasil pengukuran', ['Mempercantik alat', 'Mengurangi biaya alat', 'Menghindari inspeksi']],
  ['Tanda pada produk yang menunjukkan nomor lot dan tanggal produksi disebut ...', 'Traceability marking', ['Merek dagang', 'Hologram', 'Segel garansi']],
  ['Bila hasil ukur berada di luar toleransi, status produk adalah ...', 'Reject atau hold untuk disposisi', ['Lolos', 'Lolos bersyarat tanpa catatan', 'Tidak perlu dicatat']],
]
const QC_GEN: ((n: number) => Q)[] = [
  (n) => { const s = 100 + (n % 5) * 20, d = 2 + (n % 6); const p = Math.round((d / s) * 1000) / 10; return [`Dari ${s} sampel ditemukan ${d} cacat. Persentase cacat (satu desimal) adalah ...`, `${p.toLocaleString('id-ID')}%`, [`${(p + 1).toLocaleString('id-ID')}%`, `${(p * 2).toLocaleString('id-ID')}%`, `${Math.max(0.1, p - 0.8).toLocaleString('id-ID')}%`]] },
  (n) => { const nom = 25 + (n % 5) * 5, tol = 0.2; return [`Dimensi nominal ${nom} mm dengan toleransi ±${tol.toLocaleString('id-ID')} mm. Rentang yang diterima adalah ...`, `${(nom - tol).toLocaleString('id-ID')}–${(nom + tol).toLocaleString('id-ID')} mm`, [`${nom - 1}–${nom + 1} mm`, `${(nom - tol * 2).toLocaleString('id-ID')}–${nom} mm`, `${nom}–${nom + 2} mm`]] },
  (n) => { const lot = 500 + n * 50, rej = 10 + (n % 4) * 5; return [`Dalam lot ${num(lot)} pcs terdapat ${rej} pcs reject. Jumlah produk baik adalah ...`, num(lot - rej), [num(lot + rej), num(lot - rej * 2), num(lot - rej + 5)]] },
]

const sample = (prefix: string, hand: Q[], gen: ((n: number) => Q)[], total: number) => build(prefix, hand, gen, total)

export const PAKET: PaketTes[] = [
  { id: 'PKT-001', nama: 'Tes Pengetahuan Umum', jenis: 'online', durasi: 30, passing: 60, soal: sample('UMM', UMUM_HAND, UMUM_GEN, 30), acak: true, status: 'Aktif' },
  { id: 'PKT-002', nama: 'Tes Teknis Operator', jenis: 'online', durasi: 25, passing: 60, soal: sample('OPR', OPERATOR_HAND, OPERATOR_GEN, 20), acak: true, status: 'Aktif' },
  { id: 'PKT-003', nama: 'Tes Teknis QC', jenis: 'online', durasi: 30, passing: 65, soal: sample('QC', QC_HAND, QC_GEN, 25), acak: true, status: 'Aktif' },
  { id: 'PKT-004', nama: 'Psikotes', jenis: 'psikotes', durasi: 0, passing: null, soal: [], acak: false, status: 'Aktif', catatan: 'Dilaksanakan lembaga eksternal; HR mengunggah laporan dan rekomendasi.' },
  { id: 'PKT-005', nama: 'Tes Praktik Mesin', jenis: 'praktik', durasi: 0, passing: 70, soal: [], acak: false, status: 'Aktif', catatan: 'Praktik langsung di area produksi; nilai dimasukkan manual oleh HR.' },
]
export const paketOf = (id: string) => PAKET.find((p) => p.id === id)

export function savePaket(p: PaketTes) {
  const i = PAKET.findIndex((x) => x.id === p.id)
  if (i >= 0) PAKET[i] = p
  else PAKET.push(p)
  bump()
}
export const nextPaketId = () => `PKT-${String(PAKET.length + 1).padStart(3, '0')}`

/* ---------- penugasan tes per kandidat (dipakai 09f: portal pelamar memakai record yang sama) ---------- */
export type TestStatus = 'Dijadwalkan' | 'Sedang dikerjakan' | 'Selesai' | 'Kedaluwarsa'
export type Rekomendasi = 'Disarankan' | 'Dipertimbangkan' | 'Tidak disarankan'
export const REKOMENDASI: Rekomendasi[] = ['Disarankan', 'Dipertimbangkan', 'Tidak disarankan']
export type TestAssign = {
  id: string
  kandidatId: string
  paketId: string
  /** Tanggal mulai dibuka. */
  jadwal: string
  /** Batas waktu pengerjaan (inklusif). */
  batas: string
  status: TestStatus
  nilai?: number
  rekomendasi?: Rekomendasi
  laporan?: { name: string; size: number }
  tautan: string
  dikirimKe: string
  diinput?: { by: string; at: string; mode: 'manual' | 'portal' }
  catatan?: string
}
export const ASSIGNS: TestAssign[] = []
let seq = 0
export const nextAssignId = () => `TST-2026-${String(++seq).padStart(4, '0')}`
export const assignsOf = (kandidatId: string) => ASSIGNS.filter((a) => a.kandidatId === kandidatId)
export const assignOf = (id: string) => ASSIGNS.find((a) => a.id === id)

/** Status efektif: undangan yang lewat batas tanpa nilai menjadi Kedaluwarsa. */
export const effTestStatus = (a: TestAssign): TestStatus => (a.status === 'Dijadwalkan' && a.batas < DEMO_TODAY ? 'Kedaluwarsa' : a.status)

/** Lulus: Online/Praktik nilai ≥ passing grade; Psikotes rekomendasi bukan "Tidak disarankan". undefined = belum selesai. */
export function lulusOf(a: TestAssign): boolean | undefined {
  if (a.status !== 'Selesai') return undefined
  const p = paketOf(a.paketId)
  if (!p) return undefined
  if (p.jenis === 'psikotes') return a.rekomendasi !== undefined && a.rekomendasi !== 'Tidak disarankan'
  return a.nilai !== undefined && p.passing !== null && a.nilai >= p.passing
}
export const nilaiText = (a: TestAssign) => (a.status !== 'Selesai' ? '—' : a.rekomendasi ?? String(a.nilai ?? '—'))

/* ---------- seed ---------- */
const EMAIL: Record<string, string> = {
  'LMR-2026-0150': 'maya.sari@email.com', 'LMR-2026-0149': 'agus.salim@email.com', 'LMR-2026-0148': 'lina.puspita@email.com',
  'LMR-2026-0147': 'hendra.wijaya@email.com', 'LMR-2026-0146': 'dewi.lestari@email.com', 'LMR-2026-0145': 'fajar.nugroho@email.com',
  'LMR-2026-0144': 'rina.marlina@email.com', 'LMR-2026-0143': 'andi.saputra@email.com', 'LMR-2026-0142': 'sari.wulandari@email.com',
}
const nameOf = (kid: string) => ({ 'LMR-2026-0148': 'Lina_Puspita', 'LMR-2026-0146': 'Dewi_Lestari', 'LMR-2026-0142': 'Sari_Wulandari' } as Record<string, string>)[kid] ?? kid
const seed = (kandidatId: string, paketId: string, jadwal: string, o: { nilai?: number; rekomendasi?: Rekomendasi; selesai?: string } = {}) => {
  const done = o.selesai !== undefined
  ASSIGNS.push({
    id: nextAssignId(), kandidatId, paketId, jadwal, batas: done ? o.selesai! : jadwal, status: done ? 'Selesai' : 'Dijadwalkan',
    nilai: o.nilai, rekomendasi: o.rekomendasi,
    laporan: o.rekomendasi ? { name: `Laporan_Psikotes_${nameOf(kandidatId)}.pdf`, size: 482_000 } : undefined,
    tautan: `https://tes.kompeten.id/${kandidatId.toLowerCase()}/${paketId.toLowerCase()}`, dikirimKe: EMAIL[kandidatId],
    diinput: done ? { by: 'Admin HRD', at: o.selesai!, mode: 'manual' } : undefined,
  })
}
seed('LMR-2026-0150', 'PKT-001', '2026-10-28')
seed('LMR-2026-0150', 'PKT-003', '2026-10-28')
seed('LMR-2026-0149', 'PKT-001', '2026-10-22', { nilai: 72, selesai: '2026-10-22' })
seed('LMR-2026-0149', 'PKT-002', '2026-10-22', { nilai: 68, selesai: '2026-10-22' })
seed('LMR-2026-0148', 'PKT-001', '2026-10-10', { nilai: 78, selesai: '2026-10-10' })
seed('LMR-2026-0148', 'PKT-004', '2026-10-11', { rekomendasi: 'Disarankan', selesai: '2026-10-11' })
seed('LMR-2026-0147', 'PKT-001', '2026-10-08', { nilai: 70, selesai: '2026-10-08' })
seed('LMR-2026-0147', 'PKT-002', '2026-10-09', { nilai: 66, selesai: '2026-10-09' })
seed('LMR-2026-0146', 'PKT-001', '2026-10-06', { nilai: 75, selesai: '2026-10-06' })
seed('LMR-2026-0146', 'PKT-004', '2026-10-07', { rekomendasi: 'Disarankan', selesai: '2026-10-07' })
seed('LMR-2026-0145', 'PKT-001', '2026-10-04', { nilai: 68, selesai: '2026-10-04' })
seed('LMR-2026-0145', 'PKT-005', '2026-10-06', { nilai: 74, selesai: '2026-10-06' })
seed('LMR-2026-0144', 'PKT-001', '2026-10-02', { nilai: 80, selesai: '2026-10-02' })
seed('LMR-2026-0144', 'PKT-003', '2026-10-02', { nilai: 78, selesai: '2026-10-02' })
seed('LMR-2026-0143', 'PKT-001', '2026-09-29', { nilai: 74, selesai: '2026-09-29' })
seed('LMR-2026-0143', 'PKT-002', '2026-09-30', { nilai: 70, selesai: '2026-09-30' })
seed('LMR-2026-0142', 'PKT-001', '2026-09-26', { nilai: 66, selesai: '2026-09-26' })
seed('LMR-2026-0142', 'PKT-004', '2026-09-27', { rekomendasi: 'Dipertimbangkan', selesai: '2026-09-27' })
