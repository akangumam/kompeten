import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/ui/status-badge'
import { idr } from '@/components/payroll/run/shared'
import type { PageId } from '@/App'
import type { PayRow, Run } from '@/data/payroll/runs'
import { setCheck } from '@/data/payroll/runs'

function L({ label, value, strong, muted, minus }: { label: string; value: number | string; strong?: boolean; muted?: boolean; minus?: boolean }) {
  const v = typeof value === 'number' ? `${minus && value ? '−' : ''}${idr(value)}` : value
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className={muted ? 'text-muted-foreground' : strong ? 'font-semibold' : ''}>{label}</dt>
      <dd className={`tabular-nums ${strong ? 'font-semibold' : ''}`}>{v}</dd>
    </div>
  )
}

/** Rincian Gaji satu pegawai: pendapatan, potongan, beban perusahaan (info), dan hitungan PPh 21. */
export function DetailSheet({ row, run, canCheck, onClose, onNavigate }: { row: PayRow; run: Run; canCheck: boolean; onClose: () => void; onNavigate: (p: PageId) => void }) {
  const chk = run.checks[row.nik]
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>Rincian Gaji · {row.nama}</SheetTitle>
          <SheetDescription className="tabular-nums">{row.nik} · {row.department} · {row.posisi}</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground tabular-nums">
            <span>Hari hadir {row.hadir} dari {row.hariKerja}</span>
            {row.alfa > 0 && <StatusBadge variant="warning">Alfa {row.alfa}</StatusBadge>}
            {row.izin > 0 && <StatusBadge variant="warning">Izin {row.izin}</StatusBadge>}
            {!row.rekeningAda && <StatusBadge variant="warning">Rekening belum ada</StatusBadge>}
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Pendapatan</h3>
            <dl className="space-y-1.5">
              {row.upahHarian !== undefined ? (
                <L label={`Upah Harian (${idr(row.upahHarian)} × ${row.hadir} hari hadir)`} value={row.gaji} />
              ) : (
                <>
                  <L label="Gaji Pokok" value={row.gaji} />
                  <L label="Tunjangan Jabatan" value={row.tunjangan} />
                  {row.potHadir > 0 && <L label={`Potongan Kehadiran (Alfa ${row.alfa} + Izin ${row.izin})`} value={row.potHadir} minus />}
                  <L label={`Uang Makan + Transport (${row.hadir} hari)`} value={row.makan + row.transport} />
                </>
              )}
              {row.lembur > 0 && <L label="Lembur (tervalidasi)" value={row.lembur} />}
              {row.ins.filter((i) => i.komponen !== 'Potongan Lain').map((i) => <L key={i.id} label={`${i.komponen}${i.ket ? ` · ${i.ket}` : ''}`} value={i.nominal} />)}
              <Separator />
              <L label="Pendapatan" value={row.pendapatan} strong />
            </dl>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Potongan</h3>
            <dl className="space-y-1.5">
              {row.vendor ? (
                <p className="text-sm text-muted-foreground">Dibayar ke vendor. BPJS, PPh 21, dan slip diurus vendor, sehingga tidak ada potongan BPJS, PPh 21, atau Koperasi dari perusahaan.</p>
              ) : (
                <>
                  <L label="BPJS Kesehatan pegawai" value={row.kesP} minus />
                  <L label="BPJS JHT pegawai" value={row.jhtP} minus />
                  <L label="BPJS JP pegawai" value={row.jpP} minus />
                  <L label={`PPh 21 (${row.upahHarian !== undefined ? 'pegawai harian' : 'TER'} ${row.kategori} · ${String(row.tarif).replace('.', ',')}%)`} value={row.pph} minus />
                </>
              )}
              {row.koperasi.map((k) => <L key={k.label} label={k.label} value={k.jumlah} minus />)}
              {row.ins.filter((i) => i.komponen === 'Potongan Lain').map((i) => <L key={i.id} label={`${i.komponen}${i.ket ? ` · ${i.ket}` : ''}`} value={i.nominal} minus />)}
              <Separator />
              <L label="Total potongan" value={row.potongan} strong />
            </dl>
          </section>

          <div className="flex items-baseline justify-between gap-4 rounded-lg border bg-muted/50 p-4">
            <span className="text-sm font-semibold">{row.vendor ? 'Neto (disetor ke vendor)' : 'Neto (transfer)'}</span>
            <span className="text-xl font-bold tabular-nums tracking-tight">{idr(row.neto)}</span>
          </div>

          {!row.vendor && (<>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Perhitungan PPh 21</h3>
            <dl className="space-y-1.5">
              <L label="Pendapatan" value={row.pendapatan} muted />
              <L label={`+ BPJS Kesehatan perusahaan`} value={row.kesCo} muted />
              <L label={`+ JKK (${row.jkkLabel})`} value={row.jkk} muted />
              <L label="+ JKM" value={row.jkm} muted />
              <L label="Penghasilan bruto" value={row.bruto} strong />
              <L label="Kategori · tarif TER" value={`${row.kategori} · ${String(row.tarif).replace('.', ',')}% (${row.ptkp})`} />
              <L label="PPh 21 (dibulatkan ke bawah)" value={row.pph} />
            </dl>
            {row.beyond && <p className="text-xs text-warning">Bruto di atas batas tabel TER yang dimuat; tarif bracket terakhir dipakai.</p>}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Beban perusahaan (info, tidak memotong gaji)</h3>
            <dl className="space-y-1.5">
              <L label="BPJS Kesehatan" value={row.kesCo} muted />
              <L label="JHT" value={row.jhtCo} muted />
              <L label="JP" value={row.jpCo} muted />
              <L label="JKK" value={row.jkk} muted />
              <L label="JKM" value={row.jkm} muted />
              <L label="Total beban BPJS perusahaan" value={row.bebanCo} strong />
            </dl>
          </section>
          </>)}

          {row.flagged && (
            <section className="space-y-2 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Baris ditandai: {row.reasons.join(' · ')}</h3>
              {canCheck ? (
                <>
                  <div className="flex items-center gap-2">
                    <Checkbox id={`dc-${row.nik}`} checked={!!chk?.checked} onCheckedChange={(v) => setCheck(run.id, row.nik, v === true)} />
                    <Label htmlFor={`dc-${row.nik}`}>Sudah dicek</Label>
                  </div>
                  <Textarea aria-label="Catatan pengecekan" placeholder="Catatan (opsional)" value={chk?.note ?? ''} onChange={(e) => setCheck(run.id, row.nik, !!chk?.checked, e.target.value)} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{chk?.checked ? `Sudah dicek${chk.note ? `: ${chk.note}` : ''}` : 'Belum dicek'}</p>
              )}
            </section>
          )}

          <section className="space-y-1">
            <h3 className="text-sm font-semibold">Sumber data</h3>
            <div className="flex flex-wrap gap-x-4">
              <Button variant="link" className="h-auto p-0" onClick={() => onNavigate('attendance')}>Absensi</Button>
              <Button variant="link" className="h-auto p-0" onClick={() => onNavigate('overtime')}>Overtime</Button>
              <Button variant="link" className="h-auto p-0" onClick={() => onNavigate('payroll-components')}>Komponen Gaji</Button>
              <span className="text-sm text-muted-foreground">Koperasi (data contoh)</span>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
