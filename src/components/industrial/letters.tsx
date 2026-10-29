import { DocDialog, DocRow } from '@/components/industrial/shared'
import { DISC_STATUS_LABEL, nextLetterNo, statusOf, violationOf, type Disc } from '@/data/discipline'
import { spValidityMonths } from '@/data/master/discipline'
import { personOf, nextSkkNo, type Off } from '@/data/offboarding'
import { formatDate, formatDateLong } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { validUntil } from '@/data/discipline'

const SIGNER = (
  <div className="grid grid-cols-2 gap-8 pt-4 text-center">
    <div />
    <div className="space-y-14">
      <p className="font-medium">PT Primaplast Indonesia</p>
      <div>
        <p className="font-semibold underline underline-offset-4">Lestari Wulandari</p>
        <p className="text-muted-foreground">HR & GA Manager</p>
      </div>
    </div>
  </div>
)

const TITLE: Record<Disc['jenis'], string> = {
  'Teguran Lisan': 'CATATAN TEGURAN LISAN',
  'Teguran Tertulis': 'SURAT TEGURAN TERTULIS',
  SP1: 'SURAT PERINGATAN KE-1 (SP1)',
  SP2: 'SURAT PERINGATAN KE-2 (SP2)',
  SP3: 'SURAT PERINGATAN KE-3 (SP3)',
  'Surat Panggilan': 'SURAT PANGGILAN',
}

/** Pratinjau SP/Teguran/Surat Panggilan. Watermark DRAFT sampai disetujui; pasal PP/PKB tampil sebagai teks yang dapat diubah saat membuat. */
export function DiscLetterDialog({ disc, onClose }: { disc: Disc | null; onClose: () => void }) {
  const p = disc ? personOf(disc.nik) : undefined
  const approved = !!disc && disc.status === 'aktif'
  const no = disc ? disc.suratNo || nextLetterNo(disc.jenis) : ''
  const terbit = disc?.terbit ?? DEMO_TODAY
  return (
    <DocDialog open={disc !== null} onClose={onClose} title="Pratinjau Surat" description={disc ? `${disc.jenis} · ${no}${approved ? '' : ' (nomor definitif saat disetujui)'}` : ''} draft={!approved}>
      {disc && p && (
        <>
          <div className="space-y-1 text-center">
            <h3 className="text-base font-semibold">{TITLE[disc.jenis]}</h3>
            <p className="tabular-nums">Nomor: {no}</p>
          </div>
          <dl className="space-y-1">
            <DocRow label="Nama" value={p.nama} />
            <DocRow label="NIP" value={p.nik} />
            <DocRow label="Jabatan" value={`${p.posisi} · ${p.department}`} />
          </dl>
          {disc.jenis === 'Surat Panggilan' ? (
            <div className="space-y-3">
              <p>Sehubungan dengan ketidakhadiran Saudara tanpa keterangan (mangkir), dengan ini perusahaan memanggil Saudara untuk <span className="font-medium">Panggilan ke-{disc.panggilan?.ke}</span>.</p>
              <p>Saudara diminta hadir di Bagian HR & GA paling lambat <span className="font-medium tabular-nums">{formatDateLong(disc.panggilan!.hadir)}</span> untuk memberikan penjelasan.</p>
              <p className="text-muted-foreground">Dasar: {disc.pasal || '—'}</p>
              <p>Apabila Saudara tidak hadir dan tidak memberikan keterangan tertulis, perusahaan akan mengambil langkah sesuai ketentuan yang berlaku.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p>Berdasarkan hasil pemeriksaan, Saudara dinyatakan melakukan pelanggaran: <span className="font-medium">{violationOf(disc)}</span> pada <span className="tabular-nums">{formatDateLong(disc.kejadian)}</span>.</p>
              <p>Kronologi: {disc.kronologi}</p>
              <p className="text-muted-foreground">Dasar: {disc.pasal || '—'}</p>
              <p>
                Dengan ini perusahaan memberikan <span className="font-medium">{disc.jenis}</span>. Surat ini berlaku {spValidityMonths(terbit)} bulan, mulai <span className="tabular-nums">{formatDate(terbit)}</span> sampai{' '}
                <span className="tabular-nums">{formatDate(disc.berlakuSampai ?? validUntil(terbit))}</span>. Pengulangan pelanggaran dapat berakibat sanksi yang lebih berat.
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Status: {DISC_STATUS_LABEL[statusOf(disc)]}</p>
          {SIGNER}
        </>
      )}
    </DocDialog>
  )
}

/** Surat Keterangan Kerja (paklaring): DRAFT sampai tahap Selesai tercapai. */
export function SkkDialog({ off, onClose }: { off: Off | null; onClose: () => void }) {
  const p = off ? personOf(off.nik) : undefined
  const done = off?.status === 'selesai'
  return (
    <DocDialog open={off !== null} onClose={onClose} title="Pratinjau Surat Keterangan Kerja" description={off ? `${off.skkNo || nextSkkNo()}${done ? '' : ' · DRAFT sampai tahap Selesai'}` : ''} draft={!done}>
      {off && p && (
        <>
          <div className="space-y-1 text-center">
            <h3 className="text-base font-semibold">SURAT KETERANGAN KERJA</h3>
            <p className="tabular-nums">Nomor: {off.skkNo || nextSkkNo()}</p>
          </div>
          <p>Yang bertanda tangan di bawah ini menerangkan bahwa:</p>
          <dl className="space-y-1">
            <DocRow label="Nama" value={p.nama} />
            <DocRow label="NIP" value={p.nik} />
            <DocRow label="Jabatan terakhir" value={`${p.posisi} · ${p.department}`} />
            <DocRow label="Tanggal masuk" value={formatDateLong(p.tanggalMasuk)} />
            <DocRow label="Tanggal keluar" value={formatDateLong(off.tanggalKeluar)} />
          </dl>
          <p>Yang bersangkutan telah bekerja di PT Primaplast Indonesia dengan baik dan mengakhiri hubungan kerja karena {off.reason.toLowerCase()}. Surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
          {SIGNER}
        </>
      )}
    </DocDialog>
  )
}
