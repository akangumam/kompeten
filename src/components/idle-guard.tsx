import { useEffect, useRef, useState } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { SECURITY_POLICY } from '@/data/master/security-policy'
import { endSession } from '@/lib/session'

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

/**
 * Sesi berakhir setelah idle (master Kebijakan Keamanan). Peringatan muncul `idleWarnMinutes` sebelumnya;
 * selama peringatan tampil, aktivitas tidak memperpanjang sesi (harus lewat tombol "Perpanjang sesi").
 */
export function IdleGuard() {
  const last = useRef(Date.now())
  const [left, setLeft] = useState<number | null>(null)
  const warning = useRef(false)
  useEffect(() => {
    const touch = () => { if (!warning.current) last.current = Date.now() }
    const evs = ['pointerdown', 'keydown', 'mousemove', 'scroll', 'touchstart'] as const
    evs.forEach((e) => window.addEventListener(e, touch, { passive: true }))
    const t = setInterval(() => {
      const total = SECURITY_POLICY.idleMinutes * 60_000
      const idle = Date.now() - last.current
      if (idle >= total) { warning.current = false; setLeft(null); endSession('idle'); return }
      const warnAt = total - SECURITY_POLICY.idleWarnMinutes * 60_000
      if (idle >= Math.max(0, warnAt)) { warning.current = true; setLeft(Math.ceil((total - idle) / 1000)) }
      else if (warning.current) { warning.current = false; setLeft(null) }
    }, 500)
    return () => { evs.forEach((e) => window.removeEventListener(e, touch)); clearInterval(t) }
  }, [])
  const extend = () => { last.current = Date.now(); warning.current = false; setLeft(null) }
  return (
    <AlertDialog open={left !== null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sesi berakhir dalam {left === null ? '' : fmt(left)}</AlertDialogTitle>
          <AlertDialogDescription>Anda tidak aktif beberapa saat. Perpanjang sesi untuk tetap masuk.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => endSession('logout')}>Keluar</AlertDialogCancel>
          <AlertDialogAction onClick={extend}>Perpanjang sesi</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
