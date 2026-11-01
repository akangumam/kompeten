import type { Role } from '@/data/users'

/**
 * Master Kebijakan Keamanan (diatur Super Admin; UI-nya di 12b). Objek bersifat mutable agar durasi bisa
 * diubah sementara untuk pengujian (mis. idle 1 menit).
 */
export const SECURITY_POLICY: {
  domain: string
  minPassword: number
  maxFailed: number
  lockMinutes: number
  idleMinutes: number
  idleWarnMinutes: number
  otpMinutes: number
  otpResendSeconds: number
  resetMinutes: number
  otpRoles: Role[]
} = {
  domain: 'primaplast.co.id',
  minPassword: 8,
  maxFailed: 5,
  lockMinutes: 15,
  idleMinutes: 30,
  idleWarnMinutes: 2,
  otpMinutes: 5,
  otpResendSeconds: 60,
  resetMinutes: 30,
  otpRoles: ['manager', 'payroll', 'finance', 'bendahara', 'ketua', 'superadmin'],
}
