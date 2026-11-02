import { useSyncExternalStore } from 'react'
import { ROSTER } from '@/data/employees'
import { notify } from '@/data/notifications'
import { maskRekening, saveSalary, salaryAt } from '@/data/payroll/salaries'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import type { DraftForm } from '@/data/employees'

/** Pengajuan perubahan data pribadi dari pegawai (aplikasi mobile); berlaku setelah diverifikasi HR Personalia. */
export type ChangeField = 'hp' | 'emailPribadi' | 'alamatDomisili' | 'pernikahan' | 'daruratNama' | 'daruratHubungan' | 'daruratHp' | 'bank' | 'rekening' | 'rekeningNama'
export type ProfileChange = {
  id: string
  nik: string
  perubahan: Partial<Record<ChangeField, string>>
  lampiran?: string
  alasan: string
  diajukan: string
  sumber: 'web' | 'aplikasi'
  status: 'menunggu-verifikasi' | 'disetujui' | 'ditolak'
  keputusan?: { by: string; at: string; alasan?: string }
}

export const FIELD_LABEL: Record<ChangeField, string> = {
  hp: 'No. HP',
  emailPribadi: 'Email pribadi',
  alamatDomisili: 'Alamat domisili',
  pernikahan: 'Status pernikahan',
  daruratNama: 'Kontak darurat · Nama',
  daruratHubungan: 'Kontak darurat · Hubungan',
  daruratHp: 'Kontak darurat · No. HP',
  bank: 'Bank',
  rekening: 'No. rekening',
  rekeningNama: 'Nama pemilik rekening',
}
/** Field rekening dikelompokkan jadi satu baris tersamar di UI. */
export const REKENING_FIELDS: ChangeField[] = ['bank', 'rekening']
export const isRekening = (f: ChangeField) => f === 'bank' || f === 'rekening' || f === 'rekeningNama'
/** Perubahan rekening berlaku mulai payroll November 2026 (setelah tanggal bayar Oktober, 31 Okt). */
export const REKENING_BERLAKU = '2026-11-01'
export const REKENING_BERLAKU_LABEL = 'payroll November 2026'

export const PCS: ProfileChange[] = []
let version = 0
const subs = new Set<() => void>()
export const usePcs = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => version)
const bump = () => { version++; subs.forEach((f) => f()) }

export const pendingChanges = () => PCS.filter((c) => c.status === 'menunggu-verifikasi')
export const pendingOf = (nik: string) => pendingChanges().filter((c) => c.nik === nik)
export const approvedOf = (nik: string) => PCS.filter((c) => c.nik === nik && c.status === 'disetujui')

const nameOf = (nik: string) => ROSTER.find((e) => e.nik === nik)?.nama ?? nik
let seq = 0
export function submitChange(input: Omit<ProfileChange, 'id' | 'status' | 'diajukan'> & { diajukan?: string }) {
  const c: ProfileChange = { ...input, id: `PDT-2026-${String(++seq).padStart(4, '0')}`, status: 'menunggu-verifikasi', diajukan: input.diajukan ?? DEMO_TODAY }
  PCS.unshift(c)
  notify({ to: 'hr_personalia', title: 'Perubahan data pribadi menunggu verifikasi', body: `${c.id} · ${nameOf(c.nik)} mengajukan perubahan ${changedLabels(c).join(', ')}.`, page: 'employees' })
  bump()
  return c
}

/** Nilai profil saat ini untuk field pengajuan (dari rekaman profil terkini). */
export function currentOf(form: DraftForm, f: ChangeField): string {
  if (f === 'emailPribadi') return form.email
  return String(form[f as keyof DraftForm] ?? '')
}
/** Label field yang berubah; field rekening digabung menjadi satu "Rekening". */
export function changedLabels(c: ProfileChange): string[] {
  const out: string[] = []
  for (const f of Object.keys(c.perubahan) as ChangeField[]) {
    const l = isRekening(f) ? 'Rekening' : FIELD_LABEL[f]
    if (!out.includes(l)) out.push(l)
  }
  return out
}
/** Format tampilan nomor HP: 0812-9034-5521. */
export const fmtHp = (v: string) => v.replace(/\D/g, '').replace(/^(\d{4})(\d{4})(\d+)$/, '$1-$2-$3')
export const hasRekening = (c: ProfileChange) => (Object.keys(c.perubahan) as ChangeField[]).some(isRekening)

/** Menerapkan perubahan ke form profil. `emailPribadi` dipetakan ke `email`. */
export function applyToForm(form: DraftForm, c: ProfileChange): DraftForm {
  const next = { ...form } as unknown as Record<string, string>
  for (const [f, v] of Object.entries(c.perubahan) as [ChangeField, string][]) next[f === 'emailPribadi' ? 'email' : f] = v
  return next as unknown as DraftForm
}

export function decideChange(id: string, approve: boolean, by: string, alasan?: string) {
  const c = PCS.find((x) => x.id === id)
  if (!c || c.status !== 'menunggu-verifikasi') return
  c.status = approve ? 'disetujui' : 'ditolak'
  c.keputusan = { by, at: `${formatDate(DEMO_TODAY)}`, alasan }
  if (approve && hasRekening(c)) {
    const e = ROSTER.find((x) => x.nik === c.nik)
    if (e) {
      const cur = salaryAt(e, REKENING_BERLAKU)
      const p = c.perubahan
      saveSalary(e, { ...cur, bank: p.bank ?? cur.bank, nomorRekening: p.rekening ?? cur.nomorRekening }, REKENING_BERLAKU, `${c.id}: perubahan rekening dari pegawai`, by)
    }
  }
  bump()
}

export const maskNew = (c: ProfileChange, bank: string, nomor: string) => maskRekening(c.perubahan.bank ?? bank, c.perubahan.rekening ?? nomor)

/* ---------- seed (sumber aplikasi) ---------- */
const RIZKY = 'PPI-2024-0112'
const WAHYU = 'PPI-2022-0045'
if (ROSTER.some((e) => e.nik === RIZKY) && ROSTER.some((e) => e.nik === WAHYU)) {
  submitChange({
    nik: RIZKY,
    perubahan: { hp: '081290345521', alamatDomisili: 'Jl. Melati No. 14 RT 03/RW 05, Cikupa, Tangerang' },
    alasan: 'Pindah kontrakan dan ganti nomor HP',
    sumber: 'aplikasi',
    diajukan: '2026-10-25',
  })
  submitChange({
    nik: WAHYU,
    perubahan: { bank: 'Mandiri', rekening: '1230045678' },
    lampiran: 'buku-tabungan-mandiri-wahyu.pdf',
    alasan: 'Pindah rekening gaji ke Mandiri',
    sumber: 'aplikasi',
    diajukan: '2026-10-26',
  })
}
