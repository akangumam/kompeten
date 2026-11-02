import { PageHeader } from '@/components/payroll/pay/shared'
import { AuditTab } from '@/components/system/audit-tab'
import { MatrixTab } from '@/components/system/matrix-tab'
import { PolicyTab } from '@/components/system/policy-tab'
import { UsersTab } from '@/components/system/users-tab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Account } from '@/data/accounts'
import type { CurrentUser } from '@/data/users'

/**
 * Pengaturan Sistem. Super Admin: Pengguna, Peran & Hak Akses, Kebijakan Keamanan, Audit Log.
 * HR & GA Manager: hanya Audit Log (baca). Matriks akses tidak dapat diubah dari UI.
 */
export default function SystemSettingsPage({ user, account }: { user: CurrentUser; account: Account }) {
  const full = user.role === 'superadmin'
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <PageHeader title="Pengaturan Sistem" subtitle="Akun pengguna, peran, kebijakan keamanan, dan jejak audit" />
      {full ? (
        <Tabs defaultValue="pengguna" className="gap-6">
          <TabsList className="h-auto max-w-full flex-wrap justify-start">
            <TabsTrigger value="pengguna">Pengguna</TabsTrigger>
            <TabsTrigger value="peran">Peran &amp; Hak Akses</TabsTrigger>
            <TabsTrigger value="kebijakan">Kebijakan Keamanan</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>
          <TabsContent value="pengguna"><UsersTab admin={account} /></TabsContent>
          <TabsContent value="peran"><MatrixTab /></TabsContent>
          <TabsContent value="kebijakan"><PolicyTab admin={account} /></TabsContent>
          <TabsContent value="audit"><AuditTab /></TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="audit" className="gap-6">
          <TabsList><TabsTrigger value="audit">Audit Log</TabsTrigger></TabsList>
          <TabsContent value="audit"><AuditTab /></TabsContent>
        </Tabs>
      )}
    </div>
  )
}
