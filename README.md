# PETORA

PETORA adalah sistem operasional pet shop dan klinik hewan. Spesifikasi produk v1.0.0 tersedia di [petora-spesifikasi-v1.0.0.md](./petora-spesifikasi-v1.0.0.md).

## Status

Fondasi monorepo, halaman awal, Supabase Local, dan CI sedang dibangun. Belum ada transaksi bisnis atau modul operasional yang tersedia.

## Menjalankan lokal

Persyaratan: Node.js 22, pnpm 9, Docker, dan Supabase CLI (tersedia sebagai dependency workspace).

```bash
pnpm install
pnpm supabase:start
pnpm supabase:env
pnpm dev
```

`pnpm supabase:start` menyalakan Supabase Local dan menerapkan migration. `pnpm supabase:env` menulis URL dan kunci publishable lokal ke `apps/web/.env.local`; berkas tersebut tidak dilacak Git.

## Perintah utama

| Perintah                        | Fungsi                                                  |
| ------------------------------- | ------------------------------------------------------- |
| `pnpm dev`                      | Menjalankan aplikasi web                                |
| `pnpm build`                    | Membuat build aplikasi web                              |
| `pnpm lint`                     | Menjalankan ESLint dan pemeriksaan format Prettier      |
| `pnpm typecheck`                | Memeriksa tipe seluruh workspace                        |
| `pnpm test:unit`                | Menjalankan tes fungsi murni                            |
| `pnpm test:integration`         | Menjalankan tes SQL terhadap Supabase Local             |
| `pnpm test:e2e`                 | Menjalankan tes browser desktop dan mobile              |
| `pnpm db:reset`                 | Menerapkan ulang migration dan seed pada database lokal |
| `pnpm db:types`                 | Menghasilkan tipe TypeScript dari schema Supabase Local |
| `pnpm db:new -- nama_migration` | Membuat berkas migration baru                           |

## Dokumentasi

- [Runbook](./docs/runbook.md)
- [Rilis dan rollback](./docs/release.md)
- [Lisensi](./LICENSE)
- [Pemberitahuan komponen pihak ketiga](./THIRD_PARTY_NOTICES.md)
