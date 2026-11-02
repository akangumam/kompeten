# KOMPETEN — Arsitektur Target (berlaku di Antigravity)

Sumber lengkap: docs/arsitektur.md. Kontrak API: docs/api/openapi.yaml (mobile) dan docs/api/openapi-admin.yaml (web).

## Stack target
Monorepo pnpm + Turborepo: apps/web (Next.js App Router + shadcn/ui), apps/api (NestJS + PostgreSQL + Prisma, BullMQ + Redis, MinIO), packages/shared (rumus murni, skema zod, enum status, matriks akses). Flutter memakai API yang sama.

## Prinsip
1. Rumus bisnis di src/data/* dipindahkan apa adanya ke packages/shared sebagai fungsi murni. Tidak ditulis ulang. Tanpa DEMO_TODAY dan tanpa membaca master global: tanggal dan nilai master masuk sebagai parameter.
2. Master selalu berlaku efektif (berlaku_mulai + riwayat); versi lama tidak pernah diubah.
3. Data Final (payroll, SHU, penilaian kompetensi, KPI) disimpan sebagai snapshot, tidak dihitung ulang.
4. Ledger koperasi dan unit dagang append-only; koreksi lewat transaksi balik.
5. Satu mesin persetujuan generik (Matriks Penyetuju, tanpa self-approval, eskalasi ke HR & GA Manager, "mewakili").
6. Otorisasi tiga lapis: guard peran dari access matrix di packages/shared, cakupan data di service (Atasan = bawahan langsung; /me = NIP dari token), penyamaran field di serializer.
7. POST pembuat pengajuan wajib Idempotency-Key. Efek samping (notifikasi, WA, email, PDF) lewat outbox + worker.
8. Waktu dari satu service Clock (WIB). Test memakai tanggal tetap 26 Okt 2026.
9. Angka di docs/golden-values.md wajib tetap sama setelah setiap migrasi (golden test).

## Urutan migrasi
M0 monorepo + Next.js (data mock lewat adapter) → M1 packages/shared + golden test → M2 Auth, akun, master, pegawai → M3 Kehadiran → M4 Payroll + hak akhir → M5 Koperasi → M6 Recruitment, Transaksi, HI, Kompetensi, Training, KPI, Dashboard → M7 Flutter.
Setiap prompt Antigravity = satu fase/modul = satu commit; laporan memuat angka golden yang dicek.
