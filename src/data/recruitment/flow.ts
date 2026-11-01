import { notify } from '@/data/notifications'
import { CANDIDATES, DOC_DEFS, avg, ageOn, candidateOf, type Candidate, type CandEdu, type DocKey, type DocStatus, type HistoryItem, type InterviewInfo, type Pengalaman, type Stage } from '@/data/candidates'
import { ROSTER } from '@/data/employees'
import { departmentNodes } from '@/data/master/organization'
import { ambangInterview } from '@/data/master/recruitment'
import { OFFS } from '@/data/offboarding'
import { exitedRecord, rosterRecord } from '@/data/profiles'
import { EXITED } from '@/data/profiles'
import { USERS } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { jobOf, openJobs, terisi } from './jobs'
import { OFFERS, effOfferStatus, newOffer, offerOf, type Offer, type OfferInput } from './offers'
import { ASSIGNS, assignOf, assignsOf, lulusOf, nextAssignId, paketOf, type Rekomendasi } from './tests'
import { bump } from './store'

const ev = (c: Candidate, label: string, by: string, stage?: Stage) => c.history.push({ date: DEMO_TODAY, label, by, stage } as HistoryItem)

/* ---------- cek NIK (KTP): hanya untuk HR ---------- */
let ktpIndex: Map<string, { nip: string; nama: string; aktif: boolean }> | undefined
function indexKtp() {
  if (ktpIndex) return ktpIndex
  ktpIndex = new Map()
  for (const e of ROSTER) {
    const r = rosterRecord(e.nik)
    if (r?.form.ktp) ktpIndex.set(r.form.ktp, { nip: e.nik, nama: e.nama, aktif: true })
  }
  for (const e of EXITED) {
    const r = exitedRecord(e.nik)
    if (r?.record.form.ktp) ktpIndex.set(r.record.form.ktp, { nip: e.nik, nama: e.nama, aktif: false })
  }
  return ktpIndex
}
/** KTP milik pegawai (aktif atau mantan) bila ada; dipakai pengujian dan bantuan demo. */
export const ktpOfNip = (nip: string) => rosterRecord(nip)?.form.ktp ?? exitedRecord(nip)?.record.form.ktp ?? ''

export type NikCheck =
  | { kind: 'aktif'; nip: string; nama: string }
  | { kind: 'mantan'; nip: string; nama: string; keluar: string; alasan: string; rehire: 'Ya' | 'Tidak' | undefined }
  | { kind: 'pernah'; nomor: string; tanggal: string; nama: string }
export function checkNik(ktp: string, excludeId?: string): NikCheck[] {
  if (ktp.length !== 16) return []
  const out: NikCheck[] = []
  const hit = indexKtp().get(ktp)
  if (hit?.aktif) out.push({ kind: 'aktif', nip: hit.nip, nama: hit.nama })
  if (hit && !hit.aktif) {
    const ex = EXITED.find((x) => x.nik === hit.nip)!
    const off = OFFS.find((o) => o.nik === hit.nip && o.status !== 'dibatalkan')
    out.push({ kind: 'mantan', nip: hit.nip, nama: hit.nama, keluar: ex.keluar.tanggal, alasan: ex.keluar.alasan, rehire: off?.interview?.rehire })
  }
  const sixAgo = (() => { const [y, m, d] = DEMO_TODAY.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1 - 6, d)); return t.toISOString().slice(0, 10) })()
  for (const c of CANDIDATES) if (c.ktp === ktp && c.id !== excludeId && c.applyDate >= sixAgo) out.push({ kind: 'pernah', nomor: c.id, tanggal: c.applyDate, nama: c.nama })
  return out
}

/* ---------- administrasi ---------- */
export const requiredDocs = DOC_DEFS.filter((d) => d.wajib)
export function docsComplete(c: Candidate) {
  return requiredDocs.every((d) => c.docs.find((x) => x.key === d.key)?.status === 'Terverifikasi')
}
export function verifyDoc(candId: string, key: DocKey, status: Exclude<DocStatus, 'Menunggu Verifikasi'>, alasan: string, by: string) {
  const c = candidateOf(candId)
  const d = c?.docs.find((x) => x.key === key)
  if (!c || !d) return
  d.status = status
  d.alasan = status === 'Ditolak' ? alasan : undefined
  d.oleh = by
  d.at = DEMO_TODAY
  const label = DOC_DEFS.find((x) => x.key === key)!.label
  ev(c, status === 'Terverifikasi' ? `${label} terverifikasi` : `${label} ditolak: ${alasan}`, by)
  if (docsComplete(c) && !c.history.some((h) => h.label === 'Dokumen terverifikasi lengkap')) ev(c, 'Dokumen terverifikasi lengkap', by)
  bump()
}

