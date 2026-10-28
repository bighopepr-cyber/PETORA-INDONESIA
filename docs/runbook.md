# Runbook PETORA

## Lingkungan lokal

1. Gunakan Node.js 22, pnpm 9, dan Docker.
2. Jalankan `pnpm install`.
3. Jalankan `pnpm supabase:start` untuk memulai Supabase Local dan menerapkan migration.
4. Jalankan `pnpm supabase:env` untuk membuat `apps/web/.env.local` dari status lokal Supabase.
5. Jalankan `pnpm dev`.

Belum ada data bisnis, akun staf, atau fungsi operasional pada fondasi saat ini.

## Pemeriksaan

Jalankan `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:integration`, `pnpm build`, dan `pnpm test:e2e`. Integrasi database hanya ditujukan untuk Supabase Local.

## Insiden, pencadangan, dan pemulihan

Prosedur operasional production belum tersedia dan tidak boleh dianggap aktif. Lengkapi prosedur pencadangan, pemulihan, insiden, dan rotasi kunci sebelum go-live sesuai spesifikasi.
