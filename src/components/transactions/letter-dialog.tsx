import { DocumentPaper } from '@/components/document-paper'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { contractsOf } from '@/data/contracts'
import { monthsText, contractLimitMonths } from '@/data/master/contract-limit'
import { changeLine, empOf, placeText, supName, type Placement, type TrxJenis, type TrxKontrak } from '@/data/transactions'
import { formatDateLong } from '@/lib/format'
import { idr } from '@/data/payroll/salaries'

export type LetterData = {
  jenis: TrxJenis
  nik: string
  suratNo: string
  /** Tanggal surat (ISO). */
  tanggal: string
  efektif: string
  sebelum: Placement
  sesudah: Placement
  gaji?: { lama: number; baru: number }
  kontrak?: TrxKontrak
  alasanDemosi?: string
  alasan: string
  /** Surat berstempel DRAFT sampai transaksi Disetujui. */
  disetujui: boolean
  showPay: boolean
}

const TITLE: Record<TrxJenis, string> = {
  Promosi: 'PROMOSI JABATAN',
  Demosi: 'DEMOSI JABATAN',
  Rotasi: 'ROTASI PENEMPATAN',
  Mutasi: 'MUTASI PEGAWAI',
  'Perpanjangan Kontrak': 'PERJANJIAN KERJA WAKTU TERTENTU',
  'Pengangkatan Tetap': 'PENGANGKATAN PEGAWAI TETAP',
  'Pindah Kategori': 'PERUBAHAN KATEGORI PEGAWAI',
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">: {value}</dd>
    </div>
  )
}

export function LetterDialog({ data, onClose }: { data: LetterData | null; onClose: () => void }) {
  const emp = data ? empOf(data.nik) : null
  return (
    <Dialog open={data !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pratinjau Surat</DialogTitle>
          <DialogDescription>{data?.jenis === 'Perpanjangan Kontrak' ? 'Perjanjian Kerja Waktu Tertentu' : 'Surat Keputusan'} · {data?.suratNo}</DialogDescription>
        </DialogHeader>
        {data && emp && (
          <DocumentPaper draft={!data.disetujui} className="space-y-5 leading-relaxed" aria-label="Pratinjau surat">
            <div className="space-y-5">
              <header className="border-b pb-3 text-center">
                <p className="text-base font-semibold tracking-wide">PT PRIMAPLAST INDONESIA</p>
                <p className="text-xs text-muted-foreground">Human Resources & General Affairs</p>
              </header>
              <div className="space-y-1 text-center">
                <h3 className="text-base font-semibold">{data.jenis === 'Perpanjangan Kontrak' ? TITLE[data.jenis] : `SURAT KEPUTUSAN ${TITLE[data.jenis]}`}</h3>
                <p className="tabular-nums">Nomor: {data.suratNo}</p>
              </div>
              {data.jenis === 'Perpanjangan Kontrak' ? <Pkwt data={data} nama={emp.nama} /> : <Sk data={data} nama={emp.nama} />}
              <div className="grid grid-cols-2 gap-8 pt-4 text-center">
                <div />
                <div className="space-y-14">
                  <div>
                    <p>Tangerang, {formatDateLong(data.tanggal)}</p>
                    <p className="font-medium">{data.jenis === 'Perpanjangan Kontrak' ? 'Pihak Pertama, PT Primaplast Indonesia' : 'PT Primaplast Indonesia'}</p>
                  </div>
                  <div>
                    <p className="font-semibold underline underline-offset-4">Lestari Wulandari</p>
                    <p className="text-muted-foreground">HR & GA Manager</p>
                  </div>
                </div>
              </div>
              {data.jenis === 'Perpanjangan Kontrak' && (
                <p className="text-center text-xs text-muted-foreground">Pihak Kedua: {emp.nama} ({emp.nik}) menandatangani rangkap dua bermeterai.</p>
              )}
            </div>
          </DocumentPaper>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Sk({ data, nama }: { data: LetterData; nama: string }) {
  const { sebelum: b, sesudah: a } = data
  return (
    <div className="space-y-4">
      <p>Direksi PT Primaplast Indonesia, setelah mempertimbangkan kebutuhan organisasi serta persetujuan atasan langsung dan HR & GA Manager, dengan ini memutuskan:</p>
      <dl className="space-y-1">
        <Row label="Nama" value={nama} />
        <Row label="NIP" value={data.nik} />
        <Row label="Jabatan saat ini" value={`${b.posisi} · ${placeText(b)}`} />
        <Row label={data.jenis === 'Pengangkatan Tetap' ? 'Status Kerja' : 'Ketetapan baru'} value={data.jenis === 'Pengangkatan Tetap' ? `${b.statusKerja} → ${a.statusKerja}` : changeLine({ ...data, sebelum: b, sesudah: a, gaji: data.showPay ? data.gaji : undefined }, data.showPay)} />
      </dl>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Keputusan ini berlaku efektif sejak <span className="font-medium tabular-nums">{formatDateLong(data.efektif)}</span>.</li>
        {a.atasanId !== b.atasanId && <li>Atasan langsung: {supName(a.atasanId)}.</li>}
        {data.alasanDemosi && <li>Dasar keputusan: {data.alasanDemosi}.</li>}
        {data.gaji && data.showPay && <li>Gaji Pokok disesuaikan dari {idr(data.gaji.lama)} menjadi {idr(data.gaji.baru)} per bulan.</li>}
        {data.jenis === 'Pengangkatan Tetap' && <li>Masa kerja dihitung sejak tanggal masuk pertama.</li>}
        {data.jenis === 'Pindah Kategori' && <li>NIP dan masa kerja tetap; perubahan ini tidak dihitung sebagai turnover.</li>}
        <li>Hal-hal lain yang belum diatur mengikuti peraturan perusahaan yang berlaku.</li>
      </ol>
      <p className="text-muted-foreground">Dasar pertimbangan: {data.alasan || '—'}</p>
    </div>
  )
}

function Pkwt({ data, nama }: { data: LetterData; nama: string }) {
  const k = data.kontrak
  const total = (contractsOf(data.nik).filter((c) => !k || c.mulai !== k.mulai).reduce((x, c) => x + c.bulan, 0)) + (k?.bulan ?? 0)
  return (
    <div className="space-y-4">
      <p>Perjanjian ini dibuat antara <span className="font-medium">Lestari Wulandari</span>, HR & GA Manager yang mewakili PT Primaplast Indonesia (Pihak Pertama), dan:</p>
      <dl className="space-y-1">
        <Row label="Nama" value={nama} />
        <Row label="NIP" value={data.nik} />
        <Row label="Jabatan" value={`${data.sesudah.posisi} · ${placeText(data.sesudah)}`} />
      </dl>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Pihak Kedua dipekerjakan untuk waktu tertentu: Kontrak ke-{k?.ke} selama {k?.bulan} bulan, mulai <span className="font-medium tabular-nums">{k ? formatDateLong(k.mulai) : '—'}</span> sampai <span className="font-medium tabular-nums">{k ? formatDateLong(k.akhir) : '—'}</span>.</li>
        <li>Total masa kontrak Pihak Kedua menjadi {monthsText(total)} dari batas {monthsText(contractLimitMonths())} (PP 35/2021).</li>
        <li>Hak dan kewajiban kedua pihak mengikuti peraturan perusahaan dan perundang-undangan ketenagakerjaan.</li>
        <li>Perjanjian berakhir pada tanggal berakhirnya kontrak tanpa pemberitahuan lebih lanjut, kecuali diperpanjang secara tertulis.</li>
      </ol>
    </div>
  )
}
