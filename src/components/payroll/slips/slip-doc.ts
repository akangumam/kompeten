import { billsFor, KOPERASI_LABEL, type BillPeriod } from '@/data/koperasi-deductions'
import { empOf } from '@/data/payroll/disbursement'
import { JKK_RATES, kesAt, pct, tkAt } from '@/data/payroll/statutory'
import { INS_DEFS, type PayPeriod, type PayRow } from '@/data/payroll/runs'
import { maskRekening, salaryAt } from '@/data/payroll/salaries'

export type Line = { label: string; amount: number }

/** Susunan isi slip dari satu baris run Final; angka diambil apa adanya dari baris, tidak dihitung ulang. */
export function slipDoc(r: PayRow, p: PayPeriod) {
  const emp = empOf(r.nik)
  const sal = salaryAt(emp, p.bayar)
  const kes = kesAt(p.bayar)
  const tk = tkAt(p.bayar)
  const tipe = (n: string) => INS_DEFS.find((d) => d.nama === n)?.tipe ?? 'pendapatan'

  const pendapatan: Line[] = [
    { label: r.upahHarian !== undefined ? `Upah Harian (${r.hadir} hari × Rp ${r.upahHarian.toLocaleString('id-ID')})` : 'Gaji Pokok', amount: r.gaji },
    { label: 'Tunjangan Jabatan', amount: r.tunjangan },
    { label: `Uang Makan (${r.hadir} hari)`, amount: r.makan },
    { label: `Uang Transport (${r.hadir} hari)`, amount: r.transport },
    { label: 'Lembur', amount: r.lembur },
    ...r.ins.filter((i) => tipe(i.komponen) === 'pendapatan').map((i) => ({ label: i.komponen, amount: i.nominal })),
    { label: 'Potongan Kehadiran (Alfa/Izin)', amount: -r.potHadir },
  ].filter((l) => l.amount !== 0)

  const kindOrder = ['kasbon', 'angsuran', 'simpananWajib', 'simpananSukarela', 'pinjamanNon']
  const bills = billsFor(p.id as BillPeriod)
    .filter((b) => b.nik === r.nik)
    .sort((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind))
  const potongan: Line[] = [
    { label: `BPJS Kesehatan ${pct(kes.pegawai)}`, amount: r.kesP },
    { label: `BPJS JHT ${pct(tk.jhtPegawai)}`, amount: r.jhtP },
    { label: `BPJS JP ${pct(tk.jpPegawai)}`, amount: r.jpP },
    { label: `PPh 21 (TER ${r.kategori} ${pct(r.tarif)})`, amount: r.pph },
    ...bills.flatMap((b) => [
      { label: KOPERASI_LABEL[b.kind], amount: b.jumlah },
      ...(b.admin ? [{ label: 'Biaya admin kasbon 5%', amount: b.admin }] : []),
    ]),
    ...r.ins.filter((i) => tipe(i.komponen) === 'potongan').map((i) => ({ label: i.komponen, amount: i.nominal })),
  ].filter((l) => l.amount !== 0)

  const company: Line[] = [
    { label: `BPJS Kesehatan ${pct(kes.perusahaan)}`, amount: r.kesCo },
    { label: `JHT ${pct(tk.jhtPerusahaan)}`, amount: r.jhtCo },
    { label: `JP ${pct(tk.jpPerusahaan)}`, amount: r.jpCo },
    { label: `JKK ${pct(JKK_RATES[tk.jkk])}`, amount: r.jkk },
    { label: `JKM ${pct(tk.jkm)}`, amount: r.jkm },
  ]
  return { emp, pendapatan, potongan, company, rekening: maskRekening(sal.bank, sal.nomorRekening) }
}
