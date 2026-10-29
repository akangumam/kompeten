import { useState } from 'react'
import { toast } from 'sonner'
import { descId, Field } from '@/components/employee/field'
import { MoneyField, rp, SHEET_W } from '@/components/koperasi/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { addMonths } from '@/data/koperasi/dates'
import { changesOf, setoranNow, STEP, WAJIB_MIN, type Member, type SetoranJenis } from '@/data/koperasi/members'
import { changeBlock, COOLDOWN, createChange, nextPayroll, validSukarela, validWajib } from '@/data/koperasi/requests'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'

const JENIS: SetoranJenis[] = ['Wajib', 'Sukarela']

/** Ubah nominal setoran bulanan (diinput Sekretaris, diproses satu langkah). Berlaku mulai payroll berikutnya. */
export function ChangeSheet({ member, onOpenChange, actor }: { member: Member | null; onOpenChange: (o: boolean) => void; actor: string }) {
  return (
    <Sheet open={!!member} onOpenChange={onOpenChange}>
      <SheetContent className={SHEET_W}>{member && <Body key={member.nik} member={member} onClose={() => onOpenChange(false)} actor={actor} />}</SheetContent>
    </Sheet>
  )
}

function Body({ member, onClose, actor }: { member: Member; onClose: () => void; actor: string }) {
  const [jenis, setJenis] = useState<SetoranJenis>('Wajib')
  const [baru, setBaru] = useState('')
  const [alasan, setAlasan] = useState('')
  const [touched, setTouched] = useState(false)
  const np = nextPayroll()
  const block = changeBlock(member.nik, jenis, np.berlaku)
  const cur = setoranNow(member, jenis)
  const last = changesOf(member, jenis).at(-1)
  const n = Number(baru || 0)
  const nominalErr =
    baru === '' ? (touched ? 'Nominal baru wajib diisi' : '')
    : jenis === 'Wajib' && !validWajib(n) ? `Simpanan Wajib minimal ${rp(WAJIB_MIN)} dan kelipatan ${rp(STEP)}`
    : jenis === 'Sukarela' && !validSukarela(n) ? `Simpanan Sukarela Rp 0 atau kelipatan ${rp(STEP)}`
    : n === cur ? 'Nominal sama dengan setoran saat ini' : ''
  const alasanErr = touched && !validAlasan(alasan) ? ALASAN_ERROR : ''

  const submit = () => {
    setTouched(true)
    if (block || baru === '' || nominalErr || !validAlasan(alasan)) return
    const err = createChange({ nik: member.nik, jenis, baru: n, alasan }, actor)
    if (err) return toast.error(err)
    toast.success(`Perubahan Simpanan ${jenis} ${member.nama} diajukan · berlaku ${np.label}`)
    onClose()
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>Ubah Setoran · {member.nama}</SheetTitle>
        <SheetDescription>{member.nik} · {member.department}. Berlaku mulai payroll berikutnya; periode sebelumnya tetap memakai nilai lama.</SheetDescription>
      </SheetHeader>
      <div className="space-y-4 px-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Jenis simpanan</legend>
          <RadioGroup value={jenis} onValueChange={(v) => { setJenis(v as SetoranJenis); setBaru('') }} className="grid grid-cols-2 gap-3">
            {JENIS.map((j) => (
              <label key={j} htmlFor={`jenis-${j}`} className={cn('flex h-full cursor-pointer items-start gap-3 rounded-lg border p-3', jenis === j && 'ring-2 ring-ring')}>
                <RadioGroupItem id={`jenis-${j}`} value={j} className="mt-1" />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">Simpanan {j}</span>
                  <span className="block text-xs text-muted-foreground tabular-nums">Saat ini {rp(setoranNow(member, j))}/bulan</span>
                  <span className="block text-xs text-muted-foreground">Maks. 1 perubahan per {COOLDOWN[j]} bulan</span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </fieldset>

        <p className="text-sm text-muted-foreground tabular-nums">
          {last ? <>Terakhir berubah {formatDate(last.berlaku)} · paling cepat berikutnya {formatDate(addMonths(last.berlaku, COOLDOWN[jenis]))}</> : 'Belum pernah berubah'}
        </p>
        {block && <Alert variant="warning"><AlertDescription>{block}</AlertDescription></Alert>}

        <fieldset disabled={!!block} aria-disabled={!!block} className="space-y-4 disabled:opacity-60">
          <MoneyField id="ch-baru" label="Nominal baru per bulan" value={baru} onChange={setBaru} disabled={!!block} error={block ? undefined : nominalErr} helper={jenis === 'Wajib' ? 'Minimal Rp 50.000, kelipatan Rp 10.000' : 'Rp 0 atau kelipatan Rp 10.000'} />
          <Field id="ch-berlaku" label="Berlaku mulai" helper="Otomatis payroll periode berikutnya">
            <Input id="ch-berlaku" readOnly value={`${np.label} (${formatDate(np.berlaku)})`} className="bg-muted/50" />
          </Field>
          <Field id="ch-alasan" label="Alasan" required error={alasanErr} helper={`Minimal 10 karakter · ${alasan.trim().length}/10`}>
            <Textarea id="ch-alasan" value={alasan} disabled={!!block} aria-invalid={!!alasanErr || undefined} aria-describedby={descId('ch-alasan', true, !!alasanErr)} onChange={(e) => setAlasan(e.target.value)} />
          </Field>
        </fieldset>
      </div>
      <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t p-4">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button disabled={!!block || !validAlasan(alasan)} onClick={submit}>Ajukan Perubahan</Button>
      </SheetFooter>
    </>
  )
}