/* ---------- tes ---------- */
export function inviteTest(candId: string, paketIds: string[], jadwal: string, batas: string, by: string) {
  const c = candidateOf(candId)
  if (!c) return
  for (const pid of paketIds) {
    if (assignsOf(candId).some((a) => a.paketId === pid && a.status !== 'Selesai')) continue
    ASSIGNS.push({ id: nextAssignId(), kandidatId: candId, paketId: pid, jadwal, batas, status: 'Dijadwalkan', tautan: `https://tes.kompeten.id/${candId.toLowerCase()}/${pid.toLowerCase()}`, dikirimKe: c.email })
  }
  if (c.stage === 'Seleksi Administrasi') {
    c.stage = 'Tes'
    ev(c, `Undangan tes dikirim: ${paketIds.map((p) => paketOf(p)?.nama).join(', ')}`, by, 'Tes')
  } else ev(c, `Undangan tes tambahan: ${paketIds.map((p) => paketOf(p)?.nama).join(', ')}`, by)
  bump()
}
export function resendInvite(assignId: string, batas: string, by: string) {
  const a = assignOf(assignId)
  const c = a && candidateOf(a.kandidatId)
  if (!a || !c) return
  a.status = 'Dijadwalkan'
  a.jadwal = DEMO_TODAY
  a.batas = batas
  ev(c, `Undangan ${paketOf(a.paketId)?.nama} dikirim ulang (batas ${batas})`, by)
  bump()
}
export function inputNilai(assignId: string, v: { nilai?: number; rekomendasi?: Rekomendasi; laporan?: { name: string; size: number }; catatan?: string }, by: string) {
  const a = assignOf(assignId)
  const c = a && candidateOf(a.kandidatId)
  if (!a || !c) return
  Object.assign(a, { nilai: v.nilai, rekomendasi: v.rekomendasi, laporan: v.laporan ?? a.laporan, catatan: v.catatan, status: 'Selesai', diinput: { by, at: DEMO_TODAY, mode: 'manual' as const } })
  const p = paketOf(a.paketId)!
  ev(c, `Hasil ${p.nama} diinput: ${v.rekomendasi ?? v.nilai} (${lulusOf(a) ? 'lulus' : 'tidak lulus'})`, by)
  bump()
}
export const activeAssigns = (c: Candidate) => assignsOf(c.id)
export function testsPassed(c: Candidate) {
  const list = assignsOf(c.id)
  return list.length > 0 && list.every((a) => lulusOf(a) === true)
}
/** Tes yang sudah selesai tetapi tidak lulus: saran Tolak (keputusan tetap di HR). */
export const failedTests = (c: Candidate) => assignsOf(c.id).filter((a) => lulusOf(a) === false)

/* ---------- interview ---------- */
export function userInterviewerFor(dept: string): { nik: string; nama: string } {
  const sup = ROSTER.find((e) => e.nik === USERS.supervisor.nik)
  if (sup && sup.department === dept) return { nik: sup.nik, nama: sup.nama }
  const head = departmentNodes().find((d) => d.nama === dept)?.kepalaNik
  const e = ROSTER.find((x) => x.nik === head)
  return e ? { nik: e.nik, nama: e.nama } : { nik: '', nama: 'Atasan user' }
}
export const interviewerOptions = () => {
  const heads = new Set([USERS.supervisor.nik, ...departmentNodes().map((d) => d.kepalaNik)])
  return ROSTER.filter((e) => heads.has(e.nik)).map((e) => ({ nik: e.nik, nama: e.nama, sub: `${e.posisi} · ${e.department}` }))
}
export function startInterview(candId: string, info: InterviewInfo, by: string) {
  const c = candidateOf(candId)
  if (!c || c.stage !== 'Tes' || !testsPassed(c)) return
  c.stage = 'Interview'
  c.interview = info
  ev(c, `Lanjut interview: jadwal ${info.tanggal}, ${info.jam}`, by, 'Interview')
  bump()
}
export function saveInterviewInfo(candId: string, info: InterviewInfo, by: string) {
  const c = candidateOf(candId)
  if (!c) return
  c.interview = info
  ev(c, `Jadwal interview diubah: ${info.tanggal}, ${info.jam}`, by)
  bump()
}
export function saveScore(candId: string, who: 'user' | 'hr', score: number, catatan: string, by: string) {
  const c = candidateOf(candId)
  if (!c || c.stage !== 'Interview') return
  if (who === 'user') {
    c.userScore = score
    c.userCatatan = catatan
  } else {
    c.hrScore = score
    if (catatan) c.notes = catatan
  }
  ev(c, `Nilai ${who === 'user' ? 'User' : 'HR'} ${score} diinput`, by)
  bump()
}
export const belowAmbang = (c: Candidate) => {
  const a = avg(c)
  return a !== null && a < ambangInterview()
}

