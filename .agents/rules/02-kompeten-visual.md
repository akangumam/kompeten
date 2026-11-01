# KOMPETEN — Token, Tipografi, Status, Chart, Responsif, Aksesibilitas

## 3. Design tokens
- Theme: shadcn/ui default, base color Neutral. `src/index.css` is the source of truth for tokens. Do not edit token values unless the prompt explicitly asks. Theme mode hanya `light` | `dark` (tidak ada `system`). Default `light`. Semua akses localStorage dibungkus try/catch.
- The app opens in **light mode** the first time regardless of the OS setting; the user's toggle choice (light | dark) is saved in localStorage `kompeten-theme` and applied before first paint (no flash).
- Document head: `<title>{Judul halaman} · KOMPETEN HRIS & Koperasi</title>`, `lang="id"`, `robots` noindex/nofollow (internal app), Open Graph image = official logo on white. Favicon and app icons only from the official logo mark.
- Use only token classes: background, foreground, card, muted, muted-foreground, primary, secondary, accent, border, input, ring, destructive, sidebar-*, chart-1..5, plus status tokens success, info, warning, danger.
- Font: Space Grotesk 400/500/600/700 for everything. No italic anywhere (the font has no italic). Numbers are tabular-nums.
- Radius: Card `rounded-xl`; Button/Input/Select/Dropdown `rounded-md`; Dialog `rounded-lg`; Badge and avatar `rounded-full`.
- Spacing: multiples of 4. KPI grid `gap-4`, chart/split grids `gap-6`, card padding = shadcn Card default, form field gap `gap-4`, label-to-input `space-y-2`.
- Shadow: Card default `shadow-sm` only; dropdown/popover `shadow-md`; dialog/sheet `shadow-lg`.
- The official KOMPETEN logo image (full logo when the sidebar is expanded, mark only in icon mode) is the ONLY brand-colored element. No other hex color or gradient anywhere. The sidebar header shows only the logo asset as-is: no extra text (no tagline or app name written next to or under it); `alt="KOMPETEN HRIS & Koperasi"`. In dark mode the logo sits on a `bg-white rounded-md p-1` chip (or a light variant).

## 4. Typography
| Element | Classes |
|---|---|
| Page title | `text-2xl font-semibold tracking-tight` |
| Card title / description | `CardTitle` (`text-base font-semibold`) / `CardDescription` |
| KPI value (StatCard) | `text-2xl font-semibold tabular-nums @[250px]/card:text-3xl` |
| KPI label (StatCard) | `CardDescription` |
| Body, table cell | `text-sm` |
| Table header | `text-xs font-medium text-muted-foreground` |
| Form label | `text-sm font-medium` |
| Badge | `text-xs font-medium` |

## 5. Status mapping
Every status uses the shared `StatusBadge` component (`src/components/ui/status-badge.tsx`, cva variants success / info / warning / danger / neutral). Never style a Badge ad hoc.

Badge pattern: `inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium` + `border-{status}/20 bg-{status}/10 text-{status} dark:bg-{status}/15` + a `size-3` icon. Status is always icon + text, never color alone.

| Token | Statuses |
|---|---|
| success | Diterima, Lolos, Aktif, Disetujui, Lunas, tren naik |
| info | Interview, Proses Berjalan, Pending Approval, Dijadwalkan |
| warning | Seleksi Administrasi, Menunggu Verifikasi HRD, Mendekati batas |
| danger | Ditolak, Anomali Absen, Diblokir, Gagal Bayar, tren turun |
| neutral (`border-border bg-secondary text-secondary-foreground`) | Draft, Dibatalkan, Belum Dinilai, Status Kerja labels (PKWT, Tetap, Harian, …) |

Time-based urgency (e.g. "Sisa Hari" kontrak): ≤ 14 hari = danger, 15–30 hari = warning, > 30 hari = neutral, with a `Clock` icon.

Use `destructive` only for destructive buttons and input error states, not for badge text.

## 7. Charts (shadcn ChartContainer + Recharts)
Semua chart memakai komponen di `src/components/charts/` (ChartCard, BarChartSimple, BarChartGrouped, LineChartCompare, DonutChart). Dilarang menulis `<BarChart>`/`<LineChart>`/`<PieChart>` langsung di halaman. Resep shadcn: `ChartConfig` per seri dengan `color: 'var(--chart-n)'`, isi memakai `var(--color-{key})`, `ChartContainer` + `accessibilityLayer`, `CartesianGrid vertical={false}`, sumbu kategori `tickLine={false} axisLine={false} tickMargin={10}`, sumbu nilai disembunyikan (nilai ditampilkan lewat `LabelList className="fill-foreground" fontSize={12}`), `ChartTooltip cursor={false} content={<ChartTooltipContent />}`, legend `ChartLegendContent`, Bar `radius={8}` (horizontal `radius={5}`), garis `type="monotone" strokeWidth={2}` (tidak melewati titik data; jangan `natural`). Periode berjalan = `chart-1`, pembanding = `chart-2`, kategori `chart-1…5`. Periode mendatang = `null`, bukan 0.

## 9. Responsive
- ≥ 1024px: sidebar expanded. 768–1023px: sidebar collapsed to icons. < 768px: sidebar becomes a Sheet.
- Grids collapse: KPI 4 → 2 → 1; 12-col grids stack below `lg`; forms 2 → 1 column.
- Wide tables: `overflow-x-auto` with the first column `sticky left-0 z-10 bg-card` (header cell too, `bg-card`), plus a right border/shadow on the sticky column while scrolled. At 1440px admin tables must fit without horizontal scroll; scrolling is for smaller widths.
- Mobile self-service view only: Bottom Navigation (Beranda, Kehadiran, Slip Gaji, Koperasi, Profil), `h-16`, each item ≥ 48 × 48px, icon `size-5` + label `text-xs`; primary actions `w-full h-12`.

## 10. Accessibility
- Contrast: text ≥ 4.5:1, UI components and chart graphics ≥ 3:1, in light AND dark mode.
- Keep the shadcn focus-visible ring on every interactive element. Never `outline-none` without a replacement.
- Every icon-only button has `aria-label` (or sr-only text). Selects without a visible label have `aria-label`.
- Touch targets ≥ 48px on mobile views.

## 11. Do not
- No hex colors or Tailwind palette classes (`bg-emerald-*`, `text-slate-*`, `bg-blue-*`, …) except inside the logo image.
- No tinted/pastel cards, no colored or dark sidebar in light mode, no gradients, no heavy shadows.
- No italic text, no other fonts.
- Do not build screens, sections, cards or charts that the current prompt did not ask for.
- Do not change existing screens when building a new one unless the prompt says so.
- Do not report a visual fix as done based on type-checking only; confirm it in the rendered preview.
