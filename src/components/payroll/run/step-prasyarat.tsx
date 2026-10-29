import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Blocked, StepFooter, type StepProps } from '@/components/payroll/run/shared'
import { billStateOf } from '@/data/koperasi/loans'
import { ROSTER } from '@/data/employees'
import { notActiveMembers } from '@/data/payroll/bpjs-membership'
import { salaryAt } from '@/data/payroll/salaries'
import { advance, isFinalized } from '@/data/payroll/runs'
import { effectiveInPeriod, TRX } from '@/data/transactions'

type Item = { tone: 'ok' | 'blocking' | 'warn' | 'info'; text: string; detail?: string; action?: { label: string; run: () => void } }

/** Informasi (tidak memblokir): transaksi kepegawaian yang berlaku di periode memengaruhi data gaji yang ditarik. */
export function trxInfoItem(period: Pick<StepProps['period'], 'id' | 'dari' | 'sampai'>, onNavigate: StepProps['onNavigate']): Item | null {
  const n = TRX.filter((t) => effectiveInPeriod(t, period.dari, period.sampai)).length
  if (n === 0) return null
  return {
    tone: 'info',
    text: `${n} transaksi kepegawaian berlaku di periode ini`,
    detail: 'Tidak memblokir: Promosi, Demosi, Mutasi, dan Pindah Kategori memakai data baru sejak tanggal efektifnya.',
    action: { label: 'Lihat daftar transaksi', run: () => onNavigate('employee-transactions', period.id) },
  }
}

export function useChecklist({ period, closed, otPending, onNavigate }: Pick<StepProps, 'period' | 'closed' | 'otPending' | 'onNavigate'>): Item[] {
  const final = period.id === '2026-09'
  const noRek = ROSTER.filter((e) => e.kelompok !== 'Outsourcing' && !salaryAt(e, period.bayar).nomorRekening)
  const items: Item[] = []
  const ok = final || !!closed
  items.push({
    tone: ok ? 'ok' : 'blocking',
    text: ok ? `Kehadiran ${period.label} sudah closing` : `Kehadiran ${period.label} belum closing`,
    detail: final ? 'Closing 21 Sep 2026' : closed ? `Closing ${closed.at} oleh ${closed.by}` : 'Wajib closing sebelum payroll dapat diproses.',
    action: ok ? undefined : { label: 'Buka Absensi & Rekap', run: () => onNavigate('attendance') },
  })
  const lem = final ? 0 : otPending
  items.push({
    tone: lem === 0 ? 'ok' : 'blocking',
    text: lem === 0 ? 'Tidak ada lembur menunggu validasi pada periode' : `${lem} lembur masih menunggu validasi pada periode`,
    action: lem === 0 ? undefined : { label: 'Buka Overtime', run: () => onNavigate('overtime') },
  })
  items.push(
    noRek.length === 0 || final
      ? { tone: 'ok', text: 'Data gaji lengkap (rekening & PTKP)' }
      : {
          tone: 'warn',
          text: `${noRek.length} pegawai belum memiliki nomor rekening: ${noRek.map((e) => `${e.nama} (${e.nik})`).join(', ')}`,
          detail: 'Tidak memblokir: pegawai tetap dibayar dan ditandai "Rekening belum ada" di Review.',
          action: { label: 'Buka Komponen Gaji', run: () => onNavigate('payroll-components') },
        },
  )
  const bpjsPending = final ? [] : notActiveMembers(period.sampai, period.bayar)
  items.push(
    bpjsPending.length === 0
      ? { tone: 'ok', text: 'Kepesertaan BPJS semua pegawai aktif' }
      : {
          tone: 'warn',
          text: `${bpjsPending.length} pegawai belum aktif kepesertaan BPJS`,
          detail: `Tidak memblokir: iuran hanya dihitung untuk program yang berstatus Aktif. ${bpjsPending.slice(0, 4).map((p) => p.nama).join(', ')}${bpjsPending.length > 4 ? '…' : ''}`,
          action: { label: 'Buka Kepesertaan BPJS', run: () => onNavigate('payroll-components') },
        },
  )
  const bill = billStateOf(period.id)
  items.push(
    bill.status === 'draft'
      ? { tone: 'blocking', text: 'Tagihan potongan Koperasi belum diterima', detail: 'Sekretaris Koperasi mengirim tagihan dari Koperasi › Potongan Payroll.' }
      : { tone: 'ok', text: 'Tagihan potongan Koperasi diterima', detail: `Diterima ${bill.at ?? ''} dari ${bill.by ?? 'Koperasi'}` },
  )
  const trxItem = trxInfoItem(period, onNavigate)
  if (trxItem) items.push(trxItem)
  return items
}

const ICON = { ok: CircleCheck, blocking: CircleX, warn: TriangleAlert, info: Info }
const TONE = { ok: 'text-success', blocking: 'text-danger', warn: 'text-warning', info: 'text-info' }

export function InfoItemRow({ item }: { item: Item }) {
  return (
    <li className="flex flex-wrap items-start gap-3 p-4">
      <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium">{item.text}<span className="sr-only"> (informasi)</span></p>
        {item.detail && <p className="text-sm text-muted-foreground">{item.detail}</p>}
      </div>
      {item.action && <Button variant="link" className="h-auto p-0" onClick={item.action.run}>{item.action.label}</Button>}
    </li>
  )
}

export function StepPrasyarat(props: StepProps) {
  const items = useChecklist(props)
  const blocking = items.filter((i) => i.tone === 'blocking')
  const readOnly = !props.officer || isFinalized(props.run)
  return (
    <div>
      <ul className="divide-y rounded-lg border">
        {items.map((i) => {
          const Icon = ICON[i.tone]
          return (
            <li key={i.text} className="flex flex-wrap items-start gap-3 p-4">
              <Icon className={`mt-0.5 size-4 shrink-0 ${TONE[i.tone]}`} aria-hidden />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-medium">
                  {i.text}
                  <span className="sr-only">{i.tone === 'blocking' ? ' (memblokir)' : i.tone === 'warn' ? ' (peringatan)' : i.tone === 'info' ? ' (informasi)' : ' (selesai)'}</span>
                </p>
                {i.detail && <p className="text-sm text-muted-foreground">{i.detail}</p>}
              </div>
              {i.action && (
                <Button variant="link" className="h-auto p-0" onClick={i.action.run}>
                  {i.action.label}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {!readOnly && (
        <StepFooter>
          <Blocked reason={blocking.length ? `Selesaikan dulu: ${blocking.map((b) => b.text).join('; ')}.` : null}>
            <Button disabled={blocking.length > 0} onClick={() => { advance(props.run.id, 2); props.onGo(2) }}>
              Lanjut
            </Button>
          </Blocked>
        </StepFooter>
      )}
    </div>
  )
}
