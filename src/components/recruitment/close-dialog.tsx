import { useState } from 'react'
import { toast } from 'sonner'
import { AlasanField } from '@/components/koperasi/shared'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import type { Candidate } from '@/data/candidates'
import { closeCandidate } from '@/data/recruitment/flow'
import { ALASAN_ERROR, validAlasan } from '@/lib/validators'

/** Tolak (HR memutuskan) atau Batal (kandidat mundur/menolak penawaran): alasan wajib, minimal 10 karakter. */
export function CloseDialog({ cand, kind, by, onClose }: { cand: Candidate | null; kind: 'Ditolak' | 'Batal'; by: string; onClose: () => void }) {
  const [alasan, setAlasan] = useState('')
  const [err, setErr] = useState('')
  const reset = () => { setAlasan(''); setErr(''); onClose() }
  return (
    <AlertDialog open={!!cand} onOpenChange={(o) => !o && reset()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{kind === 'Ditolak' ? `Tolak ${cand?.nama}?` : `Batalkan proses ${cand?.nama}?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {kind === 'Ditolak' ? 'Kandidat dipindahkan ke tahap Ditolak dan tidak dapat dilanjutkan.' : 'Gunakan Batal bila kandidat mengundurkan diri atau menolak penawaran. Kandidat dipindahkan ke tahap Batal.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlasanField id="rc-alasan" label={kind === 'Ditolak' ? 'Alasan penolakan' : 'Alasan pembatalan'} value={alasan} onChange={(v) => { setAlasan(v); setErr('') }} error={err} />
        <AlertDialogFooter>
          <AlertDialogCancel>Kembali</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              if (!validAlasan(alasan)) { e.preventDefault(); setErr(ALASAN_ERROR); return }
              if (cand) closeCandidate(cand.id, kind, alasan.trim(), by)
              toast.success(kind === 'Ditolak' ? 'Kandidat ditolak' : 'Proses kandidat dibatalkan')
              reset()
            }}
          >
            {kind === 'Ditolak' ? 'Tolak Kandidat' : 'Batalkan Proses'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
