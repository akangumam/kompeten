import { can } from '@/lib/access'
import { BadgeCheck, Clock, FileText, Info, Paperclip, TriangleAlert, UserCheck, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AlasanField } from '@/components/koperasi/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { avg, DOC_DEFS, initials, reachedStage, type Candidate, type DocState } from '@/data/candidates'
import { ambangInterview } from '@/data/master/recruitment'
import { atasanDept, checkNik, docsComplete, failedTests, requiredDocs, testsPassed, verifyDoc } from '@/data/recruitment/flow'
import { jobOf } from '@/data/recruitment/jobs'
import { effOfferStatus, offerOf } from '@/data/recruitment/offers'
import { assignsOf, lulusOf, paketOf, type TestAssign } from '@/data/recruitment/tests'
import { useRecruitment } from '@/data/recruitment/store'
import { USERS, type CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { formatHp } from '@/lib/validators'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'
import { CloseDialog } from './close-dialog'
import { InterviewSection, ScheduleDialog, ScoreInputDialog } from './interview-parts'
import { OfferFormSheet, OfferLetterDialog, OfferResponseDialog, OfferReviewSheet, OfferSection, SendOfferDialog, submitOfferFlow } from './offer-parts'
import { GatedButton, Row, SHEET_RECRUIT, StageBadge } from './shared'
import { InviteTestDialog, ResendDialog, ScoreDialog, TestsSection } from './tests-parts'

export type CandidateActions = {
  onGenerate: (c: Candidate) => void
  onOpenDraft: (c: Candidate) => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {children}
      </section>
      <Separator />
    </>
  )
}

