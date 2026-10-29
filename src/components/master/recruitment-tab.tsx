import { Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/employee/field'
import { AlasanField } from '@/components/koperasi/shared'
import { BerlakuField, EditSheet, MasterCard, type TabProps } from '@/components/master/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CANDIDATES } from '@/data/candidates'
import { nextPeriodStart } from '@/data/master/attendance-rules'
import { addAudit } from '@/data/master/audit-log'
import { AMBANG_INTERVIEW, MASA_PENAWARAN, MASA_SIMPAN_PELAMAR, SUMBER_LAMARAN, TAMPILKAN_NILAI_TES, ambangInterview, masaPenawaran, masaSimpanPelamar, saveRekrut, sumberLamaran, tampilkanNilaiTes } from '@/data/master/recruitment'
import { bump, useMaster } from '@/data/master/store'
import { JOBS } from '@/data/recruitment/jobs'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'

const head = 'text-xs font-medium text-muted-foreground'
type Key = 'ambang' | 'masa' | 'sumber' | 'simpan' | 'nilai'

export function RecruitmentTab({ canEdit, onHistory }: TabProps) {
  useMaster()
  const [ed, setEd] = useState<Key | null>(null)
  const used = (s: string) => CANDIDATES.filter((c) => c.sumber === s).length + JOBS.filter((j) => j.sumber.includes(s)).length
  const cards: { key: Key; title: string; desc: string; now: string; sub: string; list: { berlakuMulai: string; text: string; oleh?: string; alasan?: string }[] }[] = [
    { key: 'ambang', title: 'Ambang nilai interview', desc: 'Rata-rata Nilai User dan Nilai HR minimal untuk membuat penawaran', now: String(ambangInterview()), sub: 'dari 100', list: AMBANG_INTERVIEW.map((h) => ({ ...h, text: String(h.value) })) },
    { key: 'masa', title: 'Masa berlaku penawaran', desc: 'Batas jawab kandidat sejak penawaran dikirim', now: `${masaPenawaran()} hari`, sub: 'sejak dikirim', list: MASA_PENAWARAN.map((h) => ({ ...h, text: `${h.value} hari` })) },
    { key: 'simpan', title: 'Masa simpan data pelamar', desc: 'Lama data pelamar yang tidak lolos disimpan sebelum dianonimkan (UU PDP No. 27/2022)', now: `${masaSimpanPelamar()} bulan`, sub: 'sejak tanggal lamaran', list: MASA_SIMPAN_PELAMAR.map((h) => ({ ...h, text: `${h.value} bulan` })) },
    { key: 'nilai', title: 'Tampilkan nilai tes ke pelamar', desc: 'Jika Ya, Portal Pelamar menampilkan skor tes online setelah selesai', now: tampilkanNilaiTes(), sub: '', list: TAMPILKAN_NILAI_TES.map((h) => ({ ...h, text: String(h.value) })) },
  ]
  const sum = sumberLamaran()
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {cards.map((c) => (
          <MasterCard
            key={c.key}
            title={c.title}
            description={c.desc}
            action={<div className="flex gap-1">{canEdit && <Button variant="outline" size="sm" onClick={() => setEd(c.key)}><Pencil /> Edit</Button>}<Button variant="ghost" size="sm" onClick={() => onHistory(c.title)}>Riwayat</Button></div>}
          >
            <p className="text-3xl font-bold tabular-nums tracking-tight">{c.now} <span className="text-sm font-normal text-muted-foreground">{c.sub}</span></p>
            <History list={c.list} />
          </MasterCard>
        ))}
      </div>
      <MasterCard
        title="Sumber lamaran"
        description="Pilihan sumber pada Form DICAP dan Lowongan"
        action={<div className="flex gap-1">{canEdit && <Button variant="outline" size="sm" onClick={() => setEd('sumber')}><Pencil /> Edit</Button>}<Button variant="ghost" size="sm" onClick={() => onHistory('Sumber lamaran')}>Riwayat</Button></div>}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent"><TableHead className={head}>Sumber</TableHead><TableHead className={`text-right ${head}`}>Dipakai</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {sum.map((s) => (
                <TableRow key={s} className="h-12 hover:bg-muted/50">
                  <TableCell className="font-medium">{s}</TableCell>
                  <TableCell className="text-right tabular-nums">{used(s) === 0 ? 'Belum dipakai' : `${used(s)} data`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <History list={SUMBER_LAMARAN.map((h) => ({ ...h, text: h.value.join(', ') }))} />
      </MasterCard>
      {ed && <RekrutSheet kind={ed} onClose={() => setEd(null)} used={used} />}
    </div>
  )
}

function History({ list }: { list: { berlakuMulai: string; text: string; oleh?: string; alasan?: string }[] }) {
  return (
    <ul className="divide-y rounded-md border text-sm">
      {[...list].sort((a, b) => b.berlakuMulai.localeCompare(a.berlakuMulai)).map((h) => (
        <li key={h.berlakuMulai} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <span className="min-w-0 truncate font-medium">{h.text}</span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {h.berlakuMulai > DEMO_TODAY && <StatusBadge variant="info">Terjadwal</StatusBadge>}
            <span className="tabular-nums">Berlaku {formatDate(h.berlakuMulai)}</span>
            {h.oleh && <span>· {h.oleh}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function RekrutSheet({ kind, onClose, used }: { kind: Key; onClose: () => void; used: (s: string) => number }) {
  const initNum = kind === 'ambang' ? String(ambangInterview()) : kind === 'masa' ? String(masaPenawaran()) : kind === 'simpan' ? String(masaSimpanPelamar()) : '0'
  const [num, setNum] = useState(initNum)
  const [nilaiOpt, setNilaiOpt] = useState<'Ya' | 'Tidak'>(tampilkanNilaiTes())
  const [list, setList] = useState<string[]>(sumberLamaran())
  const [baru, setBaru] = useState('')
  const [berlaku, setBerlaku] = useState(nextPeriodStart())
  const [alasan, setAlasan] = useState('')
  const [sub, setSub] = useState(false)
  const TITLES: Record<Key, string> = { ambang: 'Ambang nilai interview', masa: 'Masa berlaku penawaran', sumber: 'Sumber lamaran', simpan: 'Masa simpan data pelamar', nilai: 'Tampilkan nilai tes ke pelamar' }
  const title = TITLES[kind]
  const eN = (kind === 'ambang' || kind === 'masa' || kind === 'simpan') && (num === '' || Number(num) < 1 || (kind === 'ambang' && Number(num) > 100) || (kind === 'masa' && Number(num) > 30) || (kind === 'simpan' && Number(num) > 60)) ? (kind === 'ambang' ? 'Isi nilai 1–100' : kind === 'masa' ? 'Isi 1–30 hari' : 'Isi 1–60 bulan') : undefined
  const eL = kind === 'sumber' && list.length === 0 ? 'Minimal satu sumber' : undefined
  const eD = !berlaku ? 'Berlaku mulai wajib diisi' : undefined
  const eA = !validAlasan(alasan) ? ALASAN_ERROR : undefined
  const add = () => {
    const v = baru.trim()
    if (v && !list.some((x) => x.toLowerCase() === v.toLowerCase())) setList([...list, v])
    setBaru('')
  }
  return (
    <EditSheet
      title={`Edit ${title}`}
      description="Lowongan dan penawaran yang sudah berjalan tetap memakai nilai lama sampai tanggal berlaku."
      onClose={onClose}
      onSave={() => {
        setSub(true)
        if (eN || eL || eD || eA) return
        if (kind === 'sumber') {
          saveRekrut('sumber', list, berlaku, alasan.trim())
          addAudit({ group: 'Rekrutmen', entitas: title, perubahan: `${sumberLamaran(berlaku).length} → ${list.length} sumber`, berlaku })
        } else if (kind === 'nilai') {
          saveRekrut('nilai', nilaiOpt, berlaku, alasan.trim())
          addAudit({ group: 'Rekrutmen', entitas: title, perubahan: `${tampilkanNilaiTes(berlaku)} → ${nilaiOpt}`, berlaku })
        } else {
          const before = kind === 'ambang' ? ambangInterview(berlaku) : kind === 'masa' ? masaPenawaran(berlaku) : masaSimpanPelamar(berlaku)
          saveRekrut(kind, Number(num), berlaku, alasan.trim())
          addAudit({ group: 'Rekrutmen', entitas: title, perubahan: `${before} → ${num}${kind === 'masa' ? ' hari' : ' bulan'}`, berlaku })
        }
        bump()
        toast.success(`${title} diperbarui`)
        onClose()
      }}
    >
      {kind === 'nilai' ? (
        <Field id="rk-nilai" label="Tampilkan nilai tes" required>
          <Select value={nilaiOpt} onValueChange={(v) => setNilaiOpt(v as 'Ya' | 'Tidak')}>
            <SelectTrigger id="rk-nilai"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Tidak">Tidak (default)</SelectItem><SelectItem value="Ya">Ya — tampilkan skor ke pelamar</SelectItem></SelectContent>
          </Select>
        </Field>
      ) : kind !== 'sumber' ? (
        <Field id="rk-num" label={kind === 'ambang' ? 'Nilai ambang (0–100)' : kind === 'masa' ? 'Masa berlaku (hari)' : 'Masa simpan (bulan)'} required error={sub ? eN : undefined} helper="Angka bulat">
          <Input id="rk-num" inputMode="numeric" value={num} aria-invalid={!!(sub && eN) || undefined} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 3))} />
        </Field>
      ) : (
        <>
          <Field id="rk-baru" label="Tambah sumber" helper="Ketik nama sumber lalu tekan Enter" error={sub ? eL : undefined}>
            <div className="flex gap-2">
              <Input id="rk-baru" value={baru} onChange={(e) => setBaru(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
              <Button type="button" variant="outline" onClick={add}>Tambah</Button>
            </div>
          </Field>
          <ul className="divide-y rounded-md border text-sm">
            {list.map((s) => (
              <li key={s} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="font-medium">{s}</span>
                {used(s) > 0 ? <span className="text-xs text-muted-foreground">Dipakai {used(s)} data, tidak dapat dihapus</span> : <Button variant="ghost" size="icon" aria-label={`Hapus ${s}`} onClick={() => setList(list.filter((x) => x !== s))}><X className="size-4" /></Button>}
              </li>
            ))}
          </ul>
        </>
      )}
      <BerlakuField id="rk-berlaku" value={berlaku} onChange={setBerlaku} error={sub ? eD : undefined} />
      <AlasanField id="rk-alasan" value={alasan} onChange={setAlasan} error={sub ? eA : undefined} />
    </EditSheet>
  )
}
