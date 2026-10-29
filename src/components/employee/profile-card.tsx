import { BadgeCheck, Circle, CircleAlert, CircleCheck, Clock, FileEdit, UserX, type LucideIcon } from 'lucide-react'
import { initials, type Candidate } from '@/data/candidates'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/format'
import { acceptedDate } from '@/data/employees'

type Props = {
  /** Lamaran asal; kosong untuk pegawai roster dan draft "Input langsung". */
  candidate?: Candidate
  nama: string
  posisi: string
  statusKerja: string
  jenis?: string
  emptyCount: number
  /** Jumlah field Personal wajib yang masih kosong (hanya draft "Input langsung"). */
  personalEmpty?: number
  direct?: { createdAt: string }
  /** Pegawai yang sudah ada di roster: tampilkan ringkasan kepegawaian, bukan checklist aktivasi. */
  employee?: { nik: string; tanggalMasuk: string; masaKerja: string; atasan: string }
  exit?: { tanggal: string; alasan: string }
  activated: boolean
  onOpenApplication: () => void
}

function CheckRow({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: LucideIcon
  tone: 'success' | 'warning' | 'neutral'
  label: string
  value: string
}) {
  const color = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-muted-foreground'
  return (
    <li className="flex items-center gap-3 text-sm">
      <Icon className={`size-4 shrink-0 ${color}`} aria-hidden />
      <span className="flex-1">{label}</span>
      <span className={`text-right text-xs font-medium tabular-nums ${tone === 'neutral' ? 'text-muted-foreground' : color}`}>
        {value}
      </span>
    </li>
  )
}

function Row({ label, value, plain }: { label: string; value: string; plain?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right font-medium ${plain ? '' : 'tabular-nums'}`}>{value}</dd>
    </div>
  )
}

export function ProfileCard({ candidate: c, nama, posisi, statusKerja, jenis, emptyCount, personalEmpty = 0, direct, employee, exit, activated, onOpenApplication }: Props) {
  const placementDone = emptyCount === 0
  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar className="size-20">
            <AvatarFallback className="bg-muted text-xl font-semibold text-foreground">{initials(nama)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{nama || 'Pegawai baru'}</h2>
            <p className="text-sm text-muted-foreground">{posisi || c?.posisi || '—'}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {exit ? (
              <>
                <StatusBadge variant="neutral">
                  <UserX aria-hidden />
                  Nonaktif
                </StatusBadge>
                <StatusBadge variant="neutral">{exit.alasan}</StatusBadge>
              </>
            ) : activated ? (
              <>
                <StatusBadge variant="success">
                  <BadgeCheck aria-hidden />
                  Aktif
                </StatusBadge>
                {statusKerja && <StatusBadge variant="neutral">{statusKerja}</StatusBadge>}
                {jenis && <StatusBadge variant="neutral">{jenis}</StatusBadge>}
              </>
            ) : (
              <>
                <StatusBadge variant="neutral">
                  <FileEdit aria-hidden />
                  Draft
                </StatusBadge>
                <StatusBadge variant="warning">
                  <Clock aria-hidden />
                  Menunggu Verifikasi HRD
                </StatusBadge>
              </>
            )}
          </div>
        </div>

        {employee ? (
          <dl className="space-y-3 text-sm">
            <Row label="NIP" value={employee.nik} />
            <Row label="Tanggal Masuk" value={formatDate(employee.tanggalMasuk)} />
            {exit ? <Row label="Tanggal Keluar" value={formatDate(exit.tanggal)} /> : null}
            <Row label="Masa Kerja" value={employee.masaKerja} />
            <Row label="Atasan" value={employee.atasan} plain />
          </dl>
        ) : (
          <>
            <dl className="space-y-3 text-sm">
              {c ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Asal Rekrutmen</dt>
                    <dd className="flex flex-col items-end">
                      <span className="font-medium tabular-nums">{c.id}</span>
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onOpenApplication}>
                        Lihat lamaran
                      </Button>
                    </dd>
                  </div>
                  <Row label="Tanggal Diterima" value={formatDate(acceptedDate(c))} />
                  <Row label="Sumber" value={c.sumber} plain />
                </>
              ) : (
                <>
                  <Row label="Asal" value="Input langsung" plain />
                  <Row label="Tanggal Dibuat" value={formatDate(direct?.createdAt ?? '')} />
                </>
              )}
            </dl>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Kelengkapan Aktivasi</h3>
              <ul className="space-y-3">
                {c ? (
                  <>
                    <CheckRow icon={CircleCheck} tone="success" label="Data Personal" value="Dari lamaran" />
                    <CheckRow icon={CircleCheck} tone="success" label="Dokumen (CV, KTP, Ijazah)" value="3/3" />
                  </>
                ) : (
                  <CheckRow
                    icon={personalEmpty === 0 ? CircleCheck : CircleAlert}
                    tone={personalEmpty === 0 ? 'success' : 'warning'}
                    label="Data Personal"
                    value={personalEmpty === 0 ? 'Lengkap' : `${personalEmpty} kolom belum diisi`}
                  />
                )}
                <CheckRow
                  icon={placementDone ? CircleCheck : CircleAlert}
                  tone={placementDone ? 'success' : 'warning'}
                  label="Penempatan Kerja"
                  value={placementDone ? 'Lengkap' : `${emptyCount} kolom belum diisi`}
                />
                <CheckRow icon={Circle} tone="neutral" label="Rekening & Pajak" value="Opsional" />
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