function DocsSection({ c, canAct, by }: { c: Candidate; canAct: boolean; by: string }) {
  const [reject, setReject] = useState<DocState | null>(null)
  const [alasan, setAlasan] = useState('')
  const [err, setErr] = useState('')
  return (
    <>
      <ul className="space-y-2">
        {DOC_DEFS.map((def) => {
          const d = c.docs.find((x) => x.key === def.key)
          return (
            <li key={def.key} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-3">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{def.label}{def.wajib && <span aria-hidden className="text-danger"> *</span>}</p>
                  <p className="truncate text-xs text-muted-foreground">{d ? d.file : 'Belum diunggah'}</p>
                </div>
                {!d ? (
                  <StatusBadge variant={def.wajib ? 'warning' : 'neutral'}>{def.wajib ? 'Belum diunggah' : 'Opsional'}</StatusBadge>
                ) : d.status === 'Terverifikasi' ? (
                  <StatusBadge variant="success"><BadgeCheck aria-hidden />Terverifikasi</StatusBadge>
                ) : d.status === 'Ditolak' ? (
                  <StatusBadge variant="danger"><XCircle aria-hidden />Ditolak</StatusBadge>
                ) : (
                  <StatusBadge variant="warning"><Clock aria-hidden />Menunggu Verifikasi</StatusBadge>
                )}
              </div>
              {d?.status === 'Ditolak' && d.alasan && <p className="text-xs text-danger">Alasan: {d.alasan}</p>}
              {canAct && d && d.status !== 'Terverifikasi' && c.stage === 'Seleksi Administrasi' && (
                <div className="flex justify-end gap-2">
                  {d.status === 'Menunggu Verifikasi' && <Button size="sm" variant="outline" onClick={() => { setAlasan(''); setErr(''); setReject(d) }}>Tolak</Button>}
                  <Button size="sm" onClick={() => { verifyDoc(c.id, d.key, 'Terverifikasi', '', by); toast.success(`${def.label} terverifikasi`) }}>Verifikasi</Button>
                </div>
              )}
              {canAct && d?.status === 'Terverifikasi' && c.stage === 'Seleksi Administrasi' && (
                <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => { setAlasan(''); setErr(''); setReject(d) }}>Tolak dokumen</Button></div>
              )}
            </li>
          )
        })}
      </ul>
      <AlertDialog open={!!reject} onOpenChange={(o) => !o && setReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak dokumen {reject ? DOC_DEFS.find((x) => x.key === reject.key)?.label : ''}?</AlertDialogTitle>
            <AlertDialogDescription>Alasan dicatat pada dokumen dan Riwayat Status.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlasanField id="dv-alasan" label="Alasan penolakan dokumen" value={alasan} onChange={(v) => { setAlasan(v); setErr('') }} error={err} />
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={(e) => {
              if (!validAlasan(alasan)) { e.preventDefault(); setErr(ALASAN_ERROR); return }
              if (reject) verifyDoc(c.id, reject.key, 'Ditolak', alasan.trim(), by)
              toast.success('Dokumen ditolak')
              setReject(null)
            }}>Tolak Dokumen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function CandidateSheet({ candidate, onClose, user, actions }: { candidate: Candidate | null; onClose: () => void; user: CurrentUser; actions: CandidateActions }) {
  useRecruitment()
  const c = candidate
  const admin = can(user, 'recruitment.manage')
  const manager = user.role === 'manager'
  const hr = admin || manager
  const spv = user.role === 'supervisor'
  const by = user.nama
  const [closeKind, setCloseKind] = useState<'Ditolak' | 'Batal' | null>(null)
  const [invite, setInvite] = useState(false)
  const [score, setScore] = useState<TestAssign | null>(null)
  const [resend, setResend] = useState<TestAssign | null>(null)
  const [sched, setSched] = useState<'start' | 'edit' | null>(null)
  const [who, setWho] = useState<'user' | 'hr' | null>(null)
  const [offerForm, setOfferForm] = useState<'create' | 'edit' | null>(null)
  const [letter, setLetter] = useState(false)
  const [respOpen, setRespOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [review, setReview] = useState(false)

  const job = c ? jobOf(c.lowonganId) : undefined
  const offer = c ? offerOf(c.offerId) : undefined
  const ostat = offer ? effOfferStatus(offer) : undefined
  const assigns = c ? assignsOf(c.id) : []
  const checks = c && hr ? checkNik(c.ktp, c.id) : []
  const mantan = checks.find((x) => x.kind === 'mantan')
  const failed = c ? failedTests(c) : []
  const done = c ? ['Diterima', 'Ditolak', 'Batal'].includes(c.stage) : true
  const myDept = spv ? atasanDept() : undefined
  // Nilai User diinput Atasan department peminta; bila pewawancara user bukan persona Atasan, HR Recruitment menginput atas namanya.
  const canUserScore = !!c && c.stage === 'Interview' && ((spv && c.dept === myDept) || (admin && c.interview?.userNik !== USERS.supervisor.nik))
  const a = c ? avg(c) : null
  const hist = c ? (spv ? c.history.filter((h) => h.stage || h.label.startsWith('Nilai')) : c.history) : []
  const showDocs = !!c && !spv
  const showTests = !!c && reachedStage(c, 'Tes')
  const showInterview = !!c && reachedStage(c, 'Interview')
  const showOffer = !!c && !!offer && reachedStage(c, 'Penawaran')

  const docOk = c ? requiredDocs.filter((d) => c.docs.find((x) => x.key === d.key)?.status === 'Terverifikasi').length : 0
  const reasonInvite = c && !docsComplete(c) ? `Semua dokumen wajib harus Terverifikasi (${docOk} dari ${requiredDocs.length}).` : false
  const reasonInterview = c
    ? assigns.length === 0 ? 'Belum ada paket tes yang diberikan.'
      : failed.length > 0 ? 'Ada paket tes di bawah passing grade atau tidak disarankan. Pertimbangkan Tolak.'
      : !testsPassed(c) ? 'Semua paket tes harus selesai dan lulus.' : false
    : false
  const reasonOffer = c && (c.userScore == null || c.hrScore == null) ? 'Nilai User dan Nilai HR harus terisi.' : false

  return (
    <Sheet open={c != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_RECRUIT}>
        {c && (
          <>
            <SheetHeader className="border-b p-6 pr-12">
              <div className="flex items-center gap-4">
                <Avatar className="size-12"><AvatarFallback className="bg-muted text-sm font-semibold text-foreground">{initials(c.nama)}</AvatarFallback></Avatar>
                <div className="min-w-0 space-y-1">
                  <SheetTitle className="text-lg font-semibold">{c.nama}</SheetTitle>
                  <SheetDescription className="tabular-nums">{c.id} · {job?.no ?? '—'}</SheetDescription>
                  <StageBadge stage={c.stage} />
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {hr && mantan?.kind === 'mantan' && (
                <Alert variant={mantan.rehire === 'Tidak' ? 'warning' : 'info'}>
                  {mantan.rehire === 'Tidak' ? <TriangleAlert /> : <Info />}
                  <AlertTitle>Mantan pegawai {mantan.nip}</AlertTitle>
                  <AlertDescription>Keluar {formatDate(mantan.keluar)} ({mantan.alasan}) · Eligible for Rehire: {mantan.rehire ?? '—'}{mantan.rehire === 'Tidak' ? '. Pertimbangkan sebelum melanjutkan proses.' : ''}</AlertDescription>
                </Alert>
              )}
              {hr && checks.filter((x) => x.kind === 'pernah').map((x) => x.kind === 'pernah' && (
                <Alert key={x.nomor} variant="warning"><TriangleAlert /><AlertDescription>NIK (KTP) ini juga dipakai pada lamaran {x.nomor} ({formatDate(x.tanggal)}).</AlertDescription></Alert>
              ))}

              <Section title="Data Lamaran">
                <dl className="space-y-2">
                  <Row label="Posisi">{c.posisi}</Row>
                  <Row label="Department">{c.dept}</Row>
                  <Row label="Lowongan">{job ? <span className="tabular-nums">{job.no}</span> : '—'}</Row>
                  <Row label="Sumber">{c.sumber}</Row>
                  <Row label="Tanggal Apply"><span className="tabular-nums">{formatDate(c.applyDate)}</span></Row>
                  <Row label="No. HP"><span className="tabular-nums">{formatHp(c.phone)}</span></Row>
                  <Row label="Email">{c.email}</Row>
                  {!spv && <Row label="NIK (KTP)"><span className="tabular-nums">{c.ktp}</span></Row>}
                  <Row label="Pendidikan">{c.pendidikan.map((p) => `${p.jenjang} ${p.jurusan} · ${p.institusi}`).join('; ') || '—'}</Row>
                  <Row label="Pengalaman">{c.belumBekerja || c.pengalaman.length === 0 ? 'Belum pernah bekerja' : c.pengalaman.map((p) => `${p.posisi} di ${p.perusahaan}`).join('; ')}</Row>
                </dl>
              </Section>

              {showDocs && <Section title="Dokumen"><DocsSection c={c} canAct={admin} by={by} /></Section>}

              {showTests && (
                <Section title="Tes">
                  {admin && failed.length > 0 && c.stage === 'Tes' && (
                    <Alert variant="warning">
                      <TriangleAlert />
                      <AlertTitle>Saran: Tolak kandidat</AlertTitle>
                      <AlertDescription>{failed.map((f) => `${paketOf(f.paketId)?.nama} ${f.rekomendasi ?? f.nilai} (${f.rekomendasi ? 'tidak disarankan' : `passing ${paketOf(f.paketId)?.passing}`})`).join('; ')}. Keputusan ada pada HR.</AlertDescription>
                    </Alert>
                  )}
                  <TestsSection list={assigns} canInput={admin && !done} onInput={setScore} onResend={setResend} />
                  {admin && c.stage === 'Tes' && <Button size="sm" variant="outline" onClick={() => setInvite(true)}>Tambah paket tes</Button>}
                </Section>
              )}

              {showInterview && (
                <Section title="Interview">
                  {hr && c.stage === 'Interview' && a !== null && a < ambangInterview() && (
                    <Alert variant="warning"><TriangleAlert /><AlertDescription>Rata-rata {a} di bawah ambang {ambangInterview()}. HR tetap dapat membuat penawaran dengan catatan.</AlertDescription></Alert>
                  )}
                  <InterviewSection c={c} internal={hr} canUserScore={canUserScore} canHrScore={admin && c.stage === 'Interview'} canEdit={admin && c.stage === 'Interview'} onUser={() => setWho('user')} onHr={() => setWho('hr')} onEdit={() => setSched('edit')} />
                </Section>
              )}

              {showOffer && offer && (
                <Section title="Penawaran">
                  <OfferSection offer={offer} showPay={hr} canEdit={admin} onEdit={() => setOfferForm('edit')} onPreview={() => setLetter(true)} />
                </Section>
              )}

              {c.stage === 'Ditolak' && c.rejectReason && <Section title="Alasan Penolakan"><p className="text-sm font-medium">{c.rejectReason}</p></Section>}
              {c.stage === 'Batal' && c.batalReason && <Section title="Alasan Pembatalan"><p className="text-sm font-medium">{c.batalReason}</p></Section>}

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Riwayat Status</h3>
                <ol className="ml-2 border-l">
                  {[...hist].reverse().map((h, i) => (
                    <li key={`${h.date}-${h.label}-${i}`} className="relative pb-4 pl-5 last:pb-0">
                      <span aria-hidden className={`absolute -left-[5px] top-1.5 size-2.5 rounded-full border-2 border-background ${i === 0 ? 'bg-chart-1' : 'bg-chart-2'}`} />
                      <p className="text-sm font-medium">{h.label}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{formatDate(h.date)} · {h.by}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            {(admin && !done) || (manager && ostat === 'Menunggu Approval') || (c.stage === 'Diterima' && admin) ? (
              <SheetFooter className="sticky bottom-0 gap-3 border-t bg-background p-4">
                {c.stage === 'Diterima' && c.draftCreatedAt && (
                  <Alert variant="info"><Info /><AlertDescription>Draft Pegawai sudah dibuat pada {formatDate(c.draftCreatedAt)}{c.salinPenawaran ? ` · disalin dari penawaran ${c.salinPenawaran}` : ''}</AlertDescription></Alert>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  {admin && !done && (
                    <>
                      <Button variant="outline" onClick={() => setCloseKind('Batal')}>Batal</Button>
                      <Button variant="destructive" onClick={() => setCloseKind('Ditolak')}>Tolak</Button>
                    </>
                  )}
                  {admin && c.stage === 'Seleksi Administrasi' && <GatedButton reason={reasonInvite} onClick={() => setInvite(true)}><Paperclip /> Undang Tes</GatedButton>}
                  {admin && c.stage === 'Tes' && <GatedButton reason={reasonInterview} onClick={() => setSched('start')}>Lanjut Interview</GatedButton>}
                  {admin && c.stage === 'Interview' && <GatedButton reason={reasonOffer} onClick={() => setOfferForm('create')}>Buat Penawaran</GatedButton>}
                  {admin && c.stage === 'Penawaran' && offer && ostat === 'Draft' && <Button onClick={() => submitOfferFlow(offer, by)}>Ajukan Penawaran</Button>}
                  {admin && c.stage === 'Penawaran' && offer && ostat === 'Menunggu Approval' && <GatedButton reason="Menunggu persetujuan HR & GA Manager." variant="outline">Menunggu Approval</GatedButton>}
                  {admin && c.stage === 'Penawaran' && offer && ostat === 'Disetujui' && <Button onClick={() => setSendOpen(true)}>Kirim ke Kandidat</Button>}
                  {admin && c.stage === 'Penawaran' && offer && ostat === 'Dikirim' && <Button onClick={() => setRespOpen(true)}>Catat Respons</Button>}
                  {admin && c.stage === 'Penawaran' && offer && ostat === 'Kedaluwarsa' && <Button onClick={() => setSendOpen(true)}>Kirim Ulang</Button>}
                  {manager && offer && ostat === 'Menunggu Approval' && <Button variant="outline" onClick={() => setReview(true)}>Tinjau Penawaran</Button>}
                  {admin && c.stage === 'Diterima' && (c.draftCreatedAt ? (
                    <Button variant="outline" onClick={() => actions.onOpenDraft(c)}>Buka Draft Pegawai</Button>
                  ) : (
                    <Button onClick={() => actions.onGenerate(c)}><UserCheck /> Generate Data Pegawai</Button>
                  ))}
                </div>
              </SheetFooter>
            ) : null}

            <CloseDialog cand={closeKind ? c : null} kind={closeKind ?? 'Ditolak'} by={by} onClose={() => setCloseKind(null)} />
            {invite && <InviteTestDialog key={`inv-${c.id}`} cand={c} assigned={assigns.filter((x) => x.status !== 'Selesai' || lulusOf(x)).map((x) => x.paketId)} onClose={() => setInvite(false)} by={by} />}
            {score && <ScoreDialog key={score.id} assign={score} onClose={() => setScore(null)} by={by} />}
            {resend && <ResendDialog assign={resend} onClose={() => setResend(null)} by={by} />}
            {sched && <ScheduleDialog key={`sch-${sched}`} cand={c} mode={sched} onClose={() => setSched(null)} by={by} />}
            {who && <ScoreInputDialog key={who} cand={c} who={who} onClose={() => setWho(null)} by={by} />}
            {offerForm && <OfferFormSheet key={offerForm} cand={c} offer={offerForm === 'edit' ? offer : undefined} onClose={() => setOfferForm(null)} by={by} />}
            <OfferLetterDialog offer={letter ? offer ?? null : null} cand={c} onClose={() => setLetter(false)} />
            {respOpen && offer && <OfferResponseDialog offer={offer} onClose={() => setRespOpen(false)} by={by} />}
            {offer && <SendOfferDialog offer={offer} open={sendOpen} onClose={() => setSendOpen(false)} by={by} />}
            {review && offer && <OfferReviewSheet offer={offer} cand={c} onClose={() => setReview(false)} by={by} />}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
