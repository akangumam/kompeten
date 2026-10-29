import { Plus, UserMinus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { canCreateDisc } from '@/data/discipline'
import { canStartOff } from '@/data/offboarding'
import { DisciplineTab } from '@/components/industrial/discipline-tab'
import { OffboardingTab } from '@/components/industrial/offboarding-tab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DiscJenis } from '@/data/discipline'
import type { Off } from '@/data/offboarding'
import type { CurrentUser } from '@/data/users'

export type IrIntent = { tab: 'disiplin' | 'keluar'; disiplin?: { nik?: string; jenis?: DiscJenis }; keluar?: { nik?: string; reason?: string } }

export default function IndustrialRelationsPage({ user, intent, onIntentDone, onFinished }: { user: CurrentUser; intent?: IrIntent; onIntentDone: () => void; onFinished: (o: Off) => number }) {
  // Disiplin hanya untuk Admin HRD, HR & GA Manager, dan atasan; Payroll hanya melihat Pegawai Keluar (baca saja).
  const tabs: ('disiplin' | 'keluar')[] = user.role === 'payroll' ? ['keluar'] : ['disiplin', 'keluar']
  const [tab, setTab] = useState<'disiplin' | 'keluar'>(intent?.tab && tabs.includes(intent.tab) ? intent.tab : tabs[0])
  const [discToken, setDiscToken] = useState(0)
  const [offToken, setOffToken] = useState(0)
  const active = tabs.includes(tab) ? tab : tabs[0]
  useEffect(() => { if (active !== tab) setTab(active) }, [active, tab])
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hubungan Industrial</h1>
        <p className="text-sm text-muted-foreground">Disiplin pegawai dan proses pegawai keluar</p>
      </div>
      <Tabs value={active} onValueChange={(v) => setTab(v as 'disiplin' | 'keluar')} className="gap-6">
        {/* Tombol utama sejajar dengan Tabs, rata kanan. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {tabs.length > 1 ? (
            <TabsList className="h-auto max-w-full flex-wrap justify-start">
              <TabsTrigger value="disiplin">Disiplin</TabsTrigger>
              <TabsTrigger value="keluar">Pegawai Keluar</TabsTrigger>
            </TabsList>
          ) : <span />}
          {active === 'disiplin' && canCreateDisc(user) && <Button onClick={() => setDiscToken((n) => n + 1)}><Plus /> Buat Catatan</Button>}
          {active === 'keluar' && canStartOff(user) && <Button onClick={() => setOffToken((n) => n + 1)}><UserMinus /> Proses Keluar</Button>}
        </div>
        {tabs.includes('disiplin') && <TabsContent value="disiplin"><DisciplineTab openToken={discToken} user={user} intent={intent?.tab === 'disiplin' ? intent.disiplin : undefined} onIntentDone={onIntentDone} /></TabsContent>}
        <TabsContent value="keluar"><OffboardingTab openToken={offToken} user={user} intent={intent?.tab === 'keluar' ? intent.keluar : undefined} onIntentDone={onIntentDone} onFinished={onFinished} /></TabsContent>
      </Tabs>
    </div>
  )
}
