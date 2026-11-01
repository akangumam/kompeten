/**
 * Audit log keamanan (append-only). Belum ada UI; UI-nya di 12b (Pengaturan Sistem › Audit Log).
 * Backend wajib menyimpan log ini di sisi server dan tidak boleh dapat diubah atau dihapus dari aplikasi.
 */
export type AuditEvent =
  | 'login-berhasil'
  | 'login-gagal'
  | 'akun-terkunci'
  | 'otp-gagal'
  | 'otp-berhasil'
  | 'ganti-peran-aktif'
  | 'ganti-kata-sandi'
  | 'reset-kata-sandi'
  | 'minta-reset-kata-sandi'
  | 'logout'
  | 'sesi-habis'

export type SecurityAuditEntry = { id: number; at: string; event: AuditEvent; email: string; nip?: string; peran?: string; detail: string }

const LOG: SecurityAuditEntry[] = []
let seq = 0
export function logSecurity(e: Omit<SecurityAuditEntry, 'id' | 'at'>) {
  LOG.push(Object.freeze({ ...e, id: ++seq, at: new Date().toISOString() }) as SecurityAuditEntry)
}
export const securityAuditLog = (): readonly SecurityAuditEntry[] => LOG
