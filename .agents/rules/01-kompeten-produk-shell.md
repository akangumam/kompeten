# KOMPETEN — Produk & App Shell

Proyek: KOMPETEN — HRIS & Koperasi untuk PT Primaplast Indonesia. Aturan ini berlaku untuk SETIAP prompt. Prompt per layar hanya menambah layout, data, dan aturan bisnis layar itu; bila bertentangan, ikuti prompt untuk layar itu saja dan tetap pakai aturan lain di sini. Sumber kebenaran bisnis: PRD (docs/prd_kompeten_hris_dan_koperasi.md).

## 1. Product context
- KOMPETEN is an internal HRIS + employee cooperative (koperasi) dashboard for PT Primaplast Indonesia (plastics manufacturer, 200–500 employees).
- Admin/HR screens are desktop-first (frame 1440 × 900). Mobile (390 × 844) is ONLY for the employee self-service view.
- All UI copy in Bahasa Indonesia. Keep technical labels that the PRD keeps in English (Dashboard, Payroll, Overtime, Department, KPI).
- Current period for dummy data: Oktober 2026. Timezone WIB (Asia/Jakarta).

## 2. App shell (reuse, never rebuild)
- Always reuse the existing `AppSidebar`, `Topbar`, `SidebarProvider` / `SidebarInset` setup and the sidebar logic in `src/App.tsx`. Do not create a second sidebar or topbar.
- When adding a screen, only set the active sidebar item and the breadcrumb.
- Navigasi: submenu sidebar hanya untuk **halaman yang berbeda**. Tampilan alternatif dari satu halaman (mis. Dashboard Umum/Produksi/Presensi, Hubungan Industrial Disiplin/Pegawai Keluar) memakai **Tabs** di halaman itu, bukan submenu. Item sidebar tanpa submenu tidak memakai chevron. Dashboard adalah satu item; klik item itu membuka tab yang terakhir dibuka di sesi ini (default Umum & Rekrutmen).
- Sidebar groups behave as an accordion: only one group is expanded at a time. Opening a group closes the previously open one; navigating to a page expands that page's group. When the active page's group is collapsed, its parent item stays highlighted (`isActive`) so the user still sees where they are.
- Payroll menu: Payroll Officer dan HR & GA Manager melihat semua halaman Payroll. Finance melihat Daftar Pembayaran, Rekonsiliasi Potongan, dan Kompensasi & Pesangon. Admin HRD hanya melihat Kompensasi & Pesangon (baca saja, termasuk nominal). Supervisor tidak melihat menu Payroll.
- Today is one constant, `DEMO_TODAY` = 26 Okt 2026, in `src/lib/today.ts`. Every page reads it; no page uses `new Date()` for business logic.
- Payroll access per persona: Mira Andriani (Payroll Officer) — all Payroll pages; Lestari Wulandari (HR & GA Manager) — all Payroll pages, read-only except Approval; Yohanes Kristanto (Finance) — lihat aturan Payroll menu di atas.
- Koperasi menu: visible only for the KSB personas (Ratna Dewi · Sekretaris, Nina Marlina · Bendahara, Rudi Hartanto · Ketua). Koperasi is a separate entity; HR and Payroll personas never see Koperasi balances.
- Dashboard tabs by role: Admin HRD & HR & GA Manager → Umum & Rekrutmen · Produksi · Presensi. Supervisor (Atasan) → Umum & Rekrutmen · Presensi, scoped to direct reports. Payroll & Finance → Umum & Rekrutmen. KSB personas → Dashboard shows only Koperasi (no tab list). HR and Payroll personas never see the Koperasi tab.
- Data Master: editable by Admin HRD, read-only for HR & GA Manager, hidden for Supervisor.
- Two distinct settings, never both labelled "Pengaturan": sidebar footer "Pengaturan Sistem" (organization configuration; hidden for Supervisor) and the Topbar user menu "Profil Saya" + "Pengaturan Akun" (personal: kata sandi, notifikasi, tampilan) + "Keluar".
- Sidebar labels must fit in one line at 256px; use the short form (e.g. "Form DICAP") and keep the full name in the page title.
- Navigation: a simple `activePage` state in `src/App.tsx`; sidebar items set it and `main` renders the matching page component from `src/pages/<page>.tsx`. Do not add a router (the final app uses Next.js App Router).
- Page structure inside `main` (`mx-auto w-full max-w-[1600px] p-6 space-y-6`):
  1. Page Header: title (`text-2xl font-semibold tracking-tight`) + subtitle (`text-sm text-muted-foreground`) on the left; page filters and page actions on the right.
  2. Optional summary sentence (`text-sm text-muted-foreground`) describing the active filters.
  3. Content cards.
- Page filters (Tahun, Department, Periode, Status) live in the Page Header, never in the Topbar.
- Vertical rhythm inside `main`: every top-level block (Page Header, Alert, KPI row, stepper/tabs, Card) is separated by `space-y-6`; blocks never touch.
- Fixed footer: layout is `SidebarInset h-svh flex flex-col overflow-hidden` → Topbar (`shrink-0`) → `main` (`flex-1 overflow-y-auto`, the only scroll area) → AppFooter (`shrink-0`). Footer: `border-t px-4 py-3 lg:px-6 text-xs text-muted-foreground`; left "© 2026 PT Primaplast Indonesia · KOMPETEN HRIS & Koperasi"; right "Versi 1.0.0 · Semua waktu dalam WIB · Bantuan · Kebijakan Privasi" (all separated by " · "). Hidden below md and in print. Changing page scrolls `main` back to top. Toasts sit above the footer.
- Feature components go in `src/components/<module>/` (e.g. `src/components/recruitment/`), imported via the `@/` alias. Reuse components from `src/components/dashboard/` and `src/components/ui/` before creating new ones.

