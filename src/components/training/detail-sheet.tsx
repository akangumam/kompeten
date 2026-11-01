import { can } from '@/lib/access'
import { CircleCheck, Clock, FileText, Link2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CertLink, CertificateDialog, EnrBadge, TypeBadge, UjiBadge, VideoCard } from '@/components/training/shared'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import type { CurrentUser } from '@/data/users'
import { enrStatus, enrollmentOf, empOf, markDone, passingOf, progressOf, programOf, validateMaterial, type Material } from '@/data/training/store'
import { paketOf } from '@/data/recruitment/tests'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'

export const SHEET_720 = 'w-full gap-0 overflow-y-auto sm:max-w-[720px]'

export function DetailSheet({ target, user, onClose, onUji }: { target: { kode: string; nik: string } | null; user: CurrentUser; onClose: () => void; onUji: (kode: string, nik: string) => void }) {
  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={SHEET_720}>{target && <Body kode={target.kode} nik={target.nik} user={user} onUji={onUji} />}</SheetContent>
    </Sheet>
  )
}

function MaterialIcon({ m }: { m: Material }) {
  return m.kind === 'Dokumen PDF' ? <FileText className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />
}

function Body({ kode, nik, user, onUji }: { kode: string; nik: string; user: CurrentUser; onUji: (kode: string, nik: string) => void }) {
  const [cert, setCert] = useState<string | null>(null)
  const p = programOf(kode)
  const e = enrollmentOf(kode, nik)
  const emp = empOf(nik)
  if (!p || !e) return null
  const pr = progressOf(p, e)
  const admin = can(user, 'dev.manage')
  const paket = paketOf(p.paketId ?? '')
  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>{emp?.nama ?? nik}</SheetTitle>
        <SheetDescription>{p.kode} · {p.judul}</SheetDescription>
        <div className="flex flex-wrap items-center gap-2 pt-1"><TypeBadge tipe={p.tipe} /><EnrBadge status={enrStatus(p, e)} /><span className="text-xs tabular-nums text-muted-foreground">{nik} · {emp?.posisi}</span></div>
      </SheetHeader>

      <div className="space-y-6 p-4">
        <section aria-label="Materi" className="space-y-2">
          <h3 className="text-sm font-semibold">Materi</h3>
          {p.materi.length === 0 && <p className="text-sm text-muted-foreground">Program ini tidak punya materi mandiri{p.sesi.length ? '; kehadiran sesi tercatat di bawah.' : '.'}</p>}
          <ul className="divide-y rounded-md border">
            {p.materi.map((m) => {
              const mp = e.materi[m.id]
              const needs = m.wajib && m.kind !== 'Sesi tatap muka'
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    {m.kind === 'Video YouTube' ? <VideoCard judul={m.judul} url={m.url} /> : (
                      <div className="flex items-center gap-2 text-sm"><MaterialIcon m={m} /><span className="font-medium">{m.judul}</span><span className="truncate text-xs text-muted-foreground">{m.file?.name ?? m.url ?? m.kind}</span></div>
                    )}
                    <p className="text-xs text-muted-foreground">{m.kind}{m.wajib ? ' · wajib' : ' · opsional'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {mp?.status === 'tervalidasi' && <StatusBadge variant="success"><CircleCheck aria-hidden />Tervalidasi</StatusBadge>}
                    {mp?.status === 'selesai' && <StatusBadge variant="warning"><Clock aria-hidden />Selesai (menunggu validasi)</StatusBadge>}
                    {!mp && <StatusBadge variant="neutral">Belum</StatusBadge>}
                    {mp && <span className="text-xs tabular-nums text-muted-foreground">{formatDate(mp.selesai)}{mp.validasi && <> · divalidasi {mp.validasi.by}, {mp.validasi.at}</>}</span>}
                  </div>
                  {admin && needs && mp?.status === 'selesai' && (
                    <Button size="sm" onClick={() => { validateMaterial(kode, nik, m.id, user); toast.success(`${m.judul} divalidasi`) }}>Validasi</Button>
                  )}
                  {admin && needs && !mp && (
                    <Button size="sm" variant="outline" onClick={() => { markDone(kode, nik, m.id); toast.info(`${m.judul} ditandai selesai (simulasi)`) }}>Tandai selesai (simulasi)</Button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        {p.sesi.length > 0 && (
          <section aria-label="Kehadiran" className="space-y-2">
            <h3 className="text-sm font-semibold">Kehadiran sesi</h3>
            <ul className="divide-y rounded-md border">
              {p.sesi.map((s, i) => {
                const h = e.hadir[s.id]
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <span>Sesi {i + 1} · <span className="tabular-nums">{formatDate(s.tanggal)}, {s.mulai}–{s.selesai} WIB</span> · {s.lokasi}</span>
                    {h === 'hadir' ? <StatusBadge variant="success">Hadir</StatusBadge> : h === 'tidak' ? <StatusBadge variant="danger">Tidak hadir</StatusBadge> : <StatusBadge variant="neutral">{s.tanggal > DEMO_TODAY ? 'Belum berlangsung' : 'Belum dicatat'}</StatusBadge>}
                  </li>
                )
              })}
            </ul>
            <p className="text-xs text-muted-foreground tabular-nums">Kehadiran {pr.hadir}/{pr.sesiWajib} sesi wajib</p>
          </section>
        )}

        <section aria-label="Uji akhir" className="space-y-2">
          <h3 className="text-sm font-semibold">Uji akhir</h3>
          {pr.uji === 'tanpa' ? (
            <p className="text-sm text-muted-foreground">Program ini tanpa uji akhir. Selesai bila semua materi wajib Tervalidasi.</p>
          ) : (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{paket?.nama}</p>
                  <p className="text-xs text-muted-foreground">Passing grade {passingOf(p)}{paket?.durasi ? ` · ${paket.durasi} menit` : ''} · dikerjakan di aplikasi karyawan (Flutter)</p>
                </div>
                <UjiBadge pr={pr} />
              </div>
              {pr.uji === 'terkunci' && <p className="text-sm text-muted-foreground">{pr.lockReason}</p>}
              {e.uji.length > 0 && (
                <ul className="space-y-1 text-sm tabular-nums">
                  {e.uji.map((a, i) => <li key={i}>Percobaan {i + 1}: <b>{a.nilai}</b> ({a.lulus ? 'lulus' : 'tidak lulus'}) · {formatDate(a.tanggal)}{a.sumber === 'simulasi' ? ' · simulasi' : ''}</li>)}
                </ul>
              )}
              {admin && (pr.uji === 'terbuka' || pr.uji === 'tidak-lulus') && <Button variant="outline" size="sm" onClick={() => onUji(kode, nik)}>Input nilai uji (simulasi)</Button>}
            </div>
          )}
        </section>

        <section aria-label="Sertifikat" className="space-y-2">
          <h3 className="text-sm font-semibold">Sertifikat</h3>
          {e.sertifikat ? <CertLink no={e.sertifikat} onOpen={setCert} /> : <p className="text-sm text-muted-foreground">Terbit otomatis setelah lulus uji akhir.</p>}
        </section>
      </div>
      <CertificateDialog no={cert} onClose={() => setCert(null)} />
    </>
  )
}
