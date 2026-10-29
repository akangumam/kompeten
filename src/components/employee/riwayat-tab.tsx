import { DiscJenisBadge, DiscStatusCell } from '@/components/industrial/shared'
import { StatusBadge } from '@/components/ui/status-badge'
import { canSeeDiscipline, disciplineOf, useDiscipline, violationOf } from '@/data/discipline'
import { riwayatOf, showsPay, useTrx } from '@/data/transactions'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'

/** Riwayat Kepegawaian: linimasa terbaru di atas; dibangkitkan dari Transaksi Kepegawaian dan riwayat kontrak. */
export function RiwayatTab({ nik, user }: { nik: string; user: CurrentUser }) {
  useTrx()
  useDiscipline()
  const entries = riwayatOf(nik, showsPay(user))
  // Catatan disiplin hanya untuk Admin HRD, HR & GA Manager, dan atasan langsung.
  const disc = canSeeDiscipline(nik, user) ? disciplineOf(nik) : []
  return (
    <div className="space-y-8">
    <ol className="relative space-y-6 border-l pl-6" aria-label="Riwayat Kepegawaian">
      {entries.map((e, i) => (
        <li key={`${e.tanggal}-${e.judul}-${i}`} className="relative">
          <span aria-hidden className="absolute -left-[29px] top-1.5 size-2.5 rounded-full border-2 border-background bg-foreground" />
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium">{e.judul} · <span className="tabular-nums">{formatDate(e.tanggal)}</span></h3>
            {e.terjadwal && <StatusBadge variant="info">Terjadwal</StatusBadge>}
          </div>
          <p className="text-sm text-muted-foreground">{e.detail}</p>
          {(e.trxNo || e.suratNo) && (
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {e.trxNo && <>No. transaksi {e.trxNo}</>}
              {e.trxNo && e.suratNo && ' · '}
              {e.suratNo && <>No. surat {e.suratNo}</>}
            </p>
          )}
        </li>
      ))}
    </ol>
    {canSeeDiscipline(nik, user) && (
      <section className="space-y-3" aria-label="Disiplin">
        <h3 className="text-sm font-semibold">Disiplin</h3>
        {disc.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada catatan disiplin.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {disc.map((d) => (
              <li key={d.id} className="flex flex-wrap items-start justify-between gap-3 p-3 text-sm">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2"><DiscJenisBadge jenis={d.jenis} /><span className="font-medium">{violationOf(d)}</span></div>
                  <p className="text-xs text-muted-foreground tabular-nums">{d.terbit ? `Terbit ${formatDate(d.terbit)}` : `Diajukan ${formatDate(d.diajukan.tanggal)}`}{d.berlakuSampai && d.jenis !== 'Surat Panggilan' ? ` · berlaku s/d ${formatDate(d.berlakuSampai)}` : ''}{d.suratNo ? ` · ${d.suratNo}` : ''}</p>
                </div>
                <DiscStatusCell d={d} />
              </li>
            ))}
          </ul>
        )}
      </section>
    )}
    </div>
  )
}
