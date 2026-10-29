import { DEMO_TODAY } from '@/lib/today'
import { bump } from '@/data/recruitment/store'
import { ASSIGNS, assignOf, paketOf } from '@/data/recruitment/tests'
import { inputNilai } from '@/data/recruitment/flow'

export type ExamAnswer = { optionIdx: number | null; ragu: boolean }

export type ExamSession = {
  assignId: string
  questionOrder: string[]
  answers: Record<string, ExamAnswer>
  pageLeaveCount: number
  startedAt: number
  submitted: boolean
}

const STORAGE_PREFIX = 'kompeten-exam-'

function storageKey(assignId: string) { return `${STORAGE_PREFIX}${assignId}` }

export function loadExamSession(assignId: string): ExamSession | null {
  try {
    const raw = localStorage.getItem(storageKey(assignId))
    return raw ? (JSON.parse(raw) as ExamSession) : null
  } catch { return null }
}

export function saveExamSession(session: ExamSession) {
  try { localStorage.setItem(storageKey(session.assignId), JSON.stringify(session)) } catch {}
}

export function clearExamSession(assignId: string) {
  try { localStorage.removeItem(storageKey(assignId)) } catch {}
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr]
  let h = seed.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)
  for (let i = copy.length - 1; i > 0; i--) {
    h = ((h * 1664525) + 1013904223) | 0
    const j = Math.abs(h) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function startExam(assignId: string): ExamSession {
  const existing = loadExamSession(assignId)
  if (existing && !existing.submitted) return existing
  const a = assignOf(assignId)
  const paket = a ? paketOf(a.paketId) : null
  const soal = paket?.soal ?? []
  const ordered = paket?.acak ? seededShuffle(soal.map((s) => s.id), assignId) : soal.map((s) => s.id)
  const session: ExamSession = {
    assignId,
    questionOrder: ordered,
    answers: {},
    pageLeaveCount: 0,
    startedAt: Date.now(),
    submitted: false,
  }
  // Mark assignment as in-progress on HR side
  const assign = ASSIGNS.find((x) => x.id === assignId)
  if (assign && assign.status === 'Dijadwalkan') { assign.status = 'Sedang dikerjakan'; bump() }
  saveExamSession(session)
  return session
}

export function saveAnswer(session: ExamSession, soalId: string, answer: ExamAnswer) {
  session.answers[soalId] = answer
  saveExamSession(session)
}

export function recordPageLeave(session: ExamSession) {
  session.pageLeaveCount++
  saveExamSession(session)
}

export function submitExam(session: ExamSession): number {
  const a = assignOf(session.assignId)
  const paket = a ? paketOf(a.paketId) : null
  if (!paket) return 0
  let totalBobot = 0; let earned = 0
  for (const s of paket.soal) {
    totalBobot += s.bobot
    const ans = session.answers[s.id]
    if (ans && ans.optionIdx === s.kunci) earned += s.bobot
  }
  const score = totalBobot > 0 ? Math.round((earned / totalBobot) * 100) : 0
  inputNilai(session.assignId, { nilai: score, catatan: `Keluar halaman ${session.pageLeaveCount}×` }, 'Portal')
  if (a) { (a as { keluar?: number }).keluar = session.pageLeaveCount }
  session.submitted = true
  saveExamSession(session)
  clearExamSession(session.assignId)
  bump()
  return score
}