/* ---------- penawaran ---------- */
export function createOffer(candId: string, input: OfferInput, by: string, lanjutCatatan?: string): Offer | undefined {
  const c = candidateOf(candId)
  if (!c || c.stage !== 'Interview' || avg(c) === null) return
  if (belowAmbang(c) && !lanjutCatatan) return
  if (lanjutCatatan) c.lanjutCatatan = lanjutCatatan
  const o = newOffer(candId, input, by)
  c.offerId = o.id
  c.stage = 'Penawaran'
  ev(c, `Penawaran dibuat (Draft)${lanjutCatatan ? ` dengan catatan: ${lanjutCatatan}` : ''}`, by, 'Penawaran')
  bump()
  return o
}
export function offerSubmitted(candId: string, by: string, versi: number) {
  const c = candidateOf(candId)
  if (c) ev(c, `Penawaran versi ${versi} diajukan ke HR & GA Manager`, by)
}
export function offerApproved(candId: string, by: string) {
  const c = candidateOf(candId)
  if (c) ev(c, 'Penawaran disetujui', by)
}
export function offerReturned(candId: string, by: string, alasan: string) {
  const c = candidateOf(candId)
  if (c) ev(c, `Penawaran dikembalikan: ${alasan}`, by)
}
export function offerSent(candId: string, by: string, batas: string) {
  const c = candidateOf(candId)
  if (c) ev(c, `Penawaran dikirim ke kandidat (batas jawab ${formatDate(batas)})`, by)
}
export function acceptOffer(offerId: string, tanggal: string, file: { name: string; size: number }, by: string) {
  const o = offerOf(offerId)
  const c = o && candidateOf(o.kandidatId)
  if (!o || !c || effOfferStatus(o) !== 'Dikirim') return
  o.status = 'Diterima kandidat'
  o.respon = { jenis: 'Menerima', tanggal, by, file }
  o.riwayat.push({ at: tanggal, label: 'Kandidat menerima penawaran', by })
  c.stage = 'Diterima'
  ev(c, 'Kandidat menerima penawaran', by, 'Diterima')
  bump()
}
export function declineOffer(offerId: string, tanggal: string, alasan: string, by: string) {
  const o = offerOf(offerId)
  const c = o && candidateOf(o.kandidatId)
  if (!o || !c || effOfferStatus(o) !== 'Dikirim') return
  o.status = 'Ditolak kandidat'
  o.respon = { jenis: 'Menolak', tanggal, by, alasan }
  o.riwayat.push({ at: tanggal, label: `Kandidat menolak penawaran: ${alasan}`, by })
  c.stageSebelum = 'Penawaran'
  c.stage = 'Batal'
  c.batalReason = `Kandidat menolak penawaran: ${alasan}`
  ev(c, c.batalReason, by, 'Batal')
  bump()
}
export function negotiateOffer(offerId: string, tanggal: string, catatan: string, by: string) {
  const o = offerOf(offerId)
  const c = o && candidateOf(o.kandidatId)
  if (!o || !c || effOfferStatus(o) !== 'Dikirim') return
  o.respon = { jenis: 'Negosiasi', tanggal, by, alasan: catatan }
  o.riwayat.push({ at: tanggal, label: `Kandidat meminta negosiasi: ${catatan}`, by })
  o.versi += 1
  o.status = 'Draft'
  o.disetujui = undefined
  o.diajukan = undefined
  o.dikirim = undefined
  o.riwayat.push({ at: tanggal, label: `Penawaran kembali ke Draft (versi ${o.versi})`, by })
  ev(c, `Negosiasi: ${catatan}. Penawaran kembali ke Draft (versi ${o.versi})`, by)
  bump()
}

/* ---------- tolak / batal ---------- */
export function closeCandidate(candId: string, kind: 'Ditolak' | 'Batal', alasan: string, by: string) {
  const c = candidateOf(candId)
  if (!c || c.stage === 'Diterima' || c.stage === 'Ditolak' || c.stage === 'Batal') return
  c.stageSebelum = c.stage
  c.stage = kind
  if (kind === 'Ditolak') c.rejectReason = alasan
  else c.batalReason = alasan
  ev(c, `${kind}: ${alasan}`, by, kind)
  const o = offerOf(c.offerId)
  if (o && ['Draft', 'Menunggu Approval', 'Disetujui', 'Dikirim'].includes(o.status)) {
    o.status = 'Ditolak kandidat'
    o.riwayat.push({ at: DEMO_TODAY, label: `Penawaran dibatalkan karena kandidat ${kind === 'Ditolak' ? 'ditolak' : 'batal'}`, by })
  }
  bump()
}

