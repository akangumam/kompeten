export type OrgType = 'Divisi' | 'Department' | 'Section'
export type MasterStatus = 'Aktif' | 'Nonaktif'

export type OrgNode = {
  id: string
  kode: string
  nama: string
  jenis: OrgType
  parentId: string | null
  kepalaNik: string
  status: MasterStatus
  kepalaNext?: { from: string; nik: string }
}

export const NIK = {
  wahyudi: 'PPI-2015-0001',
  agus: 'PPI-2016-0002',
  lestari: 'PPI-2016-0003',
  ratih: 'PPI-2018-0011',
  bambang: 'PPI-2017-0004',
  teguh: 'PPI-2019-0015',
  dian: 'PPI-2018-0022',
  rudi: 'PPI-2018-0013',
  yohanes: 'PPI-2017-0009',
  fajar: 'PPI-2018-0017',
  nina: 'PPI-2017-0012',
  hendra: 'PPI-2019-0007',
  dimas: 'PPI-2019-0009',
  slamet: 'PPI-2018-0008',
  yanti: 'PPI-2020-0014',
}

const n = (id: string, nama: string, jenis: OrgType, parentId: string | null, kepalaNik: string): OrgNode => ({
  id,
  kode: id,
  nama,
  jenis,
  parentId,
  kepalaNik,
  status: 'Aktif',
})

export const ORG: OrgNode[] = [
  n('DIV-OPS', 'Divisi Operasional', 'Divisi', null, NIK.wahyudi),
  n('DEP-PRD', 'Produksi', 'Department', 'DIV-OPS', NIK.agus),
  n('SEC-INJ', 'Injection', 'Section', 'DEP-PRD', NIK.hendra),
  n('SEC-BLW', 'Blow Molding', 'Section', 'DEP-PRD', NIK.dimas),
  n('SEC-EXT', 'Extrusion', 'Section', 'DEP-PRD', NIK.slamet),
  n('SEC-PRT', 'Printing', 'Section', 'DEP-PRD', NIK.yanti),
  n('DEP-QA', 'Quality Assurance', 'Department', 'DIV-OPS', NIK.ratih),
  n('SEC-IQC', 'Incoming QC', 'Section', 'DEP-QA', NIK.ratih),
  n('SEC-IPQC', 'In-Process QC', 'Section', 'DEP-QA', NIK.ratih),
  n('SEC-FQC', 'Final QC', 'Section', 'DEP-QA', NIK.ratih),
  n('DEP-WH', 'Warehouse', 'Department', 'DIV-OPS', NIK.bambang),
  n('SEC-GBB', 'Gudang Bahan Baku', 'Section', 'DEP-WH', NIK.bambang),
  n('SEC-GBJ', 'Gudang Barang Jadi', 'Section', 'DEP-WH', NIK.bambang),
  n('DEP-MTC', 'Maintenance', 'Department', 'DIV-OPS', NIK.teguh),
  n('SEC-MEK', 'Mekanik', 'Section', 'DEP-MTC', NIK.teguh),
  n('SEC-ELK', 'Elektrik', 'Section', 'DEP-MTC', NIK.teguh),
  n('DEP-PPIC', 'PPIC', 'Department', 'DIV-OPS', NIK.dian),
  n('SEC-PPIC', 'PPIC', 'Section', 'DEP-PPIC', NIK.dian),
  n('DEP-ENG', 'Engineering', 'Department', 'DIV-OPS', NIK.rudi),
  n('SEC-ENG', 'Engineering', 'Section', 'DEP-ENG', NIK.rudi),
  n('DIV-CRP', 'Divisi Corporate', 'Divisi', null, NIK.lestari),
  n('DEP-HRGA', 'HR & GA', 'Department', 'DIV-CRP', NIK.lestari),
  n('SEC-HRGA', 'HR & GA', 'Section', 'DEP-HRGA', NIK.lestari),
  n('DEP-FIN', 'Finance', 'Department', 'DIV-CRP', NIK.yohanes),
  n('SEC-FIN', 'Finance', 'Section', 'DEP-FIN', NIK.yohanes),
  n('DEP-IT', 'IT', 'Department', 'DIV-CRP', NIK.fajar),
  n('SEC-IT', 'IT', 'Section', 'DEP-IT', NIK.fajar),
  n('DEP-PUR', 'Purchasing', 'Department', 'DIV-CRP', NIK.nina),
  n('SEC-PUR', 'Purchasing', 'Section', 'DEP-PUR', NIK.nina),
]

/** Seed headcount used only to build the initial roster; live counts come from the roster. */
export const SECTION_TARGET: Record<string, number> = {
  'SEC-INJ': 24, 'SEC-BLW': 18, 'SEC-EXT': 14, 'SEC-PRT': 12,
  'SEC-IQC': 10, 'SEC-IPQC': 18, 'SEC-FQC': 14,
  'SEC-GBB': 9, 'SEC-GBJ': 11, 'SEC-MEK': 16, 'SEC-ELK': 12,
  'SEC-PPIC': 22, 'SEC-ENG': 18,
  'SEC-HRGA': 16, 'SEC-FIN': 12, 'SEC-IT': 12, 'SEC-PUR': 10,
}

export const orgById = (id: string | null) => ORG.find((o) => o.id === id)
export const childrenOf = (id: string | null) => ORG.filter((o) => o.parentId === id)
export const departmentNodes = () => ORG.filter((o) => o.jenis === 'Department')
export const sectionNodesOf = (deptNama: string) => {
  const dep = departmentNodes().find((d) => d.nama === deptNama)
  return dep ? childrenOf(dep.id) : []
}
export const deptOfSection = (sec: OrgNode) => orgById(sec.parentId)!
export const descendantSectionIds = (id: string): string[] => {
  const node = orgById(id)
  if (!node) return []
  if (node.jenis === 'Section') return [node.id]
  return childrenOf(id).flatMap((c) => descendantSectionIds(c.id))
}
