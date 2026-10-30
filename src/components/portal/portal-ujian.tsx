// cspell:disable
// cspell:disable
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Flag, Grid3x3, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { assignOf, paketOf } from '@/data/recruitment/tests'
import { tampilkanNilaiTes } from '@/data/master/recruitment'
import { loadExamSession, recordPageLeave, saveAnswer, startExam, submitExam, type ExamSession } from '@/data/portal/exam-state'
import { cn } from '@/lib/utils'

type Props = { assignId: string; onDone: () => void }


function formatTime(sec: number) {
  const m = Math.floor(sec / 60); const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function PortalUjian({ assignId, onDone }: Props) {
  const assign = assignOf(assignId)
  const paket = assign ? paketOf(assign.paketId) : null
  const [session, setSession] = useState<ExamSession>(() => startExam(assignId))
  const [current, setCurrent] = useState(0)
  const [navSheet, setNavSheet] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [doneScreen, setDoneScreen] = useState(false)
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const announced5 = useRef(false)
  const announced1 = useRef(false)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const durasi = paket?.durasi ?? 0
  const elapsed = Math.min(Math.floor((Date.now() - session.startedAt) / 1000), durasi * 60)
  const [remaining, setRemaining] = useState(() => Math.max(0, durasi * 60 - elapsed))

  const handleAutoSubmit = useCallback(() => {
    const saved = loadExamSession(assignId) ?? session
    const score = submitExam(saved)
    setFinalScore(score)
    setDoneScreen(true)
    toast.info('Waktu habis. Jawaban Anda telah dikumpulkan otomatis.')
  }, [assignId, session])

  useEffect(() => {
    if (durasi === 0) return
    const id = setInterval(() => {
      setRemaining((r) => {
        const next = Math.max(0, r - 1)
        if (next <= 300 && !announced5.current) { announced5.current = true; setAnnouncement('Sisa waktu 5 menit') }
        if (next <= 60 && !announced1.current) { announced1.current = true; setAnnouncement('Sisa waktu 1 menit') }
        if (next === 0) { clearInterval(id); handleAutoSubmit() }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [durasi, handleAutoSubmit])

  useEffect(() => {
    const onVis = () => { if (document.hidden) { setSession((s) => { const updated = { ...s, pageLeaveCount: s.pageLeaveCount + 1 }; recordPageLeave(updated); return updated }) } }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const pickOption = useCallback((soalId: string, idx: number) => {
    setSession((s) => {
      const prev = s.answers[soalId]
      const updated = { ...s, answers: { ...s.answers, [soalId]: { optionIdx: idx, ragu: prev?.ragu ?? false } } }
      saveAnswer(updated, soalId, updated.answers[soalId])
      return updated
    })
  }, [])

  const toggleRagu = useCallback((soalId: string) => {
    setSession((s) => {
      const prev = s.answers[soalId] ?? { optionIdx: null, ragu: false }
      const updated = { ...s, answers: { ...s.answers, [soalId]: { ...prev, ragu: !prev.ragu } } }
      saveAnswer(updated, soalId, updated.answers[soalId])
      return updated
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (doneScreen || confirmSubmit || navSheet) return
      const target = e.target as HTMLElement | null
      const isRadio = target?.getAttribute('role') === 'radio'
      if (!isRadio && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); setCurrent((c) => Math.max(0, c - 1)) }
        if (e.key === 'ArrowRight') { e.preventDefault(); setCurrent((c) => Math.min(session.questionOrder.length - 1, c + 1)) }
      }
      if (['1', '2', '3', '4'].includes(e.key)) {
        const soalId = session.questionOrder[current]
        const idx = Number(e.key) - 1
        pickOption(soalId, idx)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, session, doneScreen, confirmSubmit, navSheet, pickOption])

  const handleManualSubmit = () => {
    const score = submitExam(session)
    setFinalScore(score)
    setDoneScreen(true)
  }

  const soalId = session.questionOrder[current]
  const soal = paket?.soal.find((s) => s.id === soalId)
  const answer = soalId ? (session.answers[soalId] ?? { optionIdx: null, ragu: false }) : { optionIdx: null, ragu: false }
  const total = session.questionOrder.length
  const answered = Object.values(session.answers).filter((a) => a.optionIdx !== null).length
  const raguCount = Object.values(session.answers).filter((a) => a.ragu).length
  const unanswered = total - answered

  const timerClass = remaining <= 60 ? 'text-danger font-bold' : remaining <= 300 ? 'text-warning font-semibold' : 'text-foreground font-semibold'

  const handleOptionKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (!soal) return
    const count = soal.opsi.length
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      const nextIdx = (idx + 1) % count
      pickOption(soalId, nextIdx)
      optionRefs.current[nextIdx]?.focus()
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const prevIdx = (idx - 1 + count) % count
      pickOption(soalId, prevIdx)
      optionRefs.current[prevIdx]?.focus()
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      pickOption(soalId, idx)
    }
  }

  if (doneScreen) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
        <div role="status" aria-live="polite" className="sr-only">{announcement}</div>
        <CheckCircle2 className="size-16 text-success" />
        <h2 className="text-2xl font-semibold">Tes Selesai</h2>
        <p className="max-w-sm text-muted-foreground">
          {tampilkanNilaiTes() === 'Ya' && finalScore !== null
            ? `Skor Anda: ${finalScore}. Hasil akan dikonfirmasi oleh HRD.`
            : 'Hasil akan diinformasikan oleh HRD.'}
        </p>
        <Button className="h-12 w-full max-w-xs" onClick={onDone}>Kembali ke Daftar Tes</Button>
      </main>
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div role="status" aria-live="polite" className="sr-only">{announcement}</div>

      {/* Sticky header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 shadow-sm">
        <span className="max-w-[60%] truncate text-sm font-medium">{paket?.nama}</span>
        <span className={cn('tabular-nums text-base', timerClass)}>
          {durasi > 0 ? formatTime(remaining) : '∞'}
        </span>
      </header>

      {/* Progress */}
      <div className="h-1 bg-muted">
        <div className="h-1 bg-primary transition-all" style={{ width: `${((current + 1) / total) * 100}%` }} />
      </div>

      {/* Question */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Soal {current + 1} dari {total}</span>
          {answer.ragu && <span className="inline-flex items-center gap-1 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning"><HelpCircle className="size-3" />Ragu-ragu</span>}
        </div>

        {soal ? (
          <>
            <p id={`soal-text-${soal.id}`} className="mb-6 text-base font-medium leading-relaxed">{soal.tanya}</p>
            <div
              role="radiogroup"
              aria-labelledby={`soal-text-${soal.id}`}
              className="space-y-3"
            >
              {soal.opsi.map((opsi, idx) => {
                const sel = answer.optionIdx === idx
                const isTabTarget = sel || (answer.optionIdx === null && idx === 0)
                return (
                  <button
                    key={idx}
                    ref={(el) => { optionRefs.current[idx] = el }}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    tabIndex={isTabTarget ? 0 : -1}
                    className={cn(
                      'flex min-h-12 w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      sel ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary font-medium' : 'border-border bg-background hover:bg-accent',
                    )}
                    onClick={() => pickOption(soalId, idx)}
                    onKeyDown={(e) => handleOptionKeyDown(e, idx)}
                  >
                    <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold', sel ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground')}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opsi}</span>
                  </button>
                )
              })}
            </div>

            <Button
              variant="outline"
              className={cn('mt-6 h-12 gap-2 text-sm', answer.ragu ? 'border-warning text-warning bg-warning/5' : '')}
              onClick={() => toggleRagu(soalId)}
            >
              <Flag className="size-4" />
              {answer.ragu ? 'Batalkan Ragu-ragu' : 'Tandai Ragu-ragu'}
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground">Soal tidak ditemukan.</p>
        )}
      </main>

      {/* Bottom bar */}
      <div className="sticky bottom-0 border-t bg-background px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} aria-label="Soal sebelumnya">
            <ArrowLeft className="size-5" />
          </Button>
          <Button variant="outline" className="h-12 flex-1 gap-2 text-sm font-medium" onClick={() => setNavSheet(true)}>
            <Grid3x3 className="size-4" />
            {current + 1} / {total}
          </Button>
          {current < total - 1 ? (
            <Button variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))} aria-label="Soal berikutnya">
              <ArrowRight className="size-5" />
            </Button>
          ) : (
            <Button size="icon" className="h-12 w-12 shrink-0" onClick={() => setConfirmSubmit(true)} aria-label="Kumpulkan jawaban">
              <CheckCircle2 className="size-5" />
            </Button>
          )}
        </div>
        {current === total - 1 && (
          <Button className="mt-3 h-12 w-full gap-2 text-sm font-semibold" onClick={() => setConfirmSubmit(true)}>
            <CheckCircle2 className="size-4" />
            Kumpulkan Jawaban
          </Button>
        )}
      </div>

      {/* Question navigator sheet */}
      <Sheet open={navSheet} onOpenChange={setNavSheet}>
        <SheetContent side="bottom" className="max-h-[85vh] flex flex-col p-4 sm:p-6">
          <SheetHeader className="pb-2">
            <SheetTitle>Navigasi Soal</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-2">
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 sm:gap-3">
              {session.questionOrder.map((qId, i) => {
                const ans = session.answers[qId]
                const isAnswered = ans?.optionIdx !== null
                const isRagu = ans?.ragu
                const isCurrent = i === current
                return (
                  <button
                    key={qId}
                    type="button"
                    onClick={() => { setCurrent(i); setNavSheet(false) }}
                    className={cn(
                      'flex h-12 w-full items-center justify-center rounded-md border text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                      isCurrent ? 'border-primary bg-primary text-primary-foreground font-bold' : isRagu ? 'border-warning bg-warning/10 text-warning font-semibold' : isAnswered ? 'border-success bg-success/10 text-success' : 'border-border bg-background text-muted-foreground hover:bg-muted/50',
                    )}
                    aria-current={isCurrent ? 'true' : undefined}
                    aria-label={`Soal ${i + 1}${isAnswered ? ', dijawab' : ', belum dijawab'}${isRagu ? ', ragu-ragu' : ''}`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 border-t pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-3 rounded border border-success bg-success/15" /> Dijawab ({answered})</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded border border-warning bg-warning/15" /> Ragu ({raguCount})</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded border border-border" /> Belum ({unanswered})</span>
          </div>
          <div className="pt-3">
            <Button
              className="h-12 w-full gap-2 text-sm font-semibold"
              onClick={() => {
                setNavSheet(false)
                setConfirmSubmit(true)
              }}
            >
              <CheckCircle2 className="size-4" />
              Kumpulkan Jawaban
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Submit confirmation */}
      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kumpulkan Jawaban?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-sm">
                {unanswered > 0 && <p className="font-medium text-warning">Belum dijawab: {unanswered} soal</p>}
                {raguCount > 0 && <p className="text-muted-foreground">Ragu-ragu: {raguCount} soal</p>}
                {unanswered === 0 && raguCount === 0 && <p>Semua {total} soal sudah dijawab.</p>}
                <p className="pt-1 text-xs text-muted-foreground">Jawaban tidak dapat diubah setelah dikumpulkan.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Periksa Lagi</AlertDialogCancel>
            <AlertDialogAction className="h-12" onClick={() => { setConfirmSubmit(false); handleManualSubmit() }}>Kumpulkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
