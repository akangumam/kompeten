import { DocDialog, DocRow } from '@/components/industrial/shared'
import { nextBuktiNo, statusOf, type FinalPay } from '@/data/finalpay'
import { formatDate, formatDateLong } from '@/lib/format'

const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

/** Bukti Perhitungan Hak Akhir / Kompensasi PKWT: DRAFT sampai Disetujui. */
export function BuktiDialog({ rec, onClose }: { rec: FinalPay | null; onClose: () => void }) {
  const c = rec?.calc
  const approved = !!rec && (statusOf(rec) === 'disetujui' || statusOf(rec) === 'dibayar')
  const no = rec ? rec.buktiNo || nextBuktiNo(rec.kind) : ''
  return (
    <DocDialog open={rec !== null} onClose={onClose} title="Bukti Perhitungan Hak Akhir" description={rec ? `${no}${approved ? '' : ' · DRAFT sampai Disetujui'}` : ''} draft={!approved}>
      {rec && c && (
        <>
          <div className="space-y-1 text-center">
            <h3 className="text-base font-semibold">{rec.kind === 'KPK' ? 'BUKTI PERHITUNGAN KOMPENSASI PKWT' : 'BUKTI PERHITUNGAN HAK AKHIR'}</h3>
            <p className="tabular-nums">Nomor: {no} · {rec.no}</p>
          </div>
          <dl className="space-y-1">
            <DocRow label="Nama" value={c.base.nama} />
            <DocRow label="NIP" value={rec.nik} />
            <DocRow label="Status Kerja" value={`${c.base.jenis} · ${c.base.statusKerja}`} />
            <DocRow label="Masa kerja" value={`${c.base.masaText} (${formatDate(c.base.masuk)} – ${formatDate(c.base.keluar)})`} />
            <DocRow label="Dasar" value={c.ruleLabel} />
            <DocRow label="Upah dasar" value={rp(c.base.upah)} />
          </dl>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {c.lines.filter((l) => l.kode !== 'INFO').map((l, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-3 align-top">{l.label}<span className="block text-xs text-muted-foreground">{l.rumus}</span></td>
                  <td className="py-1.5 text-right align-top tabular-nums">{l.potongan ? '−' : ''}{rp(l.nominal)}</td>
                </tr>
              ))}
              <tr className="font-medium"><td className="py-1.5">Total bruto</td><td className="py-1.5 text-right tabular-nums">{rp(c.bruto)}</td></tr>
              <tr><td className="py-1.5">PPh 21 final</td><td className="py-1.5 text-right tabular-nums">−{rp(c.pphFinal)}</td></tr>
              {c.terBase > 0 && <tr><td className="py-1.5 text-muted-foreground">Bagian tidak final ({rp(c.terBase)}): PPh 21 TER dihitung di payroll</td><td /></tr>}
              <tr className="font-semibold"><td className="py-1.5">Neto</td><td className="py-1.5 text-right tabular-nums">{rp(c.neto)}</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">
            Pembayaran: {rec.pembayaran.mode === 'payroll' ? `lewat payroll periode ${rec.pembayaran.periodeId}` : 'transfer terpisah oleh Finance'}. Dibuat {formatDateLong(rec.dibuat)}.
          </p>
          <div className="grid grid-cols-2 gap-8 pt-2 text-center">
            <div className="space-y-12"><p>Dihitung oleh</p><p className="font-medium underline underline-offset-4">Mira Andriani<span className="block font-normal text-muted-foreground no-underline">Payroll Officer</span></p></div>
            <div className="space-y-12"><p>Disetujui oleh</p><p className="font-medium underline underline-offset-4">Lestari Wulandari<span className="block font-normal text-muted-foreground no-underline">HR & GA Manager</span></p></div>
          </div>
        </>
      )}
    </DocDialog>
  )
}