/* ---------- Generate Data Pegawai ---------- */
export function markGenerated(candId: string) {
  const c = candidateOf(candId)
  if (!c || c.draftCreatedAt) return
  const o = offerOf(c.offerId)
  c.draftCreatedAt = DEMO_TODAY
  c.salinPenawaran = o?.olNo
  ev(c, 'Draft Pegawai dibuat', 'Okta Maulana')
  bump()
}

/* ---------- pengajuan lamaran (Form DICAP) ---------- */
export type Application = {
  lowonganId: string
  sumber: string
  nama: string
  ktp: string
  tempatLahir: string
  tanggalLahir: string
  gender: string
  pernikahan: string
  tanggungan: number
  alamatKtp: string
  alamatDomisili: string
  phone: string
  email: string
  darurat: { nama: string; hubungan: string; hp: string }
  pendidikan: CandEdu[]
  pengalaman: Pengalaman[]
  belumBekerja: boolean
  skills: string[]
  docs: { key: DocKey; file: string; size: number }[]
}
export const nextLamaranNo = () => `LMR-2026-${String(Math.max(...CANDIDATES.map((c) => Number(c.id.slice(-4)))) + 1).padStart(4, '0')}`
export function submitApplication(a: Application, by: string): Candidate | undefined {
  const job = jobOf(a.lowonganId)
  if (!job) return
  const c: Candidate = {
    id: nextLamaranNo(), nama: a.nama.trim(), posisi: job.posisi, dept: job.dept, lowonganId: job.no, sumber: a.sumber, applyDate: DEMO_TODAY, stage: 'Seleksi Administrasi',
    phone: a.phone, email: a.email, ktp: a.ktp, tempatLahir: a.tempatLahir, tanggalLahir: a.tanggalLahir, gender: a.gender, pernikahan: a.pernikahan, tanggungan: a.tanggungan,
    alamatKtp: a.alamatKtp, alamatDomisili: a.alamatDomisili, darurat: a.darurat, pendidikan: a.pendidikan, pengalaman: a.pengalaman, belumBekerja: a.belumBekerja, skills: a.skills,
    docs: a.docs.map((d) => ({ ...d, status: 'Menunggu Verifikasi' as DocStatus })),
    history: [{ date: DEMO_TODAY, label: `Lamaran diterima (${a.sumber}), diinput lewat Form DICAP`, by, stage: 'Seleksi Administrasi' }],
  }
  CANDIDATES.unshift(c)
  notify({ to: 'hr_recruitment', title: 'Lamaran masuk (DICAP)', body: `${c.nama} melamar ${c.posisi} (${c.id}).`, page: 'recruitment' })
  bump()
  return c
}

/* ---------- portal: unggah ulang dokumen ---------- */
export function portalReuploadDoc(candId: string, key: DocKey, file: { name: string; size: number }) {
  const c = candidateOf(candId)
  const d = c?.docs.find((x) => x.key === key)
  if (!c || !d || d.status !== 'Ditolak') return
  d.file = file.name
  d.size = file.size
  d.status = 'Menunggu Verifikasi'
  d.alasan = undefined
  d.oleh = undefined
  d.at = undefined
  ev(c, `${DOC_DEFS.find((x) => x.key === key)!.label} diunggah ulang oleh pelamar`, 'Pelamar')
  bump()
}

/* ---------- portal: permintaan hapus data ---------- */
export function portalRequestDelete(candId: string) {
  const c = candidateOf(candId)
  if (!c) return
  c.deleteRequest = { tanggal: DEMO_TODAY }
  ev(c, 'Pelamar mengajukan permintaan penghapusan data', 'Pelamar')
  bump()
}

/* ---------- portal: cek NIK untuk pelamar ---------- */
export type PortalNikWarning = 'active-employee' | 'already-applied'
export function portalCheckNik(ktp: string, lowonganId: string, excludeId?: string): { kind: PortalNikWarning; tanggal?: string } | null {
  const hits = checkNik(ktp, excludeId)
  for (const h of hits) {
    if (h.kind === 'aktif') return { kind: 'active-employee' }
    if (h.kind === 'pernah') {
      const c = candidateOf(h.nomor)
      if (c && c.lowonganId === lowonganId) return { kind: 'already-applied', tanggal: h.tanggal }
    }
  }
  return null
}

/* ---------- ruang lingkup Atasan ---------- */
/** Atasan melihat kandidat departmentnya sejak tahap Interview (termasuk yang kemudian ditolak/batal). */
export function visibleToAtasan(c: Candidate, dept: string | undefined) {
  if (!dept || c.dept !== dept) return false
  return ['Interview', 'Penawaran', 'Diterima'].includes(c.stage) || (['Ditolak', 'Batal'].includes(c.stage) && c.history.some((h) => h.stage === 'Interview'))
}
export const atasanDept = () => ROSTER.find((e) => e.nik === USERS.supervisor.nik)?.department

export { jobOf, openJobs, terisi, OFFERS, ageOn }
