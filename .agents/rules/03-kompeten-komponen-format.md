# KOMPETEN — Pola Komponen & Format

## 6a. Component patterns (UI)
- **MetricCard:** plain Card, NO tinted background. Label top-left, icon top-right in `size-10 rounded-full bg-muted` (icon colored by category), value, footer with TrendingUp/TrendingDown + delta (`text-success` / `text-danger`). A footer that is only a caption (no delta) is `text-muted-foreground`; never color plain captions. Clickable cards: `cursor-pointer hover:bg-accent/50` + visible focus ring.
- **DataTable:** shadcn Table. No vertical lines, row `h-12`, `hover:bg-muted/50`. Number and Rupiah columns right-aligned. Name column = avatar initials + name (`font-medium`) + secondary line (NIP / nomor lamaran) in `text-xs text-muted-foreground`. Last column = ghost icon button `MoreHorizontal` with `aria-label="Aksi"` → DropdownMenu. Footer on full list pages: "Menampilkan 1 - 5 dari 12 data" left, rows-per-page Select (5/10/25/50) + Pagination right.
- **Preview table** (a table inside a dashboard/summary card that has a "Lihat semua" CardAction): max 5 rows, footer text only ("Menampilkan 5 dari 5 data"), no rows-per-page Select and no Pagination.
- **Filter Bar:** search Input with `Search` icon (placeholder names what is searchable) + 2–3 Selects + Button outline "Reset".
- **Status filter tabs:** shadcn Tabs with count, e.g. "Interview (4)".
- **Card header with action:** use the default shadcn `CardAction` (`col-start-2 row-span-2 row-start-1 justify-self-end`); only add `self-center`. Never override `row-span`.
- **Buttons:** `default` = the one main action per section (e.g. "Tambah Kandidat", "Verifikasi & Aktifkan"); `outline` = secondary (Simpan Draft, Reset, Export, Import); `ghost` = icon buttons; `destructive` = Tolak/Batalkan/Hapus, always behind an AlertDialog. Icon left, `size-4`. When a button has a Plus/UserPlus icon, do not also write "+" in the label.
- **Destructive confirmations:** the confirm button inside the AlertDialog also uses `variant="destructive"` (e.g. "Tolak Kandidat"); the cancel button is `outline` "Batal".
- **Blocked actions** (business rule): `disabled` button wrapped in a Tooltip that states the reason and the next allowed date.
- **Locked data vs disabled:** use `disabled` only for controls that are temporarily unavailable. Saved data that the user may not edit here is shown as read-only (`readOnly`, `bg-muted/50`, value in `text-foreground`, no `*` marker, no chevron), never as greyed-out disabled inputs and never styled like an editable input.
- **Read-only / system fields** (e.g. NIK): `Input readOnly`, `bg-muted/50`, `Lock` icon on the right, value in `text-foreground`, helper text below ("Dibuat otomatis saat aktivasi").
- **Helper vs error:** one message slot per field. The helper text shows by default; when invalid the error replaces the helper (never both). Errors appear after blur or submit, never on an untouched field.
- **Master data:** effective-dated. Changing a rule, schedule or org assignment asks "Berlaku mulai" (default = first day of the next open attendance period) and keeps history; earlier periods keep the old value. Records in use cannot be deleted, only "Nonaktifkan"; "Hapus" only when used by 0 records.
- **Business parameters** (shift times, toleransi telat, istirahat minimal, pembulatan & batas lembur, cut-off, aturan cuti, kalender libur) are read from `src/data/master/*`. No page hard-codes them.
- **Forms:** label above input, `grid-cols-1 md:grid-cols-2 gap-4`, required fields marked `*`, error text below the field (`text-sm text-danger`) + `aria-invalid`.
- **File upload:** never show the native file input (its browser text is English). Use an outline Button "Pilih file" (Paperclip icon) + the chosen file name and size + a ghost "Hapus" icon button; helper text states allowed types and max size.
- **Approvals:** the approver never approves blind. Pending rows show one outline `size="sm"` "Tinjau" button for users allowed to approve; it opens a Sheet with: Diajukan oleh + waktu, data asli vs usulan (side by side, changed values in `font-medium`), alasan, lampiran, then footer destructive "Tolak" (reason required) + default "Setujui". No inline Setujui/Tolak buttons in table rows. If the submitter is the normal approver (self-approval), the request is escalated to the next level (HR & GA Manager) automatically and the Sheet says "Diteruskan ke HR & GA Manager karena diajukan oleh approver"; it never stays stuck.
- **Balance reservations:** a pending request that uses a balance (cuti, plafon, saldo) reserves it immediately and shows it as "Dipesan". Reject or cancel releases it at once. Balance shown to users = Hak − Terpakai − Dipesan.
- **Bank accounts** are always masked (bank + last 4 digits, e.g. "BCA ••••4521") on screen and in slips. Only the bank export file contains full numbers.
- **Names, not roles:** Atasan, Kepala and approver fields always show a person's name (e.g. "Lestari Wulandari"), never a role name.
- **Data scope per role:** every employee has `atasanId`. Supervisor (Atasan) sees only their direct reports in every table, KPI, count and balance, and approves only those; a small note above scoped tables says "Menampilkan tim Anda: {department · section}". Admin HRD and HR & GA Manager see all departments. HR & GA Manager may review any pending request on behalf of the direct supervisor; the Sheet then says "Anda menyetujui mewakili {nama atasan}".
- **Pay visibility:** Rupiah amounts tied to an individual's pay (upah, lembur, gaji, potongan, pinjaman) are hidden for Supervisor (Atasan). Show hours, days and counts instead; hide Rupiah columns, KPIs and slip actions entirely (not masked). Personal identifiers (Nomor KTP, NPWP, nomor BPJS, nomor rekening, alamat KTP) are also hidden for Supervisor; Supervisor opens team profiles read-only and does not see the "Asset, Tax & Bank" tab.
- **Equal card groups:** cards in one row (KPI cards, stepper steps, option cards) share the same width and height: equal grid columns + `h-full`. Labels fit one line (shorten, or truncate with a Tooltip). Active/selected state uses `ring-2 ring-ring`, never a thicker border, so sizes never shift. A 0,0% delta shows a Minus icon in `text-muted-foreground`.
- **Role visibility:** actions the current role may never perform are hidden. Actions the role may normally perform but not in this case (e.g. approving one's own request) are disabled with a Tooltip explaining why.
- **Feedback:** Sonner toast after submit (`<Toaster position="bottom-center" />`, so toasts never cover a right-side Sheet footer); Skeleton for loading; AlertDialog for confirmations; Alert for page-level banners (e.g. "Menunggu Verifikasi HRD").

## 8. Formatting
- Numbers: `toLocaleString('id-ID')` → 1.250. Percent: "+12,5%".
- Currency: "Rp 1.000.000" (space after Rp, no decimals).
- Dates: "26 Okt 2026"; date-time: "26 Okt 2026, 09.30 WIB".
- NIP: `PPI-2026-0001`. Nomor lamaran: `LMR-2026-0001`.
- **Input formats** (shared helpers in `src/lib/validators.ts`; every field shows its format as helper text):
  | Field | Input rule | Valid when | Error text |
  |---|---|---|---|
  | No. HP | `inputMode="tel"`, only digits (strip letters/spaces on type and paste), display grouped `0812-3456-7890` | starts with `08`, 10–13 digits | "Nomor HP harus diawali 08 dan berisi 10–13 digit" |
  | Nomor KTP | `inputMode="numeric"`, digits only, max 16 | exactly 16 digits | "Nomor KTP harus 16 digit angka" |
  | Email | `type="email"` | valid email format | "Format email tidak valid" |
  | NPWP | digits only, max 16 | 15 or 16 digits | "NPWP harus 15 atau 16 digit angka" |
  | No. BPJS Kesehatan | digits only, max 13 | exactly 13 digits | "Nomor BPJS Kesehatan harus 13 digit" |
  | No. BPJS Ketenagakerjaan | digits only, max 11 | exactly 11 digits | "Nomor BPJS Ketenagakerjaan harus 11 digit" |
  | Nomor Rekening | digits only, max 20 | 6–20 digits | "Nomor rekening hanya berisi 6–20 digit angka" |
  | Alasan (koreksi, penolakan, pembatalan) | free text | at least 10 characters, not only digits | "Alasan minimal 10 karakter dan jelas" |
| Nominal Rupiah | digits only, display `Rp 1.000.000` while typing | > 0 | "Nominal harus lebih dari 0" |
- Validate format on blur and again on save; required-field errors only on save.
- Employee number is **NIP** (format PPI-YYYY-NNNN). "NIK" only means the KTP number and is labelled "NIK (KTP)".
- Three separate employee fields: **Jenis Karyawan** (Organik · Harian · Outsourcing · Magang), **Status Kerja** (Tetap · Kontrak; Tetap only for Organik), **Group Kerja / golongan** for payroll (Staff · Non Staff · Harian · Magang · Outsourcing); payroll runs are per Periode + Group Kerja.
- Money math: BPJS amounts rounded to the nearest rupiah; PPh 21 rounded down to the full rupiah; totals summed from rounded line items.
- Use realistic Indonesian names and data. Never lorem ipsum.
- Dummy data has one source: `src/data/<entity>.ts` (e.g. `candidates.ts`, `employees.ts`). Pages import from it; never copy the same record into a page. Data that flows between screens (candidate → draft → employee) must read from the same record so values always match.

