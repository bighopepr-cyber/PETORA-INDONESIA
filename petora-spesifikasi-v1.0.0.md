# PETORA — Spesifikasi Sistem Operasional Pet Shop dan Klinik Hewan

| Atribut | Nilai |
| --- | --- |
| Nama proyek | PETORA |
| Versi dokumen dan produk | 1.0.0 (dikunci) |
| Status | Spesifikasi final untuk implementasi |
| Tanggal | 28 Oktober 2026 |
| Platform aplikasi | Vercel (frontend dan server rendering) + Supabase (basis data, autentikasi, penyimpanan berkas, komputasi, penjadwalan) |
| Arsitektur kode | Monorepo modular (pnpm workspaces + Turborepo) |
| Lisensi dan hak cipta | © 2026 PETORA INDONESIA. Seluruh hak dilindungi. Lihat Bagian 40. |

---

## 0. Kunci Versi dan Aturan Dokumen

Dokumen ini mendefinisikan PETORA versi 1.0.0. Semua keputusan di dokumen ini berlaku sebagai satu kesatuan dan merupakan satu-satunya sumber kebenaran untuk implementasi.

Tidak ada keputusan yang boleh diubah oleh developer tanpa perubahan dokumen ini. Perubahan dicatat di Bagian 41 dengan nomor versi baru.

Aturan versi:
- Perubahan yang kompatibel ke belakang menaikkan **PATCH** (1.0.1).
- Penambahan modul atau fitur yang kompatibel menaikkan **MINOR** (1.1.0).
- Perubahan keputusan bisnis atau teknis yang memutus kompatibilitas menaikkan **MAJOR** (2.0.0).

Dokumen ini tidak memuat roadmap, fase, atau jadwal pengerjaan. Dokumen ini menjelaskan **apa yang harus dibangun**, **bagaimana harus bekerja**, dan **bagaimana dinyatakan lulus**.

Istilah yang dipakai dalam dokumen ini:
- **"wajib"** dan **"dilarang"** bersifat mengikat tanpa pengecualian.
- **"boleh"** bersifat opsional dalam batas yang disebut.
- **"disarankan"** adalah anjuran terbaik yang dapat dilewati dengan alasan tertulis.

---

## 1. Ringkasan Produk

PETORA adalah sistem operasional terpadu untuk pet shop dan klinik hewan dengan dukungan banyak cabang. Satu sistem mencakup:

- **Kasir (POS)** dengan shift per kasir dan pembayaran terpisah per metode.
- **Inventori bersama** antara pet shop dan klinik, dengan batch, kedaluwarsa, dan biaya rata-rata tertimbang.
- **Toko online** dengan pembayaran manual dan pemeriksaan stok setelah pembayaran dikonfirmasi.
- **Klinik**: jadwal dokter, janji temu, kunjungan, rekam medis yang ditandatangani, resep, dan pemakaian obat.
- **Rawat inap dan penitipan** dengan unit rawat berkapasitas.
- **Grooming** dengan kapasitas slot.
- **Tagihan layanan** dengan pembayaran parsial, piutang, dan kredit pelanggan.
- **Keuangan**: buku kas, pengeluaran dengan persetujuan, refund dengan pemisahan tugas, periode keuangan, dan laporan.
- **Portal pelanggan** untuk hewan, janji temu, pesanan, tagihan, dan update rawat inap.

### 1.1 Pengguna Sistem

| Peran | Pengguna | Lingkup kerja |
| --- | --- | --- |
| owner | Pemilik usaha | Seluruh cabang, pengaturan, keuangan, persetujuan |
| doctor | Dokter hewan | Klinik dan rawat inap sesuai penugasan |
| admin | Staf kasir, administrasi, grooming | Operasional harian sesuai cabang |
| customer | Pemilik hewan | Portal pribadi |

### 1.2 Cakupan Versi 1.0.0

**Termasuk**: POS, inventori, pembelian, toko online, klinik, rawat inap, grooming, penitipan, tagihan, refund, keuangan, laporan, portal pelanggan, notifikasi dalam aplikasi dan email, multi-cabang, RBAC, MFA, audit.

**Tidak termasuk (dilarang pada 1.0.0)**: payment gateway, integrasi akuntansi penuh, perhitungan PPN, marketplace, aplikasi native, mode offline, payroll dan komisi, diagnosis berbantuan AI, integrasi alat laboratorium, WhatsApp, multi-mata uang, API publik untuk pihak ketiga, pemindaian virus berkas, dan kurir pengiriman terintegrasi.

---

## 2. Prinsip Arsitektur

1. **Basis data adalah sumber kebenaran.** Aturan stok, kas, pembayaran, rekam medis, dan izin ditegakkan di PostgreSQL melalui fungsi, constraint, trigger, dan Row Level Security (RLS). Aplikasi tidak menghitung ulang aturan yang menentukan saldo.

2. **Mutasi lewat fungsi database.** Setiap operasi tulis bisnis dilakukan melalui satu fungsi PostgreSQL (RPC) yang berjalan dalam satu transaksi. Klien tidak menulis langsung ke tabel bisnis.

3. **Komputasi berat di Supabase.** Perhitungan, laporan, pembuatan dokumen PDF, pengiriman email, dan penjadwalan berjalan di Supabase (PostgreSQL, Edge Functions, pg_cron). Vercel hanya merender antarmuka dan meneruskan permintaan.

4. **Berkas di Supabase Storage.** Semua berkas (bukti pembayaran, dokumen medis, foto hewan, foto produk, PDF hasil) disimpan di Supabase Storage dengan kebijakan akses di level objek.

5. **Tanpa server yang dikelola sendiri.** Tidak ada server tambahan, antrean eksternal, cache terpisah, atau layanan lain di luar Vercel, Supabase, GitHub, Resend, dan Sentry.

6. **Satu sumber konfigurasi.** Skema, kebijakan, fungsi, dan jadwal didefinisikan sebagai kode di folder `supabase/` dan dideploy dari repositori.

7. **Monorepo dengan batas modul yang tegas.** Kode bersama dipisah ke paket. Ketergantungan hanya boleh mengarah satu arah (Bagian 5.3).

8. **Antarmuka hanya bahasa Indonesia.** Tidak ada mekanisme multi-bahasa pada versi 1.0.0.

9. **Deployment fleksibel dan terjangkau.** Sistem dapat dijalankan pada tier gratis Vercel dan Supabase (dengan catatan batas layanan). Tidak ada keharusan memakai domain tertentu, region tertentu, atau paket berbayar.

10. **Konfigurasi tidak rumit.** Tidak ada server, container, atau layanan cron yang dikelola sendiri. Konfigurasi DNS minimal (opsional). Tidak ada langkah manual selain bootstrap pemilik sekali.

---

## 3. Arsitektur Sistem

### 3.1 Diagram Komponen

```
                ┌──────────────────────────────┐
   Browser  ───► │  Vercel: apps/web            │
   (staf,        │  Next.js App Router          │
    pelanggan)   │  Server Components           │
                 │  Server Actions (tipis)      │
                 └──────────────┬───────────────┘
                                │ supabase-js (JWT pengguna)
                 ┌──────────────▼───────────────────────────────────┐
                 │  Supabase                                         │
                 │  ┌────────────┐ ┌───────────────┐ ┌────────────┐ │
                 │  │ Auth (JWT, │ │ PostgreSQL     │ │ Storage    │ │
                 │  │ MFA TOTP)  │ │ tabel + RLS    │ │ bucket     │ │
                 │  └────────────┘ │ fungsi RPC     │ │ privat &   │ │
                 │                 │ trigger        │ │ publik     │ │
                 │  ┌────────────┐ └───────────────┘ └────────────┘ │
                 │  │ Edge       │ ┌───────────────┐                │
                 │  │ Functions  │ │ pg_cron +     │                │
                 │  │ (PDF,      │ │ pg_net        │                │
                 │  │  email,    │ └───────────────┘                │
                 │  │  laporan)  │                                   │
                 │  └─────┬──────┘                                   │
                 └────────┼──────────────────────────────────────────┘
                          │ HTTPS
                   ┌──────▼──────┐        ┌─────────┐
                   │   Resend    │        │ Sentry  │
                   │   (email)   │        │ (error) │
                   │  (free tier)│        │(free tier)
                   └─────────────┘        └─────────┘
```

### 3.2 Pembagian Tanggung Jawab

| Tanggung jawab | Lokasi | Alasan |
| --- | --- | --- |
| Rendering halaman, navigasi, formulir | Vercel (Next.js) | Dekat dengan pengguna, cache halaman publik |
| Validasi bentuk input | Next.js (Zod, sama dengan paket `contracts`) dan ulang di database | Umpan balik cepat, tetapi kebenaran ada di database |
| Autentikasi, sesi, MFA | Supabase Auth | Tidak ada implementasi kriptografi sendiri |
| Otorisasi per baris | PostgreSQL RLS dan fungsi `pos_has_permission` | Pertahanan terakhir yang tidak bisa dilewati klien |
| Transaksi stok, kas, pembayaran, rekam medis | Fungsi PostgreSQL (RPC) | Atomik, terkunci, dan tidak bergantung urutan request |
| Penyimpanan berkas | Supabase Storage + RLS `storage.objects` | Akses per objek tanpa proxy di Vercel |
| Komputasi berat (PDF, CSV, laporan) | Edge Function `render-document` | Terpisah dari Vercel, tidak dibatasi waktu render halaman |
| Pengiriman email | Tabel `sys_email_outbox` + Edge Function `dispatch-email` | Pengiriman tidak bergantung pada request pengguna |
| Penjadwalan job | pg_cron di Supabase | Tidak butuh layanan cron terpisah |
| Error dan performa aplikasi | Sentry (web) dan log Supabase | Pemantauan terpusat |

### 3.3 Alur Permintaan Standar

1. Pengguna melakukan aksi di halaman (misalnya menyelesaikan penjualan).
2. Komponen klien memanggil Server Action dengan payload dan `idempotency_key`.
3. Server Action memvalidasi bentuk input dengan Zod. Jika gagal, mengembalikan `VALIDATION_ERROR` tanpa menyentuh database.
4. Server Action membuat klien Supabase server dari cookie sesi, lalu memanggil RPC yang sesuai.
5. PostgreSQL menjalankan fungsi sebagai `SECURITY DEFINER` dengan `search_path` tetap, memanggil `pos_has_permission` dan pemeriksaan cabang, lalu menjalankan transaksi.
6. Jika berhasil, fungsi mengembalikan JSON hasil. Jika gagal, fungsi melempar exception dengan kode error stabil (Bagian 31).
7. Server Action mengembalikan `{ ok, data }` atau `{ ok: false, error }`. Halaman melakukan revalidasi data yang terdampak.

---

## 4. Stack Teknologi (Terkunci)

| Kode | Lapisan | Teknologi | Versi minimum | Catatan |
| --- | --- | --- | --- | --- |
| TK-01 | Runtime | Node.js | 22 LTS | Vercel memakai Node.js 22 |
| TK-02 | Bahasa | TypeScript | 5.7 | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| TK-03 | Framework web | Next.js (App Router) | 16 | React Server Components default |
| TK-04 | UI library | React | 19 | — |
| TK-05 | Styling | Tailwind CSS | 4 | Token desain di `packages/ui` |
| TK-06 | Admin template | TailAdmin (Next.js) | Commit yang dicatat di `THIRD_PARTY_NOTICES.md` | Dikustomisasi di `packages/ui` |
| TK-07 | Aksesibilitas primitif | Radix UI | Versi terbaru stabil | Dialog, menu, select, tooltip |
| TK-08 | Validasi | Zod | 3.24 | Schema di `packages/contracts` |
| TK-09 | Form | React Hook Form | 7 | Dengan resolver Zod |
| TK-10 | Klien Supabase | @supabase/supabase-js | 2 | — |
| TK-11 | SSR Supabase | @supabase/ssr | Terbaru stabil | Cookie sesi untuk Next.js |
| TK-12 | Basis data | PostgreSQL (Supabase) | 17 | Ekstensi: `pg_cron`, `pg_net`, `pg_trgm`, `btree_gist`, `pgcrypto`, `supabase_vault` |
| TK-13 | Autentikasi | Supabase Auth | Terkelola | Email dan kata sandi, verifikasi email, reset, MFA TOTP |
| TK-14 | Penyimpanan berkas | Supabase Storage | Terkelola | Bucket privat dan publik |
| TK-15 | Komputasi serverless | Supabase Edge Functions | Runtime Deno terkelola | Dengan `npm:` specifier |
| TK-16 | PDF | pdf-lib (di Edge Function) | Versi terbaru stabil | Dibuat tanpa binary tambahan |
| TK-17 | Email transaksional | Resend | API v1 | Dipanggil dari Edge Function; SMTP Supabase Auth juga memakai Resend |
| TK-18 | Pemantauan error | Sentry (@sentry/nextjs) | Terbaru stabil | Dengan penghapusan data pribadi sebelum kirim |
| TK-19 | Hosting web | Vercel | Bebas (termasuk tier gratis) | Region fungsi default |
| TK-20 | Hosting backend | Supabase | Bebas (termasuk tier gratis) | Region bebas |
| TK-21 | Version control | GitHub | — | Branch utama `main` |
| TK-22 | CI | GitHub Actions | — | Lint, tes, build, migrasi |
| TK-23 | Monorepo | pnpm workspaces + Turborepo | pnpm 9, Turbo 2 | — |
| TK-24 | Tes unit | Vitest | 3 | Hanya untuk fungsi murni |
| TK-25 | Tes integrasi | Vitest + Supabase Local | 3 | Lihat Bagian 33 |
| TK-26 | Tes E2E | Playwright | Terbaru stabil | Hanya happy path kritis |
| TK-27 | Format dan lint | Prettier, ESLint (flat config) | Terbaru stabil | — |
| TK-28 | Pencadangan off-platform | Cloudflare R2 (API S3) atau penyedia S3-compatible lain | — | Ekspor harian terenkripsi (opsional, untuk production) |

**Tidak digunakan pada versi 1.0.0**: ORM terpisah, server Node.js mandiri, Redis, layanan antrean eksternal, payment gateway, layanan CDN berbayar tambahan, Supabase Realtime.

### 4.1 Catatan Tier Gratis

Sistem dirancang agar dapat dijalankan pada tier gratis Vercel (Hobby) dan Supabase (Free) untuk keperluan pengembangan, demo, dan produksi skala kecil. Catatan:

- **Supabase Free**: proyek dipause setelah 7 hari tidak aktif; batas 500 MB database, 1 GB storage, 2 juta Edge Function invocations/bulan. Cocok untuk demo dan produksi kecil.
- **Vercel Hobby**: batas 100 GB bandwidth, 100 GB-hours serverless. Cocok untuk demo dan produksi kecil.
- **Supabase Branching**: fitur berbayar. Pada tier gratis, gunakan satu proyek dan satu branch `main` tanpa preview branch per PR.
- **PITR (Point-in-Time Recovery)**: fitur Pro. Pada tier gratis, cadangan harian otomatis tetap tersedia.
- **Domain**: tidak wajib. Vercel menyediakan subdomain `.vercel.app`, Supabase menyediakan subdomain `.supabase.co`.

Untuk produksi penuh dengan banyak cabang dan volume tinggi, disarankan meningkatkan ke paket Pro, tetapi **tidak diwajibkan** oleh spesifikasi ini.

---

## 5. Struktur Monorepo

### 5.1 Pohon Direktori

```
petora/
 ├── apps/
 │   ├── web/                      # Next.js: panel staf, situs publik, portal pelanggan
 │   └── e2e/                      # Playwright: happy path kritis
 ├── packages/
 │   ├── contracts/                # Zod schema input, enum, kode error, kode izin, format murni
 │   ├── ui/                       # Komponen UI bersama, token desain, komponen TailAdmin yang dipakai
 │   ├── db-types/                 # Tipe TypeScript hasil `supabase gen types` (tidak diedit manual)
 │   └── config/                   # tsconfig dasar, eslint flat config, prettier config
 ├── supabase/
 │   ├── config.toml               # konfigurasi proyek Supabase lokal
 │   ├── migrations/               # satu file per perubahan skema (SQL)
 │   ├── seed/                     # data awal nonproduksi dan data demo sintetis
 │   ├── functions/                # Edge Functions
 │   │   ├── render-document/      # PDF invoice, kwitansi, laporan; CSV laporan
 │   │   ├── dispatch-email/       # pengirim outbox email via Resend
 │   │   └── _shared/              # kode bersama khusus Edge (lihat Bagian 28.4)
 │   └── tests/                    # tes SQL pendukung untuk seed dan perbandingan skema (opsional)
 ├── docs/
 │   ├── runbook.md                # operasional, insiden, pemulihan
 │   ├── release.md                # prosedur rilis dan rollback
 │   └── permissions.md            # matriks izin, dihasilkan dari seed
 ├── scripts/
 │   ├── bootstrap/                # SQL pemilik pertama dan verifikasi awal
 │   └── backup/                   # skrip ekspor cadangan
 ├── .github/workflows/
 │   ├── ci.yml
 │   ├── release-production.yml
 │   └── backup.yml
 ├── .env.example
 ├── package.json
 ├── pnpm-workspace.yaml
 ├── turbo.json
 ├── THIRD_PARTY_NOTICES.md
 ├── LICENSE
 └── README.md
```

### 5.2 Isi Paket

| Paket | Isi | Dipakai oleh | Boleh mengimpor |
| --- | --- | --- | --- |
| `apps/web` | Route, layout, halaman, Server Actions, komponen khusus halaman | Vercel | `packages/*` |
| `apps/e2e` | Skenario Playwright | CI | Tidak mengimpor kode aplikasi (hanya lewat URL) |
| `packages/contracts` | Zod schema input, enum status, kode error, kode izin, fungsi format murni (rupiah, tanggal) | `apps/web`, `supabase/functions` (salinan, lihat 28.4) | Tidak mengimpor paket lain |
| `packages/ui` | Komponen presentasional, token, layout shell, tabel, badge | `apps/web` | `contracts` (tipe saja) |
| `packages/db-types` | Tipe basis data | `apps/web`, `contracts` (tipe saja) | — |
| `packages/config` | Konfigurasi bersama | Semua | — |

### 5.3 Aturan Ketergantungan

- `apps/*` boleh mengimpor `packages/*`. Sebaliknya **dilarang**.
- `packages/ui` tidak boleh mengimpor `packages/db-types` atau kode server.
- `packages/contracts` tidak boleh mengimpor modul Next.js, React, atau Supabase klien (kecuali tipe dari `db-types`).
- Batas ini ditegakkan oleh aturan `eslint-plugin-boundaries` di `packages/config`. Pelanggaran menggagalkan CI.
- Kode server di `apps/web/src/server` diberi `import "server-only"`. Kode klien tidak boleh mengimpornya.

### 5.4 Konvensi Penamaan

- Berkas dan folder: `kebab-case`.
- Komponen React: `PascalCase.tsx`.
- Fungsi dan variabel: `camelCase`.
- Nama tabel, kolom, fungsi database, dan enum database: `snake_case` bahasa Inggris.
- Nilai enum database: huruf besar dengan garis bawah (`PENDING_PAYMENT`).
- Kode izin: `domain.action` huruf kecil (`pos.sell`).
- Awalan fungsi database menunjukkan domain (Bagian 26.1).

### 5.5 Konvensi Commit dan Branch

- Branch: `feat/<domain>-<ringkas>`, `fix/<domain>-<ringkas>`, `db/<ringkas>`, `chore/<ringkas>`.
- Commit: Conventional Commits dalam bahasa Inggris, misalnya `feat(pos): add sale_complete rpc`.
- Perubahan skema hanya melalui file migration baru. File migration yang sudah di-merge ke `main` tidak diedit.

---

## 6. Lingkungan dan Konfigurasi

### 6.1 Lingkungan Logis

| Lingkungan | Basis data | Web | Data | Pemicu |
| --- | --- | --- | --- | --- |
| Lokal | Supabase Local (Docker, `supabase start`) | localhost:3000 | Seed sintetis | Manual |
| Preview | Supabase Branch per pull request (opsional, Pro) | Vercel Preview | Seed sintetis | Pull request |
| Staging | Proyek Supabase terpisah atau branch `staging` | Vercel domain staging | Sintetis | Merge ke `main` |
| Production | Proyek Supabase production | Vercel domain production | Nyata | Persetujuan manual, branch `production` |

**Catatan fleksibilitas**:
- Pada tier gratis, lingkungan Preview dan Staging dapat dilewati atau disederhanakan menjadi satu proyek Supabase tunggal dengan branch `main` dan `production`.
- Domain bebas: boleh memakai subdomain Vercel (`.vercel.app`) dan subdomain Supabase (`.supabase.co`). Domain kustom hanya opsional.

### 6.2 Proyek Supabase

Dibuat minimal satu proyek Supabase. Untuk lingkungan terpisah (staging + production), dibuat dua proyek:

- `petora-prod` — region bebas.
- `petora-staging` — region bebas (opsional).

Pengaturan wajib pada setiap proyek:
- **Auth → Email**: konfirmasi email aktif. Kata sandi minimal 10 karakter, dengan pemeriksaan kata sandi bocor aktif.
- **Auth → MFA**: TOTP diaktifkan.
- **Auth → SMTP**: diisi kredensial Resend (tier gratis Resend menyediakan 3.000 email/bulan) agar email verifikasi dan reset dikirim dari domain PETORA.
- **Auth → URL Configuration**: Site URL diisi domain lingkungan; Redirect URLs hanya berisi domain lingkungan dan `http://localhost:3000` untuk lokal.
- **API → Exposed schemas**: hanya `public`. Schema `storage` tidak diekspos langsung oleh PostgREST. `graphql_public` tidak diaktifkan.
- **Database → Extensions**: `pg_cron`, `pg_net`, `pg_trgm`, `btree_gist`, `pgcrypto`, `supabase_vault` diaktifkan melalui migration pertama.

### 6.3 Proyek Vercel

Satu proyek Vercel bernama `petora-web`, Root Directory `apps/web`.

- Framework preset: Next.js.
- Install command: `pnpm install --frozen-lockfile`.
- Build command default (`next build`) dengan `turbo` dijalankan dari root melalui `turbo run build --filter=web...`.
- Region fungsi: default (bebas).
- Production Branch: `production`. Preview untuk semua branch lain.
- Integrasi Supabase untuk Vercel dipasang. Integrasi ini mengisi variabel `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` per lingkungan.
- Domain: bebas. Subdomain `.vercel.app` yang disediakan Vercel sudah cukup.

### 6.4 Variabel Lingkungan

**Web (`apps/web`)**:

```bash
# Publik (aman untuk browser)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=PETORA
NEXT_PUBLIC_SENTRY_DSN=

# Server (di Vercel, tidak pernah diawali NEXT_PUBLIC_)
SENTRY_AUTH_TOKEN=          # hanya untuk unggah source map (opsional)
SENTRY_ORG=
SENTRY_PROJECT=
```

Catatan:
- Web tidak memakai `SUPABASE_SECRET_KEY` pada runtime. Aplikasi bekerja sepenuhnya dengan kunci publishable dan sesi pengguna sehingga RLS selalu berlaku.
- Operasi administratif yang memerlukan kunci secret (misalnya impor data awal) dijalankan dari GitHub Actions atau mesin pengembang, bukan dari Vercel.

**Edge Functions** (rahasia dikelola dengan `supabase secrets set`):

```bash
RESEND_API_KEY=
EMAIL_FROM=PETORA <noreply@petora.id>
APP_URL=
DOCUMENT_URL_TTL_SECONDS=300
```

**Database** (Supabase Vault, dibaca oleh pg_cron melalui fungsi):
- `cron_shared_secret`: nilai acak untuk memanggil Edge Functions dari pg_cron. Edge Functions memeriksa header `x-cron-secret`.

**GitHub Actions secrets** (opsional, untuk CI production):
- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD_PROD`, `SUPABASE_PROJECT_ID_PROD`.
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, `BACKUP_GPG_PUBLIC_KEY` (hanya jika pencadangan off-platform diaktifkan).
- `SENTRY_AUTH_TOKEN` (opsional).

### 6.5 Aturan Rahasia

- Tidak ada rahasia di repository. `.env*` (kecuali `.env.example`) masuk `.gitignore`.
- Nama variabel dengan awalan `NEXT_PUBLIC_` hanya untuk nilai yang boleh diketahui publik.
- ESLint melarang pembacaan `process.env.<NAMA>` untuk nama selain daftar di atas pada kode yang diberi `import "server-only"` atau pada komponen klien.
- Kunci yang pernah terekspos wajib dirotasi dalam 24 jam, termasuk kunci publishable (dengan pembaruan variabel Vercel dan deployment ulang).

### 6.6 Konfigurasi Lokal

Syarat: Docker, Node.js 22, pnpm 9, Supabase CLI versi terbaru stabil.

```bash
git clone git@github.com:petora-indonesia/petora.git && cd petora
pnpm install
cp .env.example apps/web/.env.local
pnpm supabase:start          # menjalankan Supabase Local (Docker) dan menerapkan migration + seed
pnpm dev                     # menjalankan apps/web di localhost:3000
```

Skrip `pnpm supabase:start` menjalankan `supabase start` lalu `supabase db reset` (menerapkan migration dan seed dari nol). Nilai URL dan kunci lokal dicetak oleh Supabase CLI dan disalin ke `apps/web/.env.local` melalui `pnpm supabase:env`.

---

## 7. Deployment

### 7.1 Prinsip Deployment

1. Satu pipeline untuk web (Vercel) dan satu untuk basis data dan fungsi (GitHub Actions memanggil Supabase CLI).
2. Preview dan staging dibuat otomatis (opsional, dapat dilewati pada tier gratis). Production memerlukan persetujuan manual.
3. Migrasi selalu dijalankan sebelum kode web baru aktif. Kode web baru harus kompatibel dengan skema sebelumnya selama satu rilis (expand and contract, Bagian 7.5).
4. Deployment dapat dilakukan sepenuhnya dengan layanan tier gratis.

### 7.2 Penyiapan Awal (Sekali)

1. Buat organisasi GitHub `petora-indonesia` dan repositori privat `petora`.
2. Buat proyek Supabase production (dan staging jika diinginkan).
3. Hubungkan repositori GitHub ke Supabase melalui integrasi GitHub (opsional, hanya jika Supabase Branching aktif).
4. Impor repositori ke Vercel (Bagian 6.3). Pasang integrasi Supabase untuk Vercel.
5. Tambahkan GitHub Actions secrets (Bagian 6.4).
6. Atur GitHub Environments: `staging` (tanpa persetujuan) dan `production` (wajib persetujuan dari pemilik atau developer lead).
7. Pada proyek Supabase production, jalankan migration awal (otomatis dari workflow) lalu jalankan bootstrap pemilik (Bagian 36.2).

### 7.3 Alur Rilis

**Alur lengkap (dengan preview dan staging)**:

```
feat/x  ──PR──►  preview (Vercel Preview + Supabase Branch)
                    ──review + CI hijau──►  main
main    ──otomatis──►  staging (Vercel Staging + Supabase staging)
staging ──smoke test + UAT──►  production branch (manual)
                    ──►  production (Vercel + Supabase prod)
```

**Alur sederhana (tier gratis, tanpa preview/staging)**:

```
feat/x  ──PR──►  CI (lint, typecheck, test, build)
                    ──review──►  main (deploy ke Vercel production + Supabase prod)
```

Langkah rinci alur lengkap:
1. Developer membuat branch dari `main`, menulis kode dan migration, lalu membuka pull request.
2. Supabase Branching membuat branch database preview dan menerapkan seluruh migration dari `supabase/migrations`. Vercel membuat Preview Deployment yang memakai branch database tersebut.
3. CI (`ci.yml`) berjalan: lint, typecheck, tes unit, tes integrasi terhadap Supabase Local, build, dan E2E happy path terhadap Preview. Semua harus hijau.
4. Reviewer kedua menyetujui. Merge ke `main`.
5. Merge ke `main` menerapkan migration ke staging dan men-deploy web ke Staging.
6. Smoke test staging dilakukan (checklist di `docs/release.md`). Pemilik melakukan UAT untuk modul yang berubah.
7. Rilis production: workflow `release-production.yml` dipicu manual (`workflow_dispatch`) dengan parameter commit SHA. Environment `production` meminta persetujuan. Workflow menjalankan `supabase db push` ke production, lalu memajukan branch `production` ke SHA tersebut, yang memicu deployment Vercel Production.
8. Setelah rilis, workflow menjalankan smoke test read-only terhadap production.

### 7.4 Workflow CI (Ringkas)

```yaml
# .github/workflows/ci.yml (ringkas, bentuk final ada di repositori)
jobs:
  verify:
    steps:
      - pnpm install --frozen-lockfile
      - pnpm lint          # eslint + prettier --check + boundaries
      - pnpm typecheck     # tsc --noEmit untuk semua paket
      - pnpm test:unit     # vitest, fungsi murni
      - supabase start     # Supabase Local
      - pnpm test:integration   # vitest terhadap Supabase Local
      - pnpm build
  e2e:
    needs: verify
    steps:
      - pnpm test:e2e      # playwright, happy path, URL Preview
```

### 7.5 Aturan Migrasi

- Setiap file migration berisi satu tujuan. Nama file: `YYYYMMDDHHMMSS_<ringkas>.sql`.
- Migration bersifat maju saja (forward-only). Rollback dilakukan dengan migration baru.
- Perubahan berisiko memakai expand and contract:
  1. Tambahkan kolom atau tabel baru (nullable atau dengan default).
  2. Rilis kode web yang dapat membaca kedua bentuk.
  3. Backfill data dalam migration terpisah.
  4. Rilis kode yang hanya memakai bentuk baru.
  5. Hapus bentuk lama pada rilis berikutnya.
- Operasi destruktif (drop kolom, drop tabel, ubah tipe) wajib disetujui pemilik dan dicatat di deskripsi pull request.
- Migration yang mengubah data besar (lebih dari 100.000 baris) dijalankan dalam batch dengan `LIMIT` dan dicatat di `docs/release.md`.

### 7.6 Rollback

- **Web**: Vercel Instant Rollback ke deployment sebelumnya. Karena migration bersifat kompatibel ke belakang (7.5), rollback web tidak memerlukan rollback basis data.
- **Basis data**: tidak ada rollback otomatis. Perbaikan dilakukan dengan migration maju. Untuk kerusakan data, gunakan Point-in-Time Recovery (jika tersedia) atau cadangan harian ke proyek sementara, verifikasi, lalu salin data yang diperlukan dengan prosedur koreksi terotorisasi (Bagian 34.3).
- **Edge Functions**: redeploy versi sebelumnya dari Git tag.

### 7.7 Konfigurasi Bebas-Rumit

Prinsip yang menjaga deployment tetap sederhana:
- Tidak ada server, container, atau layanan cron yang dikelola sendiri.
- Tidak ada konfigurasi DNS wajib. Subdomain bawaan Vercel dan Supabase sudah cukup.
- Tidak ada langkah manual selain persetujuan production dan bootstrap pemilik sekali.
- Skrip utama tersedia sebagai perintah `pnpm`: `supabase:start`, `db:reset`, `db:new` (membuat file migration), `functions:serve`, `functions:deploy`, `test:unit`, `test:integration`, `test:e2e`.

---

## 8. Cakupan Modul

| Kode | Modul | Isi utama |
| --- | --- | --- |
| M01 | Identitas dan akses | Login, MFA, undangan, peran, izin, sesi, audit |
| M02 | Cabang | Profil, zona waktu, lokasi stok, kasir, metode dan rekening pembayaran, biaya kirim |
| M03 | Pelanggan dan hewan | Pelanggan, wali, hewan, dokumen hewan |
| M04 | Produk | SKU, barcode, kategori, satuan, harga per cabang, status jual |
| M05 | Inventori | Lokasi, batch, saldo, mutasi, penyesuaian, stok opname, transfer, HPP |
| M06 | Pembelian | Supplier, pesanan pembelian, penerimaan, retur supplier, tagihan supplier |
| M07 | POS | Shift, draft penjualan, pembayaran, penyelesaian, retur, void |
| M08 | Toko online | Katalog, keranjang, pesanan, pembayaran manual, review stok, fulfillment |
| M09 | Klinik | Jadwal dokter, janji temu, kunjungan, rekam medis, resep, pemakaian obat |
| M10 | Rawat inap | Unit rawat, penempatan, observasi, tugas, update pelanggan, pulang |
| M11 | Grooming dan penitipan | Layanan, kapasitas, booking, check-in dan check-out, layanan tambahan |
| M12 | Tagihan layanan | Invoice layanan, pembayaran parsial, kredit, piutang |
| M13 | Refund | Permintaan, persetujuan, penyelesaian manual |
| M14 | Keuangan | Buku kas, pengeluaran, periode keuangan |
| M15 | Laporan | Penjualan, online, stok, kedaluwarsa, klinik per dokter, piutang, kas, laba rugi sederhana |
| M16 | Portal pelanggan | Hewan, janji temu, pesanan, tagihan, rekam medis ringkas, update rawat inap |
| M17 | Notifikasi | Dalam aplikasi dan email |
| M18 | Pengaturan dan operasional | Pengguna, undangan, grant izin, kode alasan, template dokumen, job, audit |

---

## 9. Workflow Keseluruhan

Bagian ini menjelaskan urutan kerja sistem dari awal operasi sampai akhir periode. Setiap alur menyebut peran, fungsi database, dan status yang dihasilkan.

### 9.1 Alur A — Onboarding Sistem (Sekali)

| Langkah | Aktor | Tindakan | Hasil |
| --- | --- | --- | --- |
| A1 | Developer | Menjalankan migration dan seed di production | Skema dan izin tersedia |
| A2 | Pemilik | Mendaftar akun di `/daftar`, memverifikasi email | `auth.users` dan `profiles` (peran `customer` sementara) |
| A3 | Developer | Menjalankan `select public.bootstrap_first_owner('<uuid>')` di SQL editor produksi (hanya berhasil jika belum ada owner) | Peran `owner` tersimpan |
| A4 | Pemilik | Mengaktifkan MFA di `/admin/keamanan` | Faktor TOTP aktif |
| A5 | Pemilik | Mengisi profil bisnis dan cabang (`branch_upsert`) | Cabang, lokasi `RETAIL` dan `CLINIC_PHARMACY` dibuat otomatis |
| A6 | Pemilik | Menambah metode pembayaran aktif dan rekening (`branch_set_payment_method`, `branch_set_payment_account`) | Metode siap dipakai POS dan toko online |
| A7 | Pemilik | Mengundang staf (`invitation_create`) | Email undangan terkirim melalui outbox |
| A8 | Pemilik | Membuat katalog layanan dan harga per cabang | Layanan siap dipesan |
| A9 | Pemilik | Membuat master produk, barcode, dan harga per cabang | Produk siap dijual |
| A10 | Pemilik atau admin | Impor data awal (Bagian 36.1) dan penerimaan stok awal (`inv_receive_goods` dengan tipe saldo awal) | Saldo awal dan biaya rata-rata tercatat |
| A11 | Pemilik | Membuat unit rawat dan kapasitasnya | Rawat inap siap dipakai |
| A12 | Pemilik | Membuat akun pemilik kedua (undangan) | Syarat operasi live (BR-03) terpenuhi |
| A13 | Pemilik | Menyetujui checklist go-live (Bagian 36.3) | Operasi live dimulai |

### 9.2 Alur B — Siklus Harian Kasir (POS)

1. **Buka shift**: kasir memanggil `pos_shift_open` dengan saldo kas awal. Sistem memastikan kasir tidak memiliki shift terbuka lain (BR-12).
2. **Buat draft**: kasir membuat draft (`pos_draft_save`) dengan barang dan pelanggan opsional. Draft tidak mengubah stok.
3. **Hitung ulang**: setiap penyimpanan draft menghitung ulang harga dan diskon di database dan mengembalikan total.
4. **Bayar**: kasir mengisi pembayaran per metode lalu memanggil `pos_sale_complete` dengan `idempotency_key`.
5. **Penyelesaian**: fungsi mengunci stok, mengalokasikan batch FEFO, mengurangi stok, menulis ledger, menulis kas, menerbitkan nomor invoice, dan mengubah status menjadi `COMPLETED` dalam satu transaksi.
6. **Cetak**: kasir membuka invoice; web meminta PDF ke Edge Function `render-document`.
7. **Retur** (bila perlu): `pos_return_create` untuk barang tertentu; hasil refund menjadi permintaan `REQUESTED` (Alur F).
8. **Tutup shift**: kasir menghitung kas fisik, memanggil `pos_shift_close`. Selisih wajib berasalan. Shift terkunci.

### 9.3 Alur C — Pesanan Toko Online dengan Pembayaran Manual

1. Pelanggan memilih cabang fulfillment, mengisi keranjang (`shop_cart_set_item`). Keranjang tidak mereservasi stok.
2. Pelanggan membuat pesanan (`order_place`). Pesanan berstatus `payment_status = UNPAID`, `fulfillment_status = NOT_STARTED`. Stok tidak berubah. Instruksi pembayaran cabang disalin sebagai snapshot.
3. Pelanggan mengunggah bukti transfer langsung ke Storage (bucket `payment-proofs`, path `{order_id}/{uuid}.{ext}`). RLS storage mengizinkan unggah hanya jika pesanan milik pengguna dan berstatus `UNPAID` atau `REJECTED`.
4. Pelanggan memanggil `order_submit_payment(order_id, object_path)`. Fungsi memverifikasi objek ada di `storage.objects`, bertipe izin, dan berukuran sesuai. Status pembayaran menjadi `SUBMITTED`.
5. Staf `payment.review` meninjau bukti (kedaluwarsa URL 5 menit dari `storage_read_url`). Penolakan (`order_reject_payment`) mengembalikan pesanan ke `UNPAID`. Pelanggan dapat mengunggah ulang.
6. Staf `payment.confirm` memanggil `order_confirm_payment`. Fungsi mengunci stok dan:
   - jika stok cukup: membuat reservasi, `fulfillment_status = PROCESSING`;
   - jika kurang: `fulfillment_status = STOCK_REVIEW` dengan rincian kekurangan.
7. Untuk `STOCK_REVIEW`, staf memilih tindakan (`order_resolve_stock_review`): `PARTIAL_FULFILL`, `SUBSTITUTE`, atau `CANCEL_AND_REFUND` (Bagian 16.5).
8. Fulfillment dimajukan (`order_advance_fulfillment`): `READY_FOR_PICKUP` atau `DISPATCHED`, lalu `COMPLETED`. Saat `COMPLETED`, reservasi menjadi `FULFILLED` dan ledger `ORDER_FULFILLMENT` ditulis.
9. Setiap perubahan status memicu baris outbox email untuk pelanggan.

### 9.4 Alur D — Kunjungan Klinik

1. Pelanggan (portal) atau staf membuat janji (`appointment_book`). Constraint eksklusi mencegah dokter yang sama memiliki janji bertumpang tindih.
2. Saat pasien datang, staf mengubah status janji menjadi `CHECKED_IN` (`appointment_set_status`).
3. Dokter membuka kunjungan (`visit_open`). Kunjungan berstatus `OPEN`, mencatat tanda vital dan persetujuan wali (nama dan metode).
4. Dokter menyusun rekam medis draf (`medical_record_save_draft`), mencatat resep (`prescription_save`), dan tindakan (`treatment_record_add`).
5. Dokter mengeluarkan obat (`medication_dispense`) dari `CLINIC_PHARMACY` dengan FEFO. Setiap batch menghasilkan baris pengeluaran dan mutasi `CLINIC_USE`.
6. Dokter menandatangani resep dan rekam medis (`medical_record_sign`). Setelah itu isi klinis terkunci.
7. Dokter menutup kunjungan (`visit_close`). Sistem membuat atau memperbarui invoice layanan kunjungan (`bill_invoice_from_source`) dengan item konsultasi, tindakan, dan obat.
8. Koreksi setelah tanda tangan hanya melalui amendemen (`medical_record_amend`) oleh dokter penanda asli.

### 9.5 Alur E — Rawat Inap

1. Dokter atau admin menjadwalkan rawat (`hosp_admit`) dengan unit dan rentang waktu. Status `PLANNED` atau `ADMITTED`.
2. Penempatan memeriksa kapasitas unit dengan kunci baris unit. Pindah unit (`hosp_assign_unit`) menutup penempatan lama dan membuka yang baru.
3. Perawat atau dokter mencatat observasi (`hosp_observation_add`) dan tugas (`hosp_task_set_status`). Pemberian obat tercatat melalui `medication_dispense` dengan `reason = WARD`.
4. Dokter menerbitkan update untuk pelanggan (`hosp_publish_update`). Update bersifat append-only dan memiliki waktu publikasi.
5. Proses pulang: `hosp_discharge_start` membuat invoice final dan status `DISCHARGE_PENDING`; `hosp_discharge_complete` menutup penempatan, melepas unit, dan mengubah status menjadi `DISCHARGED`. Sisa tagihan menjadi piutang (Alur G).

### 9.6 Alur F — Refund dan Retur

1. Pemohon (`refund_request`) membuat refund dari sumber: retur POS, pembatalan pesanan, hasil stok kurang, atau kelebihan pembayaran.
2. Refund berstatus `REQUESTED`. Pengguna lain dengan `refund.approve` menyetujui (`refund_approve`) atau menolak (`refund_reject`) dengan alasan. Pemohon tidak boleh menyetujui (CHECK).
3. Setelah `APPROVED`, pengguna dengan `refund.complete` mencatat pengembalian dana secara manual (`refund_complete`): metode, referensi transfer, dan bukti opsional.
4. Penyelesaian tunai menulis `CASH_OUT_REFUND` ke shift terbuka. Penyelesaian transfer menulis `CASH_OUT_REFUND` tanpa shift.
5. `COMPLETED` dan `REJECTED` bersifat final.

### 9.7 Alur G — Tagihan Layanan, Pembayaran, dan Piutang

1. Invoice layanan dibuat dari sumber (`bill_invoice_from_source`): kunjungan, rawat inap (saat pulang), booking grooming (saat check-out), atau penitipan (saat check-out).
2. Item tambahan dapat ditambahkan (`bill_item_add`) selama invoice `OPEN` atau `PARTIALLY_PAID`.
3. Pembayaran dicatat per transaksi (`bill_payment_record`): parsial diperbolehkan, tidak melebihi `balance_due`. Tunai memerlukan shift terbuka.
4. Kelebihan pembayaran tidak diterima sebagai pembayaran biasa. Staf memilih menyimpan sebagai kredit (`CustomerCredit`) atau membuat refund (Alur F).
5. Kredit dipakai pada invoice berikutnya (`bill_credit_apply`) hingga habis.
6. Piutang dihitung dari `balance_due` invoice `OPEN` dan `PARTIALLY_PAID`, dikelompokkan menurut umur.

### 9.8 Alur H — Grooming dan Penitipan

1. Pelanggan membuat booking (`booking_request`) atau staf membuat langsung (`booking_create`). Sistem memeriksa kapasitas slot atau unit penitipan.
2. Staf mengonfirmasi (`booking_set_status` ke `CONFIRMED`).
3. Layanan tambahan diajukan (`booking_addon_add`). Wali utama menyetujui atau menolak (`booking_addon_decide`).
4. Check-in (`booking_check_in`) mencatat kondisi awal. Check-out (`booking_check_out`) mencatat kondisi akhir, menutup penempatan penitipan jika ada, dan membuat invoice (Alur G).

### 9.9 Alur I — Akhir Periode Keuangan

1. Sebelum penutupan, pemilik meninjau laporan kas, piutang, stok opname, dan selisih rekonsiliasi.
2. Pemilik menjalankan `fin_period_close(branch_id, period_start, period_end)`. Fungsi memeriksa tidak ada shift `OPEN`, tidak ada penjualan `DRAFT` yang lewat periode, dan tidak ada pengeluaran `PENDING_APPROVAL` dalam periode.
3. Fungsi menyimpan ringkasan periode (penjualan, kas per metode, pengeluaran, piutang, nilai persediaan, HPP, laba kotor) sebagai snapshot tidak berubah.
4. Periode `CLOSED` menolak transaksi bertanggal di dalam rentangnya (trigger, Bagian 25.4).

### 9.10 Alur J — Operasi Harian Sistem

- **Setiap menit**: Edge Function `dispatch-email` mengirim hingga 50 email `PENDING`.
- **Setiap jam**: draft POS lebih dari 24 jam menjadi `VOIDED`.
- **Setiap hari pukul 00:00 waktu lokal**: rekonsiliasi stok, pembersihan kunci idempotensi dan token kedaluwarsa, pengingat piutang, peringatan kedaluwarsa dan stok minimum, ekspor audit harian (jika dikonfigurasi).
- Semua job mencatat hasil ke `sys_job_runs`.

---

## 10. Aturan Bisnis Terkunci

| Kode | Aturan |
| --- | --- |
| BR-01 | Satu hewan dapat memiliki lebih dari satu wali. Tepat satu wali aktif berstatus utama. Wali utama menerima tagihan dan menyetujui layanan tambahan. Wali sekunder melihat riwayat, membuat janji, dan menerima update, tanpa melihat angka tagihan. |
| BR-02 | Satu pelanggan memiliki paling banyak satu akun login. Satu akun dapat menjadi wali banyak hewan. Pelanggan walk-in tanpa akun dapat ditautkan ke akun melalui undangan tautan yang dikirim ke email pelanggan yang sudah terverifikasi. |
| BR-03 | Operasi live memerlukan minimal dua akun `owner` aktif. Akun pemilik pertama dibuat melalui `bootstrap_first_owner` sekali per proyek. |
| BR-04 | Sistem tidak menghitung gaji atau komisi dokter. Laporan layanan per dokter hanya menampilkan volume dan nilai layanan. |
| BR-05 | Master produk bersifat global. Harga, status jual POS dan online, dan stok minimum ditetapkan per cabang. Produk aktif di cabang wajib memiliki harga aktif di cabang tersebut. Tidak ada harga fallback. |
| BR-06 | Harga jual dan total transaksi berupa rupiah penuh. Penyimpanan `numeric(14,2)` dengan pecahan nol. Pembulatan memakai `round(x, 0)` pada numeric PostgreSQL, yang untuk nilai non-negatif setara dengan pembulatan setengah ke atas. |
| BR-07 | Produk `category = MEDICINE` dan produk dengan `track_lot = true` wajib memiliki batch dan tanggal kedaluwarsa pada setiap penerimaan. Pengambilan stok memakai FEFO. |
| BR-08 | Batch dengan tanggal kedaluwarsa sebelum tanggal hari ini di zona waktu cabang tidak dapat dijual, dipakai, atau ditransfer. |
| BR-09 | Penjualan POS dan pesanan online wajib lunas pada saat diselesaikan atau dikonfirmasi. Invoice layanan mendukung pembayaran parsial dan menghasilkan piutang. |
| BR-10 | Setiap cabang memiliki kasir dan shift sendiri. Metode pembayaran didefinisikan global dan diaktifkan per cabang. Pembayaran tunai selalu terkait shift terbuka. |
| BR-11 | Nomor dokumen berformat `{KODE_CABANG}-{JENIS}-{TAHUN}-{NOMOR6}`. Jenis: `POS`, `ONL`, `SVC`, `RFD`, `RTN`, `PO`, `TRF`. Nomor berurutan per cabang, jenis, dan tahun, diterbitkan di dalam transaksi pembuatnya. |
| BR-12 | Satu kasir hanya memiliki satu shift `OPEN` pada satu waktu. |
| BR-13 | Biaya satuan persediaan disimpan dengan presisi 4 desimal. Metode biaya: rata-rata tertimbang bergerak per produk per cabang. |
| BR-14 | Peran sistem: `owner`, `doctor`, `admin`, `customer`. Setiap pengguna memiliki tepat satu peran. Izin tambahan diberikan per pengguna melalui grant bertanggal kedaluwarsa opsional. |
| BR-15 | Pemilik yang juga dokter harus memiliki profil dokter aktif dengan nomor STR. Tanpa profil dokter, pemilik hanya dapat membaca rekam medis. |
| BR-16 | Satu rekam medis per kunjungan. Rekam medis `SIGNED` terkunci. Koreksi hanya melalui amendemen oleh dokter penanda asli. |
| BR-17 | Produk `is_prescription = true` hanya dapat dikeluarkan melalui resep bertanda tangan. Produk tersebut tidak dapat masuk POS, keranjang, atau katalog online. |
| BR-18 | Diskon POS sampai 10% dari harga kotor baris dapat diberikan oleh pengguna dengan `pos.discount.apply`. Di atas 10% memerlukan konfirmasi kata sandi oleh pemilik (`pos.discount.override`) yang dicatat. Diskon invoice layanan hanya oleh pemilik. |
| BR-19 | Pengeluaran di atas Rp 1.000.000 memerlukan persetujuan pengguna lain dengan `finance.expense.approve`. |
| BR-20 | Setiap refund memerlukan persetujuan pengguna lain dengan `refund.approve`. Default hanya pemilik. Pemohon tidak dapat menyetujui refund sendiri. |
| BR-21 | Penyesuaian stok wajib memakai kode alasan dari daftar tetap. Penyesuaian tidak memerlukan persetujuan tambahan. Laporan penyesuaian bulanan dikirim ke pemilik. |
| BR-22 | Batch kedaluwarsa dalam 90 hari ditandai di dashboard dan dikirim sebagai notifikasi ke pemilik. |
| BR-23 | MFA wajib untuk pengguna dengan salah satu izin: `payment.confirm`, `refund.approve`, `refund.complete`, `settings.manage`, `finance.*`, `medical_record.sign`, `medical_record.amend`, `user.manage`. Sesi tanpa MFA tingkat `aal2` ditolak untuk izin tersebut. |
| BR-24 | Staf berakhir setelah 8 jam tanpa aktivitas. Pelanggan berakhir setelah 30 hari tanpa aktivitas. |
| BR-25 | Undangan staf berlaku 72 jam dan hanya dapat dipakai sekali. |
| BR-26 | Target pemulihan: RPO 15 menit (jika PITR aktif) atau 24 jam (hanya cadangan harian), RTO 4 jam. |
| BR-27 | Rekam medis dan transaksi disimpan minimal 10 tahun. Data pribadi pelanggan dianonimkan, bukan dihapus baris. Pelanggan tidak dihapus fisik. |
| BR-28 | Konsultasi, grooming, dan penitipan tidak memiliki stok. Layanan dikelola di katalog layanan. |
| BR-29 | Pesanan online ditetapkan ke satu cabang fulfillment. Stok dialokasikan di cabang tersebut. |
| BR-30 | Kelebihan pembayaran layanan menjadi kredit pelanggan, bukan tip atau saldo otomatis. |
| BR-31 | Notifikasi melalui dalam aplikasi dan email. Tidak ada WhatsApp. Email tidak memuat data medis atau rincian item. |
| BR-32 | Setiap kunjungan, rawat inap, dan booking memiliki paling banyak satu invoice layanan aktif (tidak `VOIDED`). |
| BR-33 | Janji temu dokter yang sama tidak boleh bertumpang tindih untuk status aktif. |
| BR-34 | Harga yang ditampilkan kepada pengguna dan dipakai untuk perhitungan adalah harga aktif pada saat transaksi dibuat. Perubahan harga tidak mengubah transaksi lama. |
| BR-35 | Stok tidak pernah negatif. Dua transaksi bersamaan tidak boleh mengonsumsi stok melebihi ketersediaan. |
| BR-36 | Setiap perubahan status yang berdampak keuangan atau klinis dicatat di audit dengan pelaku, waktu, objek, dan alasan bila diwajibkan. |
| BR-37 | Pengguna yang dinonaktifkan kehilangan seluruh akses pada permintaan berikutnya, meskipun token masih berlaku. |
| BR-38 | Operasi di tanggal dalam periode keuangan berstatus `CLOSED` ditolak. |
| BR-39 | Foto produk bersifat publik. Seluruh berkas lain bersifat privat. |
| BR-40 | Pembayaran tunai dan kembalian dicatat terpisah sehingga rekonsiliasi shift akurat. |

---

## 11. Identitas, Peran, dan Akses

### 11.1 Akun dan Autentikasi

Login memakai email dan kata sandi (Supabase Auth). Kata sandi minimal 10 karakter, diperiksa terhadap daftar kata sandi bocor oleh Supabase Auth.

Verifikasi email wajib sebelum pelanggan dapat membuat pesanan, janji, atau booking. Staf yang diundang sudah terverifikasi melalui alur undangan (11.4).

Reset kata sandi memakai tautan Supabase Auth dengan masa berlaku 60 menit.

Penguncian akun setelah kegagalan berulang: fungsi `auth_login_precheck(email)` (anon) mengembalikan `locked = true` jika ada lima kegagalan dalam 15 menit terakhir. Web memanggil fungsi ini sebelum `signInWithPassword`. Setiap kegagalan dicatat melalui `auth_record_failed_login(email)` (anon, dibatasi laju). Penguncian berlaku 15 menit.

Laju permintaan login dibatasi di sisi Supabase Auth (konfigurasi default proyek, tidak diubah).

### 11.2 MFA

Staf dengan izin pada BR-23 wajib mengaktifkan TOTP sebelum dapat memakai izin tersebut. Pengaktifan memakai API MFA Supabase (`mfa.enroll`, `mfa.challenge`, `mfa.verify`).

Sesi tanpa `aal2` tidak lolos pemeriksaan `pos_has_permission` untuk izin BR-23. Fungsi memeriksa klaim `aal` pada JWT (`auth.jwt() ->> 'aal'`).

Pengguna yang belum memiliki MFA aktif dan memiliki izin BR-23 diarahkan ke `/admin/keamanan` oleh layout. Halaman lain tidak dapat dibuka.

Kode cadangan MFA tidak disediakan pada versi 1.0.0. Pemulihan perangkat hilang dilakukan oleh pemilik lain melalui `auth_mfa_reset(user_id)` yang mencatat audit dan mengharuskan pemilik yang melakukan reset memiliki MFA aktif.

### 11.3 Sesi dan Batas Idle

Sesi Supabase default: access token 1 jam, refresh otomatis oleh `@supabase/ssr`.

- **Staf**: setiap render layout staf memanggil `auth_touch()`. Fungsi memperbarui `profiles.last_active_at` jika lebih dari 5 menit sejak pembaruan terakhir. Jika selisih lebih dari 8 jam, fungsi melempar `SESSION_IDLE`, dan web melakukan sign-out.
- **Pelanggan**: `auth_touch()` memperbarui `last_active_at` dengan batas 30 hari.

Pengguna nonaktif (`profiles.is_active = false`) ditolak oleh `auth_touch()` dan oleh setiap fungsi melalui `pos_current_actor()` (BR-37).

### 11.4 Undangan Staf

1. Pemilik memanggil `invitation_create(email, role, branch_ids, str_number)`. Sistem membuat token acak 32 byte, menyimpan hash SHA-256, dan menulis email undangan ke outbox.
2. Penerima membuka `/undangan/[token]`, mendaftar dengan email yang sama persis dengan undangan (`signUp`), memverifikasi email.
3. Setelah sesi aktif, penerima memanggil `invitation_accept(token)`. Fungsi memeriksa email pada JWT sama dengan email undangan, undangan belum dipakai, dan belum kedaluwarsa. Fungsi membuat `profiles` dengan peran dan `user_branch_access`, membuat `doctor_profiles` jika peran dokter, dan menandai undangan terpakai.
4. Penerima dengan izin BR-23 diarahkan ke pengaktifan MFA.

### 11.5 Tautan Akun Pelanggan Walk-in

1. Staf membuat pelanggan walk-in (`customer_upsert`) tanpa akun.
2. Jika pelanggan ingin memiliki akun, pelanggan mendaftar di portal dan memverifikasi email.
3. Staf memanggil `customer_link_request(customer_id, email)`. Fungsi mengirim tautan tautan (purpose `CUSTOMER_LINK`) ke email pelanggan. Tautan hanya dapat dibuka oleh akun yang emailnya sama.
4. Akun pelanggan menerima tautan lewat `/akun/tautkan/[token]` dan memanggil `customer_link_accept(token)`. Fungsi menautkan `customers.user_id`. Satu akun hanya tertaut ke satu pelanggan.

### 11.6 Matriks Izin

Legenda: ✔ = default; (C) = memerlukan profil dokter aktif; (M) = hanya untuk janji, tugas, atau kunjungan yang ditugaskan kepadanya; (B) = dibatasi cabang yang ditugaskan; (G) = hanya melalui grant; (MFA) = wajib `aal2`.

| Kelompok | Izin | owner | doctor | admin | customer |
| --- | --- | --- | --- | --- | --- |
| Pengaturan | `branch.manage` | ✔ | | | |
| | `user.manage` (MFA) | ✔ | | | |
| | `settings.manage` (MFA) | ✔ | | | |
| Produk | `product.manage` | ✔ | | ✔ (B) | |
| | `price.manage` | ✔ | | | |
| Stok | `inventory.read` | ✔ | ✔ (B, klinik) | ✔ (B) | |
| | `inventory.read_cost` | ✔ | | | |
| | `inventory.adjust` | ✔ | | (G) (B) | |
| | `inventory.count` | ✔ | | ✔ (B) | |
| | `inventory.transfer.create` | ✔ | | ✔ (B) | |
| | `inventory.transfer.approve` | ✔ | | | |
| | `inventory.transfer.receive` | ✔ | | ✔ (B) | |
| Pembelian | `purchase.manage` | ✔ | | ✔ (B) | |
| POS | `pos.sell` | ✔ | | ✔ (B) | |
| | `pos.discount.apply` | ✔ | | ✔ (B) | |
| | `pos.discount.override` (MFA) | ✔ | | | |
| | `pos.return.request` | ✔ | | ✔ (B) | |
| | `cash_shift.manage` | ✔ | | ✔ (B) | |
| Online | `payment.review` | ✔ | | ✔ (B) | |
| | `payment.confirm` (MFA) | ✔ | | ✔ (B) | |
| | `stock_review.resolve` | ✔ | | ✔ (B) | |
| | `fulfillment.manage` | ✔ | | ✔ (B) | |
| | `cart.use` | | | | ✔ (miliknya) |
| Refund | `refund.request` | ✔ | | ✔ (B) | |
| | `refund.approve` (MFA) | ✔ | | | |
| | `refund.complete` (MFA) | ✔ | | | |
| Pelanggan | `customer.manage` | ✔ | | ✔ (B) | |
| | `pet.manage` | ✔ | | ✔ (B) | |
| Jadwal | `schedule.manage` | ✔ | | ✔ (B) | |
| | `appointment.manage` | ✔ | ✔ (M) | ✔ (B) | ✔ (miliknya) |
| Klinik | `visit.manage` | ✔ (C) | ✔ (M) | | |
| | `medical_record.read` | ✔ | ✔ (B) | | ✔ (miliknya, `SIGNED`/`AMENDED`) |
| | `medical_record.write` | | ✔ (C, M) | | |
| | `medical_record.sign` (MFA) | ✔ (C, M) | ✔ (C, M) | | |
| | `medical_record.amend` (MFA) | ✔ (C, penanda asli) | ✔ (C, penanda asli) | | |
| | `prescription.write` | ✔ (C) | ✔ (C, M) | | |
| | `medication.dispense` | ✔ (C) | ✔ (C, B) | | |
| Rawat inap | `hospitalization.manage` | ✔ | ✔ (B) | ✔ (B) | |
| | `hospitalization.observe` | ✔ (C) | ✔ (C, B) | | |
| | `hospitalization.publish_update` | ✔ (C) | ✔ (C, M) | | |
| Grooming | `grooming.manage` | ✔ | | ✔ (B) | |
| Tagihan | `service_invoice.manage` | ✔ | | ✔ (B) | |
| | `service_invoice.discount` | ✔ | | | |
| | `service_invoice.void` (MFA) | ✔ | | | |
| Keuangan | `finance.cash.read` (MFA) | ✔ | | | |
| | `finance.expense.create` | ✔ | | ✔ (B) | |
| | `finance.expense.approve` (MFA) | ✔ | | | |
| | `finance.report.read` (MFA) | ✔ | | | |
| | `finance.period.close` (MFA) | ✔ | | | |
| Laporan | `report.sales.read` | ✔ | | ✔ (B, tanpa HPP) | |
| Audit | `audit.read` (MFA) | ✔ | | (G) (B, tanpa data klinis) | |

Catatan:
- Pemilik tanpa profil dokter tidak memiliki izin bertanda (C).
- Admin tidak memiliki akses data klinis, observasi, atau HPP.
- Grant (G) tidak dapat memberikan izin (C) kepada pengguna tanpa profil dokter.

### 11.7 Fungsi Evaluasi Izin

`pos_has_permission(p_code text, p_branch uuid default null, p_object_kind text default null, p_object_id uuid default null) returns boolean` adalah fungsi `SECURITY DEFINER`, `STABLE`, dengan `search_path = public, pg_temp`. Urutan evaluasi:

1. Ambil aktor dari `auth.uid()`. Jika kosong atau `profiles.is_active = false`, kembalikan `false`.
2. Jika `p_code` termasuk BR-23 dan klaim `aal` bukan `aal2`, kembalikan `false`.
3. Cek `role_permissions` untuk `role` aktor, atau `user_permission_grants` aktif (belum dicabut dan belum kedaluwarsa).
4. Jika izin bertanda (C) (daftar di tabel `permissions.requires_doctor_profile`): cek `doctor_profiles.is_active`.
5. Jika `p_branch` diberikan: `owner` lolos; selain itu wajib ada `user_branch_access` untuk cabang tersebut.
6. Jika `p_object_kind` dan `p_object_id` diberikan: fungsi memeriksa kepemilikan objek sesuai jenisnya (janji, kunjungan, rekam medis, tugas, pesanan pelanggan, dan sebagainya) melalui pemetaan tetap di fungsi.
7. Untuk izin (M): objek harus ditugaskan kepada aktor.

Fungsi tidak mengembalikan alasan kegagalan. Pemanggil fungsi RPC menentukan kode error: `NOT_FOUND` jika objek tidak boleh terlihat, `MFA_REQUIRED` jika alasan langkah 2, dan `FORBIDDEN` untuk sisanya.

Helper pendamping:
- `pos_current_actor()` mengembalikan `profiles` aktor atau melempar `UNAUTHENTICATED`/`FORBIDDEN`.
- `pos_can_access_branch(p_branch)` untuk pemeriksaan cakupan cabang yang dipakai di RLS.
- `pos_is_customer_of_pet(p_pet)` dan `pos_is_customer_of_order(p_order)` untuk RLS pelanggan.

### 11.8 Cakupan Cabang

- `owner` mencakup semua cabang.
- `doctor` dan `admin` mencakup cabang di `user_branch_access`. Minimal satu cabang wajib ada; sistem menolak penyimpanan tanpa cabang.
- `customer` tidak memiliki cakupan cabang. Pelanggan hanya melihat data miliknya.

### 11.9 Pemisahan Tugas

- Pemohon refund tidak boleh menyetujui refund itu (CHECK dan fungsi).
- Pengaju pengeluaran di atas batas tidak boleh menyetujuinya (CHECK dan fungsi).
- Pengirim transfer antarcabang tidak boleh menerima transfer yang sama.
- Amendemen rekam medis hanya boleh dilakukan oleh dokter penanda asli.
- Pemeriksa bukti pembayaran boleh sama dengan pengonfirm, dengan jejak masing-masing.

---

## 12. Master Data

### 12.1 Cabang

Data: kode (unik, 2–6 huruf kapital), nama, alamat, telepon, zona waktu (`Asia/Jakarta`, `Asia/Makassar`, `Asia/Jayapura`), biaya kirim tetap (`delivery_fee >= 0`), status `pos_enabled`, `online_enabled`, `is_active`.

Saat cabang dibuat, fungsi membuat dua lokasi wajib: `RETAIL` dan `CLINIC_PHARMACY`.

Logo cabang disimpan di bucket `branding` (publik) dan ditampilkan di invoice.

Cabang tidak dihapus. Dinonaktifkan dengan `is_active = false` dan hanya jika tidak memiliki shift terbuka dan stok di lokasi bernilai lebih dari nol.

### 12.2 Metode Pembayaran

Master global: `CASH` (tunai), `TRANSFER`, `QRIS`, dan metode tambahan yang didefinisikan pemilik (kode unik, nama, `is_cash`, `allows_online`, `allows_pos`).

Per cabang: `branch_payment_methods` mengaktifkan metode dan menyimpan urutan tampil.

Rekening transfer dan instruksi QRIS manual disimpan di `branch_payment_accounts` (bank, nomor rekening, nama penerima, instruksi, `is_active`). Instruksi yang ditampilkan kepada pelanggan disalin ke pesanan sebagai snapshot.

`CREDIT` bukan metode POS. Metode ini hanya dipakai untuk pemakaian kredit pelanggan di invoice layanan.

### 12.3 Pelanggan

Data: nama lengkap, telepon (wajib, unik per cabang untuk walk-in), email (opsional untuk walk-in, unik jika terisi dan tertaut akun), alamat, catatan, `user_id` (nullable, unik), `is_active`.

Pelanggan dinonaktifkan, tidak dihapus. Anonimisasi (BR-27) dijalankan oleh fungsi `customer_anonymize` yang memerlukan konfirmasi dua langkah dan dicatat audit.

Profil `no_show_count` dihitung dari janji `NO_SHOW` dan ditampilkan kepada staf.

### 12.4 Hewan dan Wali

Data hewan: nama, spesies (`DOG`, `CAT`, `BIRD`, `RABBIT`, `REPTILE`, `OTHER`), ras, jenis kelamin (`MALE`, `FEMALE`, `UNKNOWN`), steril (`is_neutered`), tanggal lahir atau estimasi (`birth_date`, `birth_date_is_estimate`), berat terakhir (`weight_kg`), warna, microchip (unik jika terisi), `is_deceased`, `deceased_at`.

Hewan dengan `is_deceased = true` tidak dapat menerima janji, kunjungan, booking, atau rawat baru. Riwayat tetap dapat dibaca.

`pet_guardians`: `pet_id`, `customer_id`, `is_primary`, `started_at`, `ended_at`. Indeks unik parsial menjamin tepat satu wali utama aktif per hewan.

`pet_guardian_set_primary(pet_id, customer_id)` mengakhiri wali utama lama sebagai sekunder dan menjadikan wali baru utama dalam satu transaksi.

Foto hewan disimpan di bucket `pet-photos` (privat).

### 12.5 Produk

`products`: `sku` (unik global), nama, `category` (`RETAIL`, `MEDICINE`, `CLINIC_SUPPLY`, `FOOD`, `ACCESSORY`, `OTHER`), `unit_type` (`COUNT`, `WEIGHT`), `base_unit`, `track_lot`, `is_prescription`, `is_active`, `image_path` (bucket publik), `description`.

CHECK: `category = 'MEDICINE'` berarti `track_lot = true`. `is_prescription = true` berarti `category` harus `MEDICINE`.

`product_barcodes`: barcode unik global, satu produk memiliki banyak barcode.

`product_branch_settings`: unik `(product_id, branch_id)`, `is_pos_sellable`, `is_online_sellable`, `min_stock` (`numeric(14,3)`), `is_active`. CHECK: produk resep tidak boleh `is_pos_sellable` atau `is_online_sellable`.

`product_prices`: append-only. `price numeric(14,2)`, `price = round(price, 0)`, `effective_from timestamptz`. Harga aktif adalah baris dengan `effective_from <= now()` terbaru per `(product_id, branch_id)`.

Harga layanan disimpan di `service_prices` dengan struktur serupa.

### 12.6 Katalog Layanan

`service_catalog`: kode unik, nama, kategori (`GROOMING`, `BOARDING`, `CLINIC`), `duration_minutes`, `is_addon`, `is_active`.

Harga per cabang di `service_prices`.

### 12.7 Supplier

Nama, nama kontak, telepon, email, alamat, NPWP (opsional, format terverifikasi panjang 15 digit jika diisi), `payment_terms_days`, `is_active`.

---

## 13. Inventori

### 13.1 Lokasi dan Batch

`inventory_locations`: `branch_id`, `code` (unik per cabang), `type` (`RETAIL`, `CLINIC_PHARMACY`, `WAREHOUSE`), `name`, `is_active`. Unik parsial satu `RETAIL` dan satu `CLINIC_PHARMACY` per cabang.

`inventory_lots`: `product_id`, `location_id`, `lot_number` (`DEFAULT` untuk produk tanpa batch), `expiry_date` (NULL untuk `DEFAULT`), `received_at`. Unik `(product_id, location_id, lot_number)`.

Produk `track_lot = false` selalu memakai satu baris `DEFAULT` per lokasi, dibuat saat pertama kali ada penerimaan.

### 13.2 Saldo

`stock_balances`: `product_id`, `location_id`, `lot_id`, `on_hand numeric(14,3)`, `reserved numeric(14,3)`. Unik `(product_id, location_id, lot_id)`. CHECK: `on_hand >= 0`, `reserved >= 0`, `reserved <= on_hand`.

Ketersediaan: `available = on_hand − reserved`.

Trigger `stock_balances_write_guard` menolak perubahan kecuali transaksi menyetel `app.stock_write = 'on'` melalui `set_config(..., true)`. Hanya fungsi inventori yang menyetelnya.

### 13.3 Ledger

`inventory_movements` (append-only, trigger penolak `UPDATE` dan `DELETE`):

| Tipe | Arah | Sumber |
| --- | --- | --- |
| PURCHASE_RECEIPT | + | Penerimaan pembelian |
| OPENING_BALANCE | + | Saldo awal (BR-data awal) |
| SALE_POS | − | Penjualan POS |
| ORDER_FULFILLMENT | − | Pesanan online selesai |
| CLINIC_USE | − | Pengeluaran obat dan bahan klinik |
| CUSTOMER_RETURN_RESTOCK | + | Retur POS layak jual |
| SUPPLIER_RETURN | − | Retur ke supplier |
| ADJUSTMENT | ± | Penyesuaian dan stok opname |
| TRANSFER_OUT | − | Pengiriman transfer |
| TRANSFER_IN | + | Penerimaan transfer |

Kolom: `quantity_delta` (≠ 0), `unit_cost_snapshot`, `reference_type`, `reference_id`, `reason_code`, `actor_id`, `occurred_at`.

### 13.4 Reservasi

`stock_reservations`: `order_item_id`, `lot_id`, `product_id`, `location_id`, `quantity`, `status` (`ACTIVE`, `RELEASED`, `FULFILLED`). Unik `(order_item_id, lot_id)`.

Reservasi dibuat hanya oleh `ord_confirm_payment` ketika stok tersedia.

Pelepasan (`RELEASED`) menurunkan `reserved` dalam transaksi pembatalan.

Penyerahan (`FULFILLED`) menurunkan `on_hand` dan `reserved` bersamaan dan menulis `ORDER_FULFILLMENT`.

### 13.5 Penyesuaian dan Kode Alasan

Kode alasan tetap: `COUNT_CORRECTION`, `DAMAGED`, `EXPIRY_WRITE_OFF`, `LOST`, `FOUND`, `CLINIC_USE_CORRECTION`, `OPENING_BALANCE`, `OTHER`.

`OTHER` wajib catatan.

Penyesuaian positif memakai biaya rata-rata saat ini. Jika belum ada biaya, `unit_cost` wajib diisi.

Penyesuaian negatif memakai FEFO dan tidak boleh membuat `on_hand < 0`.

Fungsi: `inv_adjust(p_branch, p_location, p_product, p_lot, p_delta, p_reason, p_note, p_unit_cost, p_idempotency_key)`.

### 13.6 Stok Opname

- `inv_count_open(location_id)` membuat sesi `OPEN`. Satu lokasi satu sesi `OPEN`.
- `inv_count_save_line(session_id, product_id, lot_id, counted_qty)` menyimpan hitungan fisik per baris. Baris dapat diubah selama sesi `OPEN`.
- `inv_count_close(session_id)` membandingkan hitungan dengan saldo saat itu, membuat penyesuaian `COUNT_CORRECTION` untuk setiap selisih, dan menutup sesi. Penutupan dilakukan dalam satu transaksi dengan kunci baris saldo.
- Sesi `CLOSED` tidak dapat diubah.

### 13.7 Transfer

Status: `DRAFT`, `PENDING_APPROVAL`, `IN_TRANSIT`, `RECEIVED`, `CANCELLED`.

| Langkah | Fungsi | Syarat | Efek |
| --- | --- | --- | --- |
| Buat | `inv_transfer_create` | `inventory.transfer.create` pada cabang asal | `DRAFT`, atau `PENDING_APPROVAL` jika antarcabang |
| Setujui | `inv_transfer_approve` | `inventory.transfer.approve` (owner) | `PENDING_APPROVAL` → `DRAFT` terkunci untuk dikirim |
| Kirim | `inv_transfer_dispatch` | `inventory.transfer.create` pada cabang asal, batch belum kedaluwarsa | `TRANSFER_OUT`, `on_hand` asal turun, status `IN_TRANSIT` |
| Terima | `inv_transfer_receive` | `inventory.transfer.receive` pada cabang tujuan, bukan pengirim | `TRANSFER_IN` sebesar diterima, `on_hand` tujuan naik, selisih di `quantity_lost` |
| Batal | `inv_transfer_cancel` | Hanya status `DRAFT` atau `PENDING_APPROVAL` | Status `CANCELLED` |

Transfer dalam satu cabang (antarlokasi) tidak memerlukan persetujuan dan langsung berstatus `DRAFT`.

Transfer `IN_TRANSIT` tidak dapat dibatalkan.

Selisih wajib memiliki alasan. Selisih dilaporkan sebagai kehilangan transfer.

Biaya di cabang tujuan dihitung ulang sebagai rata-rata tertimbang dengan biaya asal.

### 13.8 Biaya Rata-rata Tertimbang dan HPP

`product_branch_costs`: unik `(product_id, branch_id)`, `avg_unit_cost numeric(14,4) >= 0`.

Setiap penambahan stok masuk memperbarui biaya:

```
qty_lama     = total on_hand produk di cabang sebelum perubahan
biaya_baru   = round((qty_lama × biaya_lama + qty_masuk × biaya_masuk) / (qty_lama + qty_masuk), 4)
```

Jika `qty_lama <= 0`, `biaya_baru = biaya_masuk`.

Perubahan dicatat di `cost_history`.

Penjualan, pengeluaran klinik, dan pemenuhan pesanan menyimpan `unit_cost_snapshot`. Snapshot tidak berubah.

### 13.9 FEFO

Urutan pengambilan batch untuk `track_lot = true`:
1. `expiry_date` terdekat (NULL terakhir).
2. `received_at` paling awal.
3. `id` batch.

Batch yang kedaluwarsa dilewati (BR-08). Satu item boleh mengambil dari beberapa batch.

### 13.10 Rekonsiliasi

Job `stock_reconciliation` harian membandingkan `on_hand` setiap `(product, location, lot)` dengan jumlah `quantity_delta` ledger. Selisih menghasilkan notifikasi ke pemilik dan entri `sys_job_runs`. Saldo tidak diperbaiki otomatis.

---

## 14. Pembelian

### 14.1 Pesanan Pembelian

Status: `DRAFT`, `SUBMITTED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`.

`po_create`, `po_update` (hanya `DRAFT`), `po_submit`, `po_cancel` (hanya sebelum penerimaan pertama).

Nomor `PO`.

Perubahan setelah `SUBMITTED` dilakukan dengan membatalkan dan membuat ulang.

### 14.2 Penerimaan Barang

`inv_receive_goods(p_po_id, p_lines jsonb, p_idempotency_key)`. Setiap baris berisi item, jumlah diterima, lokasi tujuan, batch dan kedaluwarsa (wajib untuk `track_lot`), dan harga perolehan per unit.

Dalam satu transaksi:
1. Validasi izin `purchase.manage`, status pesanan, dan cabang.
2. Jumlah diterima tidak melebihi sisa pesanan, kecuali penerimaan berlebih diberi alasan dan persetujuan pemilik (`p_over_receipt_reason` dan izin `purchase.manage` dengan peran owner).
3. Buat `goods_receipts` dan baris, buat atau tambah `inventory_lots`, tambah `on_hand`, tulis `PURCHASE_RECEIPT`, perbarui biaya rata-rata.
4. Perbarui `received_quantity` dan status pesanan.

Penerimaan tidak dapat dibatalkan. Kesalahan diperbaiki dengan penyesuaian atau retur supplier.

### 14.3 Retur Supplier

`po_supplier_return_create(p_receipt_line_id, p_quantity, p_reason)`. Jumlah tidak melebihi stok batch tersedia. Mengurangi `on_hand` dengan biaya rata-rata saat retur, menulis `SUPPLIER_RETURN`.

### 14.4 Tagihan Supplier

`supplier_bills`: nomor faktur supplier (unik per supplier), tanggal faktur, tanggal jatuh tempo, total, status (`OPEN`, `PARTIALLY_PAID`, `PAID`).

`supplier_payments`: pembayaran terhadap tagihan. Setiap pembayaran menulis `CASH_OUT_SUPPLIER` ke kas cabang (tunai memerlukan shift terbuka).

Tagihan dan penerimaan dicatat terpisah.

---

## 15. Point of Sale

### 15.1 Shift Kasir

`pos_shift_open(p_branch, p_opening_cash)`: membuat shift `OPEN` dengan `SHIFT_OPENING`. BR-12 ditegakkan dengan indeks unik parsial.

`pos_shift_close(p_shift, p_counted_cash, p_difference_reason)`: menghitung `expected_cash = opening_cash + Σ CASH_IN_* − Σ CASH_OUT_*` untuk metode tunai pada shift tersebut. `difference = counted − expected`. Selisih tidak nol wajib alasan. Setelah itu shift `CLOSED` dan terkunci.

Rekap penutupan: per metode pembayaran dan total.

### 15.2 Draft Penjualan

Status: `DRAFT`, `COMPLETED`, `PARTIALLY_RETURNED`, `RETURNED`, `VOIDED`.

`pos_draft_save(p_sale_id nullable, p_branch, p_shift, p_customer nullable, p_lines jsonb, p_discounts jsonb)` membuat atau memperbarui draft milik kasir pembuatnya. Mengembalikan draft dengan total yang dihitung ulang.

Draft tidak mereservasi stok.

Produk resep (BR-17) ditolak dengan `VALIDATION_ERROR` dan detail produk.

Produk tanpa harga aktif di cabang ditolak dengan `NOT_SELLABLE`.

Draft lebih dari 24 jam tanpa penyelesaian menjadi `VOIDED` oleh job.

`pos_draft_void(p_sale_id)` untuk membatalkan draft sebelum selesai.

### 15.3 Perhitungan

Semua nilai rupiah penuh. Qty `COUNT` bilangan bulat, `WEIGHT` tiga desimal.

```
unit_price     = harga aktif cabang
line_gross     = round(qty × unit_price, 0)
line_discount  = PERCENT: round(line_gross × pct / 100, 0)
                 AMOUNT : nilai input (≤ line_gross)
line_total     = line_gross − line_discount
effective_pct  = line_discount × 100 / line_gross (jika line_gross > 0)
subtotal       = Σ line_gross
discount_total = Σ line_discount
grand_total    = Σ line_total
```

`effective_pct ≤ 10`: boleh dengan `pos.discount.apply`.

`effective_pct > 10`: wajib `pos.discount.override` dengan konfirmasi kata sandi pemilik. Fungsi `pos_verify_owner_password` memeriksa ulang melalui `auth.users` dengan `crypt()` pada fungsi `SECURITY DEFINER` yang tidak mengubah sesi pemanggil. Verifikasi dicatat di audit (`approved_by`, alasan).

Pembulatan dilakukan per baris. Total tidak dibulatkan ulang.

### 15.4 Pembayaran

`payments` per penjualan: metode aktif di cabang, `amount` (non-tunai harus persis sama dengan porsi; tunai boleh `tendered_amount ≥ amount`).

Jumlah seluruh `amount` harus sama dengan `grand_total`.

`change_amount = tendered_amount − amount` untuk tunai, dan `change_amount` tidak dicatat sebagai pembayaran.

### 15.5 Penyelesaian Penjualan (`pos_sale_complete`)

Parameter: `p_sale_id`, `p_payments jsonb`, `p_idempotency_key`. Dalam satu transaksi:

1. Idempotensi (Bagian 26.3).
2. `pos_current_actor()`, izin `pos.sell`, cabang dalam cakupan, shift `OPEN` milik aktor, status draft `DRAFT`.
3. Hitung ulang seluruh harga dan diskon dari tabel harga dan pengaturan produk. Bandingkan total draft dengan total hitung ulang. Jika berbeda, kembalikan `CONFLICT` dengan total baru.
4. Validasi pembayaran (metode aktif, jumlah sesuai, tunai ≥ porsi).
5. Kunci baris `sales`, lalu `stock_balances` terkait (urut menaik), lalu `product_branch_costs` terkait.
6. Validasi batch tidak kedaluwarsa dan ketersediaan cukup. Jika tidak, lempar `INSUFFICIENT_STOCK` dengan daftar item kurang. Transaksi dibatalkan seluruhnya.
7. Alokasikan batch FEFO, tulis `sale_item_lots`, kurangi `on_hand`, tulis `SALE_POS` per alokasi.
8. Simpan `unit_cost_snapshot` per item.
9. Tulis `sale_payments` dan `cash_movements` (`CASH_IN_SALE` untuk porsi; `CASH_OUT_CHANGE` untuk kembalian tunai).
10. Terbitkan nomor `POS` dari `doc_sequences`.
11. Ubah status `COMPLETED`, isi `completed_at`, `completed_by`.
12. Simpan hasil idempotensi dan tulis audit.
13. Kembalikan ringkasan penjualan dan `invoice_number`.

### 15.6 Retur POS

`pos_return_create(p_sale_id, p_lines jsonb, p_idempotency_key)`. Setiap baris: `sale_item_id`, `quantity`, `condition` (`RESTOCK` atau `DAMAGED`).

Jumlah retur tidak melebihi `quantity − returned_quantity`.

`RESTOCK`: dikembalikan ke batch asal jika belum kedaluwarsa; jika kedaluwarsa, wajib `DAMAGED`. Menulis `CUSTOMER_RETURN_RESTOCK` dengan `unit_cost_snapshot` asal dan memperbarui biaya rata-rata.

`DAMAGED`: tanpa mutasi stok. Nilai kerugian dicatat di baris retur.

Membuat `sales_returns` nomor `RTN`. Nilai refund dibuat sebagai `refunds` berstatus `REQUESTED` (Alur F).

Status penjualan `PARTIALLY_RETURNED` atau `RETURNED`. Baris penjualan asal tidak diubah selain `returned_quantity`.

### 15.7 Void

`pos_draft_void` hanya untuk `DRAFT`. Penjualan `COMPLETED` tidak dapat di-void.

---

## 16. Toko Online

### 16.1 Katalog dan Keranjang

Katalog publik: produk aktif dengan `is_online_sellable = true` dan harga aktif di cabang fulfillment yang dipilih. Diambil melalui fungsi `shop_catalog_list(p_branch, p_category, p_query, p_cursor)`.

Keranjang per pelanggan per cabang: `customer_carts` unik `(customer_id, branch_id)`, `customer_cart_items`.

`shop_cart_set_item(p_branch, p_product, p_quantity)`: quantity 0 menghapus item. Keranjang tidak mereservasi stok.

Produk resep ditolak.

### 16.2 Pesanan

`ord_place(p_branch, p_delivery_method, p_address jsonb, p_idempotency_key)`:

1. Validasi keranjang tidak kosong, setiap item aktif online dan memiliki harga.
2. Hitung `subtotal`, `delivery_fee` (0 untuk `PICKUP`, `branches.delivery_fee` untuk `DELIVERY`), `grand_total`.
3. Buat `orders` (`payment_status = UNPAID`, `fulfillment_status = NOT_STARTED`, nomor `ONL`), `order_items` (snapshot nama, SKU, harga, qty), `payment_instructions_snapshot`.
4. Kosongkan keranjang.
5. Tulis outbox email konfirmasi pesanan.

Pesanan dapat dibatalkan pelanggan (`ord_cancel_by_customer`) selama `payment_status = UNPAID` atau `SUBMITTED` dan `fulfillment_status = NOT_STARTED`.

### 16.3 Pembayaran Manual

Pelanggan mengunggah bukti ke `payment-proofs/{order_id}/{uuid}.{ext}` (lihat Bagian 27.4 untuk RLS).

`ord_submit_payment(p_order, p_method, p_object_path, p_idempotency_key)`:
- memeriksa objek ada di `storage.objects` dengan `bucket_id = 'payment-proofs'`, nama sesuai pesanan, `owner = auth.uid()`;
- memeriksa `metadata->>'mimetype'` dan `metadata->>'size'` sesuai batas (5 MB; JPEG, PNG, PDF);
- membuat `payments` `kind = ORDER`, `status = SUBMITTED`, `amount = grand_total`;
- hanya satu `ORDER` `SUBMITTED` atau `CONFIRMED` per pesanan (indeks unik parsial).

Staf `payment.review` dapat menolak (`ord_reject_payment(p_payment, p_reason)`): status `REJECTED`, pesanan kembali `UNPAID`.

Bukti transfer adalah klaim, bukan bukti dana diterima.

### 16.4 Konfirmasi Pembayaran (`ord_confirm_payment`)

Parameter: `p_order`, `p_payment`, `p_idempotency_key`. Dalam satu transaksi:

1. Idempotensi. Izin `payment.confirm` dengan `aal2`. Cabang fulfillment dalam cakupan.
2. Status pesanan `payment_status = SUBMITTED` (melalui pembayaran). Jumlah pembayaran = `grand_total`.
3. Kunci `orders`, `payments`.
4. Kunci `stock_balances` untuk setiap item (urut menaik), hitung `available`, alokasikan FEFO hipotetis.
5. Tandai pembayaran `CONFIRMED`, pesanan `payment_status = CONFIRMED`. Tulis `CASH_IN_ONLINE` (metode pembayaran, tanpa shift jika non-tunai).
6. Jika semua item tersedia: tulis reservasi (`stock_reservations`), naikkan `reserved`, `fulfillment_status = PROCESSING`.
7. Jika ada item kurang: tanpa reservasi, `fulfillment_status = STOCK_REVIEW`, `stock_review_details` berisi produk, qty pesan, qty tersedia.
8. Tulis outbox email (pelanggan dan staf cabang saat `STOCK_REVIEW`), audit, hasil idempotensi.

Pembayaran yang sudah dikonfirmasi tidak dibatalkan karena stok kurang.

### 16.5 Penanganan STOCK_REVIEW (`ord_resolve_stock_review`)

Izin: `stock_review.resolve`. Setiap tindakan dicatat di `order_review_actions` dengan kunci idempotensi.

| Tindakan | Syarat | Dampak |
| --- | --- | --- |
| PARTIAL_FULFILL | Persetujuan tertulis pelanggan (catatan portal atau catatan telepon oleh staf) | Item tersedia direservasi. Selisih nilai menjadi refund `REQUESTED`. Status `PROCESSING`. |
| SUBSTITUTE | Persetujuan tertulis pelanggan atas pengganti aktif online di cabang yang sama dan tersedia | Pengganti lebih murah: selisih menjadi refund `REQUESTED`, reservasi dibuat, `PROCESSING`. Pengganti lebih mahal: pembayaran tambahan `kind = ADDITIONAL` `SUBMITTED`; status tetap `STOCK_REVIEW` hingga dikonfirmasi lalu alur konfirmasi berulang untuk item pengganti. |
| CANCEL_AND_REFUND | Selalu tersedia | Pesanan `CANCELLED`, refund penuh `REQUESTED`, `payment_status = REFUND_PENDING`. |

### 16.6 Fulfillment

Status: `NOT_STARTED`, `STOCK_REVIEW`, `PROCESSING`, `READY_FOR_PICKUP`, `DISPATCHED`, `COMPLETED`, `CANCELLED`.

| Dari | Ke | Syarat |
| --- | --- | --- |
| NOT_STARTED | PROCESSING | Pembayaran dikonfirmasi, stok tersedia (otomatis saat konfirmasi) |
| NOT_STARTED | STOCK_REVIEW | Pembayaran dikonfirmasi, stok kurang (otomatis) |
| NOT_STARTED | CANCELLED | Sebelum pembayaran dikonfirmasi |
| STOCK_REVIEW | PROCESSING | Setelah `PARTIAL_FULFILL` atau `SUBSTITUTE` selesai |
| STOCK_REVIEW | CANCELLED | `CANCEL_AND_REFUND` |
| PROCESSING | READY_FOR_PICKUP | Pengambilan di toko, `fulfillment.manage` |
| PROCESSING | DISPATCHED | Pengiriman, `fulfillment.manage`, mencatat penerima dan alamat |
| PROCESSING | CANCELLED | Dengan refund penuh `REQUESTED` |
| READY_FOR_PICKUP | COMPLETED | Diambil pelanggan |
| DISPATCHED | COMPLETED | Diterima pelanggan |

Saat `COMPLETED`: reservasi menjadi `FULFILLED`, `on_hand` dan `reserved` turun, ledger `ORDER_FULFILLMENT` ditulis. Saat `CANCELLED` dari `PROCESSING`: reservasi `RELEASED`, `reserved` turun.

Setiap transisi dicatat di `order_fulfillments`. Transisi di luar tabel ditolak `INVALID_STATE_TRANSITION`.

### 16.7 Biaya Pengiriman

`branches.delivery_fee` saat checkout disalin ke `orders.delivery_fee`. Perubahan tarif tidak mengubah pesanan lama.

Pengambilan di toko tanpa biaya.

---

## 17. Klinik dan Rekam Medis

### 17.1 Jadwal dan Janji

`doctor_schedules`: dokter, cabang, hari (0–6), jam mulai, jam selesai, durasi slot (menit).

`appointments`: `pet_id`, `doctor_id` (nullable untuk kategori tanpa dokter), `branch_id`, `starts_at`, `ends_at`, `status`, `booked_by`, `reason`.

Status: `SCHEDULED`, `CHECKED_IN`, `IN_CONSULTATION`, `COMPLETED`, `CANCELLED`, `NO_SHOW`.

Constraint eksklusi (Bagian 25.3) mencegah tumpang tindih untuk status aktif.

Pelanggan membatalkan minimal 2 jam sebelum `starts_at`. Pembatalan lebih dekat dilakukan staf (`appointment_set_status`).

Janji `NO_SHOW` menambah `customers.no_show_count`.

### 17.2 Kunjungan

`visit_open(p_appointment nullable, p_pet, p_branch, p_doctor, p_vitals jsonb, p_consent jsonb)`: membuat `visits` `OPEN`. Persetujuan wajib: `consent_given_by_name`, `consent_method` (`IN_PERSON`, `PHONE`), `consent_customer_id` (wali utama).

Kunjungan tanpa janji diperbolehkan untuk walk-in.

`visit_close(p_visit)`: status `COMPLETED`, membuat invoice layanan (Alur G) bila belum ada.

Vital: berat (kg, 2 desimal), suhu (°C, 1 desimal), detak jantung, laju napas.

### 17.3 Rekam Medis

`medical_records`: `visit_id` (unik), `status` (`DRAFT`, `SIGNED`, `AMENDED`, `VOIDED`), `chief_complaint`, `history`, `physical_exam`, `diagnosis`, `treatment_plan`, `follow_up_date`, `clinical_data jsonb`, `internal_note`, `signed_by`, `signed_at`, `doctor_license_snapshot`.

`medical_record_save_draft(p_visit, p_fields jsonb)`: izin `medical_record.write`; hanya `DRAFT`.

`medical_record_void(p_record, p_reason)`: hanya `DRAFT` oleh dokter pembuatnya; status `VOIDED` final.

`medical_record_sign(p_record, p_idempotency_key)`: izin `medical_record.sign` dengan `aal2`, dokter ditugaskan pada kunjungan, profil dokter aktif. Mengisi `signed_by` dari `auth.uid()`, `signed_at`, dan snapshot STR. Resep `DRAFT` dalam kunjungan yang sama ikut ditandatangani.

Setelah `SIGNED`, kolom klinis dan `internal_note` terkunci oleh trigger (25.4).

### 17.4 Amendemen

`medical_record_amend(p_record, p_reason, p_new_content jsonb, p_idempotency_key)`:
- Izin `medical_record.amend` dengan `aal2`, dan `signed_by = auth.uid()` (penanda asli).
- Menulis `medical_record_amendments` dengan `previous_content` (snapshot lengkap sebelum), `new_content`, `reason`, pelaku, waktu.
- Mengubah kolom klinis dengan `set_config('app.clinical_amend', 'on', true)` yang hanya diizinkan oleh trigger jika flag ini aktif. Status menjadi `AMENDED`.
- Amendemen tidak menghapus snapshot sebelumnya.

### 17.5 Resep dan Pengeluaran Obat

`prescriptions`: `visit_id`, `doctor_id`, `status` (`DRAFT`, `SIGNED`, `CANCELLED`), `signed_at`.

`prescription_items`: `product_id`, `dose_text`, `frequency_text`, `duration_days`, `quantity`, `instructions`.

Dosis diisi dokter secara manual. Sistem tidak menghitung dosis.

Resep `SIGNED` terkunci. Pembatalan dengan alasan menjadi `CANCELLED`.

Pembuatan resep tidak mengurangi stok.

`medication_dispense(p_visit_or_hosp, p_product, p_quantity, p_reason, p_prescription_item nullable, p_idempotency_key)`: izin `medication.dispense` dengan cakupan cabang. Produk resep wajib `p_prescription_item`, dan jumlah kumulatif tidak melebihi jumlah resep.

Pengeluaran memakai FEFO pada `CLINIC_PHARMACY`. Satu baris `medication_dispensings` per batch dengan `unit_cost_snapshot` dan `unit_price_snapshot`. Mutasi `CLINIC_USE`.

Biaya dimasukkan ke invoice layanan terkait sebagai item `MEDICATION`.

### 17.6 Tindakan

`treatment_records`: kunjungan, kode layanan (`CLINIC`), dokter, waktu, catatan, biaya.

Tindakan memerlukan persetujuan wali yang sudah tercatat di kunjungan.

Bahan habis pakai dikeluarkan dengan `medication_dispense` (`reason = PROCEDURE`).

### 17.7 Laporan Layanan Dokter

Per dokter dan rentang tanggal: jumlah kunjungan selesai, jumlah tindakan, jumlah rawat inap yang ditangani, total nilai layanan dari invoice terkait, dan jumlah rekam medis `DRAFT`. Tidak ada komponen gaji atau komisi (BR-04).

---

## 18. Rawat Inap

### 18.1 Unit Rawat

`care_units`: `branch_id`, `code` (unik per cabang), `name`, `type` (`KENNEL`, `ICU`, `ISOLATION`, `BOARDING_ROOM`), `capacity` (≥ 1), `is_active`.

### 18.2 Episode dan Penempatan

`hospitalizations`: `pet_id`, `branch_id`, `status` (`PLANNED`, `ADMITTED`, `DISCHARGE_PENDING`, `DISCHARGED`, `CANCELLED`), `admitted_at`, `discharged_at`, `attending_doctor_id`.

`hospitalization_assignments`: `hospitalization_id`, `unit_id`, `start_at`, `end_at` (nullable = aktif). CHECK `end_at > start_at`.

`hosp_admit(p_pet, p_branch, p_unit, p_start_at, p_idempotency_key)`: mengunci baris `care_units`, menghitung penempatan yang bertumpang tindih dalam rentang, membandingkan dengan `capacity`. Melebihi kapasitas: `INSUFFICIENT_CAPACITY`.

`hosp_assign_unit(p_hosp, p_unit)`: menutup penempatan aktif (`end_at = now()`) dan membuka yang baru dengan pemeriksaan kapasitas yang sama, dalam satu transaksi.

`CANCELLED` hanya dari `PLANNED`.

### 18.3 Observasi dan Tugas

`care_observations` (append-only): `observation_type` (`VITALS`, `MEDICATION_GIVEN`, `FEEDING`, `URINATION`, `DEFECATION`, `PROCEDURE`, `NOTE`), `observed_at`, `values jsonb`, `note`, `recorded_by`.

Observasi `MEDICATION_GIVEN` wajib memiliki `medication_dispensing_id` yang sudah ada.

`care_tasks`: jenis, jatuh tempo, penerima, status (`OPEN`, `DONE`, `CANCELLED`), `done_at`, `done_by`.

Observasi dan tugas internal dan tidak terlihat pelanggan.

### 18.4 Update Pelanggan

`shared_updates` (append-only): `update_type` (`DAILY_SUMMARY`, `PROGRESS`, `DISCHARGE_SUMMARY`), `body` (maksimal 4000 karakter), `published_at`, `published_by`.

`hosp_publish_update(p_hosp, p_type, p_body, p_idempotency_key)`: izin `hospitalization.publish_update`.

Update tidak menyalin observasi internal otomatis.

Koreksi dibuat sebagai update baru.

### 18.5 Pulang

`hosp_discharge_start(p_hosp)`: status `DISCHARGE_PENDING`, membuat invoice final (`bill_invoice_from_source`).

`hosp_discharge_complete(p_hosp)`: menutup penempatan aktif, status `DISCHARGED`, `discharged_at`. Unit dilepas otomatis karena penempatan tertutup.

Sisa tagihan menjadi piutang.

---

## 19. Grooming dan Penitipan

### 19.1 Kapasitas

`service_capacity`: `branch_id`, `service_id`, `starts_at`, `ends_at`, `capacity` (≥ 1). Slot grooming dibuat dari durasi layanan dan jam operasional cabang oleh `groom_generate_slots(p_branch, p_date)`.

Penitipan memakai `care_units` bertipe `BOARDING_ROOM` dengan pemeriksaan kapasitas yang sama dengan rawat inap.

### 19.2 Booking

`service_bookings`: `branch_id`, `pet_id`, `booked_by`, `service_id`, `type` (`GROOMING`, `BOARDING`), `status`, `starts_at`, `ends_at`, `customer_note`.

Status: `REQUESTED`, `CONFIRMED`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`.

`booking_request` (pelanggan) menghasilkan `REQUESTED`. `booking_create` (staf) menghasilkan `CONFIRMED` langsung.

Kapasitas diperiksa dengan kunci baris `service_capacity`. Melebihi kapasitas: `INSUFFICIENT_CAPACITY`.

Pembatalan pelanggan minimal 4 jam sebelum `starts_at`. Setelahnya staf.

Perubahan jadwal (`booking_reschedule`) membatalkan booking lama dan membuat yang baru dalam satu transaksi, keduanya dicatat audit.

### 19.3 Check-in dan Check-out

`booking_check_in(p_booking, p_condition jsonb, p_weight_kg)`: status `CHECKED_IN` lalu `IN_PROGRESS`. Untuk penitipan, membuat `boarding_stays` dan penempatan unit.

`booking_check_out(p_booking, p_condition jsonb, p_final_services jsonb)`: status `COMPLETED`, menutup penempatan penitipan, membuat invoice layanan (Alur G).

Foto kondisi (opsional) disimpan di `pet-photos` dengan awalan `{pet_id}/bookings/{booking_id}/`.

### 19.4 Layanan Tambahan

`service_booking_items` dengan `is_addon`, `approval_status` (`PENDING`, `APPROVED`, `DECLINED`), `approved_by`, `approval_method` (`PORTAL`, `PHONE`), `approved_at`.

Wali utama menyetujui melalui portal (`booking_addon_decide`). Staf dapat mencatat persetujuan via telepon dengan nama pemberi.

`PENDING` dan `DECLINED` tidak masuk invoice.

---

## 20. Tagihan Layanan, Kredit, Piutang, dan Refund

### 20.1 Invoice Layanan

`service_invoices`: `branch_id`, `customer_id`, `source_type` (`VISIT`, `HOSPITALIZATION`, `BOOKING`), `source_id`, `invoice_number` (`SVC`), `status` (`OPEN`, `PARTIALLY_PAID`, `PAID`, `VOIDED`), `subtotal`, `discount_total`, `grand_total`, `amount_paid`, `balance_due`, `due_date`.

`service_invoice_items`: `item_type` (`CONSULTATION`, `TREATMENT`, `MEDICATION`, `SUPPLY`, `BOARDING_DAY`, `GROOMING`, `ADDON`, `OTHER`), `source_type`, `source_id`, `description`, `quantity`, `unit_price`, `discount_amount`, `line_total`, `unit_cost_snapshot` (untuk HPP).

`bill_invoice_from_source(p_source_type, p_source_id)`: membuat invoice dan semua item dari sumber. Satu invoice aktif per sumber (BR-32).

`bill_item_add(p_invoice, ...)`: hanya status `OPEN` atau `PARTIALLY_PAID`.

Diskon invoice (`bill_discount_set`): hanya `service_invoice.discount`.

`bill_invoice_void(p_invoice, p_reason)`: hanya jika `amount_paid = 0`, izin `service_invoice.void` dengan `aal2`.

Koreksi setelah pembayaran pertama dilakukan dengan item penyesuaian, bukan penghapusan.

### 20.2 Pembayaran Layanan

`service_payments` (append-only): `invoice_id`, `method_code`, `amount` (≠ 0), `paid_at`, `recorded_by`, `shift_id` (wajib untuk tunai), `reference`, `is_correction`, `correction_reason`.

`bill_payment_record(p_invoice, p_method, p_amount, p_reference, p_idempotency_key)`: `amount ≤ balance_due`, tunai memerlukan shift `OPEN` milik pencatat. Memperbarui `amount_paid` dan `balance_due` serta status dalam satu transaksi. Menulis `CASH_IN_SERVICE`.

Koreksi: `bill_payment_correct(p_payment, p_reason)` menulis baris negatif dengan `is_correction = true`. Izin `finance.cash.read` dengan `aal2`.

Kelebihan: `bill_overpayment_resolve(p_invoice, p_action)` dengan `p_action = TO_CREDIT` (menulis `customer_credits`) atau `TO_REFUND` (membuat refund `REQUESTED`).

### 20.3 Kredit Pelanggan

`customer_credits`: `customer_id`, `source_type`, `source_id`, `amount`, `used_amount` (≤ `amount`).

`bill_credit_apply(p_invoice, p_amount)`: mengurangi `balance_due`, menaikkan `used_amount`, menulis `service_payments` `method_code = CREDIT`. Tidak menulis kas.

### 20.4 Piutang

Piutang = Σ `balance_due` invoice `OPEN` dan `PARTIALLY_PAID`.

Umur: 0–30, 31–60, 61–90, lebih dari 90 hari sejak `due_date`.

Piutang tampil bagi wali utama di portal.

Job harian menulis email pengingat untuk invoice yang jatuh tempo dalam 3 hari dan yang sudah lewat jatuh tempo.

### 20.5 Refund

`refunds`: `source_type` (`SALE_RETURN`, `ORDER`, `OVERPAYMENT`, `CREDIT`), `source_id`, `amount` (> 0), `reason`, `status` (`REQUESTED`, `APPROVED`, `REJECTED`, `COMPLETED`), `requested_by`, `approved_by`, `completed_by`, `payout_method` (`CASH`, `TRANSFER`), `payout_reference`, `rejection_reason`, `invoice_number` (`RFD`).

`refund_request`, `refund_approve`, `refund_reject`, `refund_complete` sesuai Alur F.

Jumlah refund tidak boleh melebihi jumlah yang dibayar dikurangi refund `APPROVED` atau `COMPLETED` pada sumber yang sama.

`COMPLETED` menulis `CASH_OUT_REFUND`. Tunai memerlukan shift `OPEN` milik penyelesai.

Trigger menolak perubahan setelah `COMPLETED` atau `REJECTED`.

---

## 21. Keuangan, Kas, dan Laporan

### 21.1 Buku Kas

`cash_movements` (append-only): `branch_id`, `shift_id` (wajib untuk `CASH`), `movement_type`, `method_code`, `direction` (`IN`/`OUT`), `amount > 0`, `reference_type`, `reference_id`, `occurred_at`.

| Tipe | Arah |
| --- | --- |
| SHIFT_OPENING | IN |
| CASH_IN_SALE | IN |
| CASH_IN_ONLINE | IN |
| CASH_IN_SERVICE | IN |
| CASH_IN_ADJUSTMENT | IN (selisih shift positif) |
| CASH_OUT_CHANGE | OUT |
| CASH_OUT_REFUND | OUT |
| CASH_OUT_EXPENSE | OUT |
| CASH_OUT_SUPPLIER | OUT |
| SHIFT_CLOSING_DIFFERENCE | IN atau OUT sesuai tanda selisih |

Saldo tunai shift: Σ IN − Σ OUT untuk `method_code = 'CASH'` dan `shift_id` tersebut.

### 21.2 Pengeluaran

`operating_expenses`: `branch_id`, `category` (dari daftar tetap), `amount`, `expense_date`, `requested_by`, `approved_by`, `status` (`PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `PAID`), `receipt_path` (opsional), `period_id`.

Jumlah ≤ Rp 1.000.000: status awal `APPROVED`. Di atas itu: `PENDING_APPROVAL` hingga disetujui pengguna lain dengan `finance.expense.approve`.

`expense_pay(p_expense, p_method)`: menulis `CASH_OUT_EXPENSE`. Tunai memerlukan shift terbuka.

Pengeluaran `APPROVED` atau `PAID` terkunci. Koreksi dilakukan dengan pengeluaran penyesuaian.

### 21.3 Periode Keuangan

`financial_periods`: `branch_id`, `period_start`, `period_end`, `status` (`OPEN`, `CLOSED`), `closed_by`, `closed_at`, `summary jsonb`.

Constraint eksklusi `daterange` per cabang mencegah tumpang tindih.

`fin_period_close(p_branch, p_start, p_end)`: izin `finance.period.close` dengan `aal2`. Prasyarat: tidak ada shift `OPEN` yang tanggalnya dalam periode, tidak ada draft POS lebih dari 24 jam, tidak ada pengeluaran `PENDING_APPROVAL`, tidak ada refund `REQUESTED` dalam periode. Pelanggaran dikembalikan dengan daftar.

Snapshot ringkasan disimpan; periode `CLOSED` tidak dapat dibuka kembali.

Transaksi bertanggal dalam periode `CLOSED` ditolak `PERIOD_CLOSED` (trigger 25.4).

Koreksi periode tertutup dicatat pada periode aktif berikutnya dengan referensi.

### 21.4 Definisi Laporan

| Laporan | Definisi | Sumber |
| --- | --- | --- |
| Penjualan POS | Σ `grand_total` penjualan `COMPLETED`, `PARTIALLY_RETURNED`, dan `RETURNED` pada rentang tanggal, dikurangi nilai retur | `sales`, `sales_returns` |
| Penjualan online | Σ `grand_total` pesanan dengan `payment_status = CONFIRMED` atau setelahnya, dikurangi refund `COMPLETED` | `orders`, `refunds` |
| Penerimaan kas | Σ `cash_movements` `IN` per metode | `cash_movements` |
| Pengeluaran | Σ pengeluaran `APPROVED`/`PAID` pada tanggal pengeluaran | `operating_expenses` |
| Piutang | Σ `balance_due` per umur | `service_invoices` |
| Nilai persediaan | Σ `on_hand × avg_unit_cost` per cabang pada tanggal | `stock_balances`, `product_branch_costs` |
| HPP | Σ `quantity × unit_cost_snapshot` pada penjualan, pengeluaran klinik, pemenuhan pesanan, dikurangi HPP retur layak jual | `sale_items`, `medication_dispensings`, `order_items`, `sales_returns` |
| Laba kotor | Penjualan dikurangi HPP | Turunan |
| Laba rugi sederhana | Laba kotor dikurangi pengeluaran dikurangi kerugian stok | Turunan |
| Arus kas sederhana | Σ kas masuk dikurangi Σ kas keluar | `cash_movements` |
| Kehilangan stok | `quantity_lost` transfer dan penyesuaian `LOST`, `EXPIRY_WRITE_OFF`, `DAMAGED` | `inventory_transfer_items`, `inventory_movements` |
| Stok kedaluwarsa | Batch dengan `expiry_date` dalam 90 hari dan yang sudah kedaluwarsa | `inventory_lots`, `stock_balances` |
| Klinik per dokter | Lihat 17.7 | `visits`, `treatment_records`, `service_invoices` |
| Piutang per pelanggan | Daftar piutang per pelanggan dan umur | `service_invoices` |

Catatan:
- Pembelian bukan beban pada hari pembelian. HPP diakui saat barang terjual atau dipakai.
- Laba rugi berbeda dari arus kas.
- Setiap baris laporan memiliki ID sumber yang dapat ditelusuri.

### 21.5 Fungsi Laporan dan Ekspor

Setiap laporan adalah fungsi SQL `rpt_<nama>(p_branch uuid[], p_from date, p_to date, ...)` yang mengembalikan `setof` baris. Fungsi memeriksa `finance.report.read` atau `report.sales.read` dan memfilter cabang sesuai cakupan.

Ekspor dibuat oleh Edge Function `render-document` (Bagian 24) dengan format `CSV` (UTF-8 dengan BOM) atau `PDF`.

Setiap ekspor menulis audit `report.export` dengan parameter.

Hasil PDF laporan tidak disimpan permanen; setiap permintaan membangun ulang dari data terkini.

---

## 22. Portal Pelanggan

Pelanggan dengan akun dan email terverifikasi dapat:

- Melihat hewan tertaut beserta peran (utama atau sekunder).
- Membuat janji klinik dan booking grooming atau penitipan.
- Melihat riwayat kunjungan dan rekam medis `SIGNED` atau `AMENDED`. Kolom `internal_note` dan observasi internal tidak pernah dikirim ke klien (ditegakkan RLS dan pemilihan kolom).
- Melihat update rawat inap yang dipublikasikan.
- Melihat dan membatalkan pesanan (sesuai aturan 16.2), mengunggah bukti pembayaran.
- Melihat invoice layanan. Wali utama melihat angka tagihan dan saldo. Wali sekunder melihat riwayat tanpa angka tagihan.
- Menyetujui atau menolak layanan tambahan sebagai wali utama.
- Melihat riwayat pembelian POS yang tercatat atas telepon atau email yang sama dengan akun dan sudah terverifikasi.
- Mengubah profil kontak dan alamat sendiri.

Pelanggan tidak dapat melihat stok, HPP, harga pokok, data pelanggan lain, atau data pengguna staf.

---

## 23. Notifikasi dan Email

### 23.1 Saluran

**Dalam aplikasi**: tabel `notifications` (`user_id`, `kind`, `title`, `body`, `entity_type`, `entity_id`, `read_at`, `created_at`). Ditampilkan sebagai ikon lonceng di topbar (staf) dan portal (pelanggan). Realtime tidak digunakan; daftar diperbarui saat halaman dimuat dan saat tombol segarkan ditekan.

**Email**: tabel `sys_email_outbox` diproses oleh Edge Function `dispatch-email`.

### 23.2 Outbox Email

`sys_email_outbox`: `id`, `to_address`, `template` (kode tetap), `payload jsonb`, `status` (`PENDING`, `SENT`, `FAILED`), `attempts`, `next_attempt_at`, `last_error` (tanpa data pribadi), `created_at`, `sent_at`.

Baris ditulis dalam transaksi yang sama dengan peristiwa pemicunya.

`dispatch-email` mengambil hingga 50 baris `PENDING` dengan `next_attempt_at <= now()` menggunakan `FOR UPDATE SKIP LOCKED`, mengirim melalui Resend, dan memperbarui status.

Kegagalan: `attempts + 1`, `next_attempt_at = now() + attempts × 5 menit`. Setelah 6 percobaan, status `FAILED` dan job mencatat peringatan.

### 23.3 Templat dan Isi

| Template | Pemicu | Penerima | Isi yang diizinkan |
| --- | --- | --- | --- |
| ORDER_PLACED | Pesanan dibuat | Pelanggan | Nomor pesanan, total, tautan portal |
| PAYMENT_CONFIRMED | Pembayaran dikonfirmasi | Pelanggan | Nomor pesanan, status fulfillment, tautan |
| PAYMENT_REJECTED | Pembayaran ditolak | Pelanggan | Alasan umum, tautan unggah ulang |
| STOCK_REVIEW | Pesanan masuk review stok | Pelanggan dan staf cabang | Nomor pesanan, tautan |
| FULFILLMENT_UPDATED | Status fulfillment berubah | Pelanggan | Status baru, tautan |
| APPOINTMENT_CHANGED | Janji dibuat, diubah, dibatalkan | Pelanggan dan dokter | Waktu, cabang, tautan |
| BOOKING_CONFIRMED | Booking dikonfirmasi | Pelanggan | Waktu, layanan, tautan |
| HOSPITAL_UPDATE | Update rawat inap | Wali hewan | Tanpa isi update, tautan |
| INVOICE_DUE | Invoice jatuh tempo atau pengingat | Wali utama | Nomor invoice, tanggal jatuh tempo, tautan |
| REFUND_UPDATE | Refund disetujui atau selesai | Pemohon dan pelanggan | Nomor refund, status |
| INVITATION | Undangan staf | Penerima | Tautan undangan (72 jam) |
| CUSTOMER_LINK | Tautan akun pelanggan | Email pelanggan | Tautan (60 menit) |
| JOB_FAILED | Job gagal dua kali | Pemilik dan developer on-call | Nama job, waktu, tautan ke `sys_job_runs` |
| STOCK_RECONCILIATION | Selisih stok | Pemilik | Jumlah produk terdampak, tautan |

Aturan isi: email tidak memuat diagnosis, nama obat, hasil pemeriksaan, rincian item, nominal per item, atau isi update klinis.

Verifikasi email dan reset kata sandi dikirim oleh Supabase Auth dengan SMTP Resend, memakai templat bahasa Indonesia yang dikonfigurasi di dashboard Supabase.

---

## 24. Dokumen dan Laporan Berbasis Edge Function

### 24.1 Edge Function `render-document`

Endpoint: `POST /functions/v1/render-document` dengan body `{ "kind": "...", "id": "...", "format": "pdf" | "csv", "params": {...} }`.

Jenis: `INVOICE_SALE`, `INVOICE_ORDER`, `INVOICE_SERVICE`, `RECEIPT_REFUND`, `RECEIPT_CASH`, `REPORT`.

Autentikasi: JWT pengguna (verifikasi di gateway Supabase). Fungsi memanggil RPC `doc_payload(kind, id, params)` dengan JWT pengguna sehingga RLS dan izin berlaku.

`doc_payload` mengembalikan data yang sudah difilter. Data klinis tidak pernah termasuk dalam jenis invoice.

Output PDF dibuat dengan `pdf-lib`, dikembalikan langsung sebagai `application/pdf` dengan `Content-Disposition: inline; filename="<nomor>.pdf"`. Tidak disimpan.

Output CSV dikembalikan sebagai `text/csv; charset=utf-8` dengan BOM.

Batas waktu fungsi: 60 detik. Laporan lebih dari 50.000 baris ditolak dengan `REPORT_TOO_LARGE` dan pengguna diminta mempersempit rentang.

Setiap render menulis `sys_audit_logs` bila jenisnya `REPORT` atau `RECEIPT_REFUND`.

### 24.2 Isi Dokumen

- **Invoice**: nomor (BR-11), tanggal dan waktu dalam zona cabang, nama dan alamat cabang, logo cabang, pelanggan (jika ada), item, diskon, total, metode pembayaran, saldo (layanan), dan teks "Harga sudah termasuk pajak sesuai ketentuan yang berlaku".
- **Kwitansi refund**: nomor `RFD`, jumlah, alasan, metode, referensi, pelaksana.
- **Laporan**: kop cabang, rentang filter, tanggal cetak, nama pencetak, dan catatan sumber.

### 24.3 Penyimpanan Berkas Hasil

Dokumen tidak disimpan. Jika kebijakan bisnis di masa depan mewajibkan arsip, perubahan dilakukan melalui versi minor baru.

### 24.4 Kode Bersama Edge

Edge Function tidak mengimpor `packages/contracts`. Fungsi format rupiah dan tanggal disalin ke `supabase/functions/_shared/format.ts` dengan skrip `pnpm sync:edge-format` yang membandingkan hasilnya dengan `packages/contracts/src/format.ts` pada tes integrasi (Bagian 33.7). Perbedaan menggagalkan CI.

---

## 25. Basis Data

### 25.1 Konvensi

- Skema utama `public`. Semua tabel memakai RLS. Tidak ada tabel yang tidak memiliki RLS aktif.
- Nama tabel jamak `snake_case`. Nama kolom `snake_case`. Kunci primer `id uuid default gen_random_uuid()`.
- Kolom standar: `created_at timestamptz not null default now()`, `created_by uuid references auth.users(id)` (nullable untuk data sistem), dan bila dapat diubah `updated_at`, `updated_by`.
- Setiap entitas terikat cabang memiliki `branch_id uuid not null`.
- Uang: `numeric(14,2)`. Biaya satuan: `numeric(14,4)`. Qty `COUNT`: `numeric(14,0)`. Qty `WEIGHT`: `numeric(14,3)`.
- Status dan kategori memakai tipe `text` dengan CHECK yang mendaftar nilai, bukan enum PostgreSQL, agar penambahan nilai tidak memerlukan `ALTER TYPE`. Setiap CHECK disusun dalam migration.
- Foreign key memakai `on delete restrict`. `cascade` tidak digunakan.
- Tidak ada `delete` untuk data bisnis melalui klien. Entitas master dinonaktifkan dengan `is_active`.

### 25.2 Daftar Tabel

- **Identitas dan akses**: `profiles`, `roles` (tetap: owner, doctor, admin, customer), `permissions`, `role_permissions`, `user_permission_grants`, `user_branch_access`, `doctor_profiles`, `invitations`, `auth_tokens`, `audit_logs`, `notifications`, `idempotency_keys`, `rate_limits`, `sys_job_runs`, `sys_email_outbox`, `doc_sequences`
- **Cabang**: `branches`, `branch_settings`, `inventory_locations`, `payment_methods`, `branch_payment_methods`, `branch_payment_accounts`
- **Pelanggan dan hewan**: `customers`, `customer_addresses`, `pets`, `pet_guardians`, `pet_documents`
- **Produk dan pembelian**: `product_categories`, `products`, `product_barcodes`, `product_branch_settings`, `product_prices`, `suppliers`, `purchase_orders`, `purchase_order_items`, `goods_receipts`, `goods_receipt_items`, `supplier_returns`, `supplier_return_items`, `supplier_bills`, `supplier_payments`
- **Inventori**: `inventory_lots`, `stock_balances`, `inventory_movements`, `stock_reservations`, `inventory_adjustments`, `count_sessions`, `count_session_items`, `inventory_transfers`, `inventory_transfer_items`, `product_branch_costs`, `cost_history`, `order_review_actions`
- **POS**: `cash_shifts`, `sales`, `sale_items`, `sale_item_lots`, `sale_payments`, `sales_returns`, `sales_return_items`
- **Toko online**: `customer_carts`, `customer_cart_items`, `orders`, `order_items`, `payments`, `order_fulfillments`
- **Refund dan kredit**: `refunds`, `customer_credits`
- **Klinik**: `service_catalog`, `service_prices`, `doctor_schedules`, `appointments`, `visits`, `medical_records`, `medical_record_amendments`, `prescriptions`, `prescription_items`, `treatment_records`, `medication_dispensings`
- **Rawat inap**: `care_units`, `hospitalizations`, `hospitalization_assignments`, `care_observations`, `care_tasks`, `shared_updates`
- **Grooming dan penitipan**: `service_capacity`, `service_bookings`, `service_booking_items`, `boarding_stays`
- **Tagihan dan keuangan**: `service_invoices`, `service_invoice_items`, `service_payments`, `cash_movements`, `operating_expenses`, `financial_periods`

### 25.3 Kolom dan Constraint Kritis

| Tabel | Kolom penting | Constraint |
| --- | --- | --- |
| `profiles` | `id` (= `auth.users.id`), `role`, `display_name`, `phone`, `is_active`, `last_active_at` | CHECK `role in (...)`; `role` tidak dapat diubah klien (kolom dicabut dari grant update) |
| `user_permission_grants` | `user_id`, `permission_code`, `reason`, `granted_by`, `expires_at`, `revoked_at` | Unik parsial `(user_id, permission_code)` where `revoked_at is null` |
| `doctor_profiles` | `user_id`, `str_number`, `is_active` | `str_number` unik; satu profil per user |
| `branches` | `code`, `name`, `timezone`, `address`, `delivery_fee`, `pos_enabled`, `online_enabled`, `is_active` | `code` unik; CHECK `timezone in (...)`; CHECK `delivery_fee >= 0` |
| `customers` | `user_id` (nullable), `name`, `phone`, `email`, `no_show_count`, `is_active` | `user_id` unik jika terisi; `phone` unik per cabang untuk walk-in (indeks parsial) |
| `pets` | identitas dan status (Bagian 12.4) | `microchip` unik jika terisi; CHECK enum spesies dan jenis kelamin; CHECK `is_deceased` konsisten dengan `deceased_at` |
| `pet_guardians` | `pet_id`, `customer_id`, `is_primary`, `started_at`, `ended_at` | Unik parsial `(pet_id)` where `is_primary and ended_at is null` |
| `products` | `sku`, `name`, `category`, `unit_type`, `base_unit`, `track_lot`, `is_prescription`, `is_active`, `image_path` | `sku` unik; CHECK `category = 'MEDICINE'` → `track_lot`; CHECK `is_prescription` → `category = 'MEDICINE'` |
| `product_prices` / `service_prices` | `branch_id`, `price`, `effective_from`, `created_by` | CHECK `price >= 0` dan `price = round(price, 0)`; append-only |
| `product_branch_settings` | `is_pos_sellable`, `is_online_sellable`, `min_stock`, `is_active` | Unik `(product_id, branch_id)`; CHECK produk resep tidak sellable (fungsi validasi dan CHECK pada kolom turunan) |
| `inventory_locations` | `branch_id`, `code`, `type`, `name`, `is_active` | Unik `(branch_id, code)`; unik parsial satu `RETAIL`, satu `CLINIC_PHARMACY` per cabang |
| `inventory_lots` | `product_id`, `location_id`, `lot_number`, `expiry_date`, `received_at` | Unik `(product_id, location_id, lot_number)`; CHECK `expiry_date is not null or lot_number = 'DEFAULT'` |
| `stock_balances` | `product_id`, `location_id`, `lot_id`, `on_hand`, `reserved` | Unik `(product_id, location_id, lot_id)`; CHECK nonnegatif dan `reserved <= on_hand`; trigger penjaga |
| `inventory_movements` | `product_id`, `location_id`, `lot_id`, `movement_type`, `quantity_delta`, `unit_cost_snapshot`, `reference_type`, `reference_id`, `reason_code`, `actor_id`, `occurred_at` | Append-only; CHECK `quantity_delta <> 0` |
| `stock_reservations` | `order_item_id`, `lot_id`, `product_id`, `location_id`, `quantity`, `status` | Unik `(order_item_id, lot_id)`; CHECK `quantity > 0` |
| `product_branch_costs` | `product_id`, `branch_id`, `avg_unit_cost` | Unik `(product_id, branch_id)`; CHECK `avg_unit_cost >= 0` |
| `cash_shifts` | `branch_id`, `cashier_id`, `status`, `opening_cash`, `closing_cash_counted`, `expected_cash`, `difference`, `difference_reason`, `closed_at` | Unik parsial satu `OPEN` per `cashier_id`; trigger penolak perubahan setelah `CLOSED` |
| `sales` | `branch_id`, `shift_id`, `customer_id` (nullable), `invoice_number`, `status`, `subtotal`, `discount_total`, `grand_total`, `completed_at`, `completed_by` | Unik `invoice_number`; CHECK `grand_total >= 0`; CHECK `status = 'COMPLETED'` → `shift_id` dan `completed_at` tidak null |
| `sale_items` | `sale_id`, `product_id`, `quantity`, `unit_price`, `discount_type`, `discount_value`, `line_gross`, `line_discount`, `line_total`, `unit_cost_snapshot`, `returned_quantity` | CHECK `quantity > 0`; CHECK `returned_quantity <= quantity` |
| `sale_item_lots` | `sale_item_id`, `lot_id`, `quantity` | CHECK `quantity > 0` |
| `sale_payments` | `sale_id`, `method_code`, `amount`, `tendered_amount`, `change_amount` | Append-only; CHECK `tendered_amount >= amount` |
| `orders` | `order_number`, `customer_id`, `branch_id`, `delivery_method`, `payment_status`, `fulfillment_status`, `subtotal`, `delivery_fee`, `grand_total`, `payment_instructions_snapshot`, `stock_review_details`, `delivery_address` | CHECK `grand_total = subtotal + delivery_fee`; CHECK status dalam daftar |
| `order_items` | `order_id`, `product_id`, `name_snapshot`, `sku_snapshot`, `unit_price`, `quantity`, `cancelled_quantity`, `fulfilled_quantity` | CHECK `quantity > 0`; CHECK `cancelled_quantity + fulfilled_quantity <= quantity` |
| `payments` | `order_id`, `kind` (`ORDER`, `ADDITIONAL`), `method_code`, `amount`, `status` (`SUBMITTED`, `CONFIRMED`, `REJECTED`), `proof_path`, `submitted_at`, `confirmed_at`, `confirmed_by`, `reviewed_by`, `rejection_reason` | Unik parsial satu `ORDER` aktif per pesanan; CHECK `amount > 0`; trigger transisi status |
| `refunds` | `source_type`, `source_id`, `amount`, `reason`, `status`, `requested_by`, `approved_by`, `completed_by`, `payout_method`, `payout_reference`, `invoice_number` | CHECK `amount > 0`; CHECK `approved_by is null or approved_by <> requested_by`; CHECK `completed_by is null or completed_by <> requested_by`; trigger final |
| `appointments` | `pet_id`, `doctor_id`, `branch_id`, `starts_at`, `ends_at`, `status`, `booked_by`, `reason` | Constraint eksklusi (25.4); CHECK `ends_at > starts_at` |
| `visits` | `pet_id`, `branch_id`, `doctor_id`, `appointment_id`, `status`, `started_at`, `completed_at`, `consent_given_by_name`, `consent_method`, `consent_customer_id`, `weight_kg`, `temperature_c`, `heart_rate`, `respiratory_rate` | Unik `appointment_id` jika terisi; CHECK status dan `completed_at` konsisten |
| `medical_records` | Bagian 17.3 | Unik `visit_id`; trigger penjaga klinis (25.4) |
| `medical_record_amendments` | `medical_record_id`, `reason`, `previous_content`, `new_content`, `amended_by`, `amended_at` | Append-only; CHECK `reason <> ''` |
| `medication_dispensings` | `visit_id`, `hospitalization_id`, `prescription_item_id`, `product_id`, `location_id`, `lot_id`, `quantity`, `unit_cost_snapshot`, `unit_price_snapshot`, `reason`, `dispensed_by` | Append-only; CHECK `quantity > 0`; CHECK tepat satu dari `visit_id`/`hospitalization_id` terisi |
| `care_units` | `branch_id`, `code`, `name`, `type`, `capacity`, `is_active` | Unik `(branch_id, code)`; CHECK `capacity >= 1` |
| `hospitalization_assignments` | `hospitalization_id`, `unit_id`, `start_at`, `end_at` | CHECK `end_at > start_at`; kapasitas dijaga fungsi dengan kunci unit |
| `care_observations` | `hospitalization_id`, `observation_type`, `observed_at`, `values`, `note`, `recorded_by`, `medication_dispensing_id` | Append-only |
| `shared_updates` | `hospitalization_id`, `update_type`, `body`, `published_at`, `published_by` | Append-only; CHECK `published_at is not null`; CHECK `length(body) <= 4000` |
| `service_bookings` | `branch_id`, `pet_id`, `booked_by`, `service_id`, `type`, `status`, `starts_at`, `ends_at` | CHECK `ends_at > starts_at` |
| `service_invoices` | Bagian 20.1 | CHECK `balance_due = grand_total − amount_paid` dan `balance_due >= 0`; unik parsial `(source_type, source_id)` where `status <> 'VOIDED'` |
| `service_payments` | Bagian 20.2 | Append-only; CHECK `amount <> 0`; CHECK `is_correction` mengharuskan `correction_reason` |
| `customer_credits` | `customer_id`, `source_type`, `source_id`, `amount`, `used_amount` | CHECK `used_amount <= amount` dan `amount > 0` |
| `cash_movements` | Bagian 21.1 | Append-only; CHECK `amount > 0`; CHECK `method_code = 'CASH'` → `shift_id` tidak null; CHECK `direction` konsisten dengan `movement_type` |
| `operating_expenses` | Bagian 21.2 | CHECK `approved_by is null or approved_by <> requested_by` |
| `financial_periods` | Bagian 21.3 | Constraint eksklusi `daterange` per cabang |
| `doc_sequences` | `branch_id`, `doc_type`, `year`, `last_number` | Unik `(branch_id, doc_type, year)` |
| `audit_logs` | `actor_id`, `action`, `entity_type`, `entity_id`, `branch_id`, `reason`, `request_id`, `metadata`, `occurred_at` | Append-only |
| `idempotency_keys` | `user_id`, `scope`, `key`, `request_hash`, `result`, `created_at` | Unik `(user_id, scope, key)`; `result` nullable sampai selesai |
| `rate_limits` | `key`, `window_start`, `count` | Unik `key` |
| `sys_job_runs` | `job_name`, `started_at`, `finished_at`, `status`, `detail` | Append-only |
| `sys_email_outbox` | Bagian 23.2 | Indeks `(status, next_attempt_at)` |

### 25.4 Constraint Eksklusi, Trigger, dan Fungsi Penjaga

**Constraint eksklusi janji dokter**:

```sql
create extension if not exists btree_gist;
alter table public.appointments add constraint appointments_no_overlap
exclude using gist (
  doctor_id with =,
  tstzrange(starts_at, ends_at) with &&
) where (status in ('SCHEDULED','CHECKED_IN','IN_CONSULTATION') and doctor_id is not null);
```

**Constraint eksklusi periode keuangan**:

```sql
alter table public.financial_periods add constraint financial_periods_no_overlap
exclude using gist (
  branch_id with =,
  daterange(period_start, period_end, '[]') with &&
);
```

**Fungsi penolak perubahan (append-only)**:

```sql
create or replace function public.sys_deny_mutation() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception 'APPEND_ONLY' using errcode = 'P0001',
    detail = format('tabel %s tidak dapat diubah atau dihapus', tg_table_name);
end $$;
```

Dipasang sebagai `before update or delete ... for each row` pada: `inventory_movements`, `cash_movements`, `audit_logs`, `medical_record_amendments`, `shared_updates`, `sale_payments`, `product_prices`, `service_prices`, `cost_history`, `care_observations`, `medication_dispensings`, `service_payments`, `sys_job_runs`, `goods_receipts`, `goods_receipt_items`, `order_fulfillments`, `order_review_actions`.

**Penjaga rekam medis**:

Saat `OLD.status in ('SIGNED','AMENDED')`, setiap perubahan pada `chief_complaint`, `history`, `physical_exam`, `diagnosis`, `treatment_plan`, `follow_up_date`, `clinical_data`, atau `internal_note` ditolak dengan `MEDICAL_RECORD_LOCKED`, kecuali `current_setting('app.clinical_amend', true) = 'on'` dan `NEW.status = 'AMENDED'`.

`DELETE` ditolak jika `OLD.status <> 'DRAFT'`.

Perubahan status `SIGNED` ke `VOIDED` ditolak.

**Penjaga transisi pembayaran**:

Transisi `payments.status` hanya dari `SUBMITTED` ke `CONFIRMED` atau `REJECTED`. Lainnya ditolak `INVALID_PAYMENT_TRANSITION`.

**Penjaga refund final**:

Refund `COMPLETED` dan `REJECTED` tidak dapat berubah. Transisi `REQUESTED` ke `APPROVED` atau `REJECTED`, dan `APPROVED` ke `COMPLETED`, dijaga trigger.

**Penjaga shift tertutup**:

Shift `CLOSED` tidak dapat diubah kecuali oleh fungsi penutupan dengan flag `app.shift_close` yang disetel di dalam transaksi tersebut.

**Penjaga saldo stok**:

`stock_balances` hanya dapat diubah jika `current_setting('app.stock_write', true) = 'on'`. Fungsi inventori menyetel flag ini dengan `set_config(..., true)` di awal transaksi.

**Penjaga periode**:

Insert atau update pada tabel bertanggal (`cash_movements`, `sales`, `operating_expenses`, `service_payments`, `refunds`) yang `occurred_at` (atau tanggal relevan) berada dalam periode `CLOSED` cabang tersebut ditolak `PERIOD_CLOSED`. Fungsi `sys_assert_period_open(branch, timestamp)` dipanggil dari trigger.

**Penjaga kolom profil**:

`profiles.role`, `profiles.is_active`, dan kolom sensitif lain tidak dapat diubah oleh peran `authenticated`. Pembaruan hanya melalui fungsi yang memeriksa izin `user.manage`.

### 25.5 Indeks

Indeks dibuat untuk pola kueri yang dipakai, bukan untuk semua kolom:

- Pencarian produk: `products(sku)`, `product_barcodes(barcode)`, GIN trigram `products(name gin_trgm_ops)`.
- Saldo: `stock_balances(location_id, product_id)`; batch: `inventory_lots(product_id, location_id, expiry_date)`.
- Ledger: `inventory_movements(product_id, location_id, occurred_at)`; kas: `cash_movements(branch_id, occurred_at)`.
- Penjualan: `sales(branch_id, completed_at)`; pesanan: `orders(branch_id, fulfillment_status)`, `orders(customer_id, created_at)`.
- Klinik: `visits(pet_id, started_at)`; janji: `appointments(branch_id, starts_at)`.
- Audit: `audit_logs(entity_type, entity_id)`, `audit_logs(branch_id, occurred_at)`.
- Outbox: `sys_email_outbox(status, next_attempt_at)`.
- Notifikasi: `notifications(user_id, read_at)`.

Indeks tambahan hanya ditambahkan setelah `EXPLAIN ANALYZE` pada data uji menunjukkan kebutuhan, dan dicatat di migration.

### 25.6 Ringkasan RLS

| Tabel atau grup | Select | Insert, update, delete langsung dari klien |
| --- | --- | --- |
| `profiles` | Diri sendiri; `user.manage` atau `audit.read` untuk cabang | Update kolom profil diri sendiri yang diizinkan (`display_name`, `phone`) |
| Tabel stok, kas, penjualan, pesanan, klinik, rawat, layanan, keuangan | Staf dengan izin baca dan cakupan cabang; pelanggan untuk data miliknya sesuai BR-01 dan Bagian 22 | Tidak ada |
| `products`, `product_prices`, `service_catalog` | Semua staf dan publik untuk produk aktif online (kolom terbatas via view `v_catalog`) | Tidak ada |
| `customers` (diri sendiri) | Pelanggan | Update kolom kontak diri sendiri melalui fungsi `customer_update_self` |
| `customer_carts`, `customer_cart_items` | Pelanggan pemiliknya | Tidak ada (melalui fungsi keranjang) |
| `notifications` | Penerima | Update `read_at` melalui fungsi `notification_mark_read` |
| `sys_email_outbox`, `sys_job_runs`, `rate_limits`, `idempotency_keys`, `doc_sequences` | Tidak ada untuk klien | Tidak ada untuk klien |
| `audit_logs` | `audit.read` (MFA) dengan cakupan cabang | Tidak ada |

Aturan umum: setiap tabel bisnis memiliki kebijakan `select` yang memanggil `pos_has_permission` atau `pos_is_customer_of_*`. Tidak ada kebijakan `using (true)` untuk tabel bisnis. Tidak ada kebijakan `insert`, `update`, atau `delete` untuk `authenticated` pada tabel bisnis kecuali yang tercantum.

Kebijakan select pada `medical_records` untuk pelanggan memakai view `v_customer_medical_records` yang hanya memilih kolom yang diizinkan. Tabel dasar tidak diberi grant select kepada peran `authenticated` untuk pelanggan.

---

## 26. Fungsi Database (RPC)

### 26.1 Konvensi Nama

Awalan menunjukkan domain: `auth_`, `inv_`, `po_`, `pos_`, `shop_`, `ord_`, `clin_`, `medical_record_`, `visit_`, `hosp_`, `groom_`, `booking_`, `bill_`, `refund_`, `fin_`, `rpt_`, `doc_`, `sys_`, `customer_`, `branch_`, `product_`, `invitation_`, `notification_`.

### 26.2 Standar Fungsi Mutasi

Setiap fungsi mutasi:
- Berbentuk `security definer`, `set search_path = public, pg_temp`, dan `language plpgsql`.
- Dimulai dengan `pos_current_actor()` dan pemeriksaan izin yang sesuai dengan `pos_has_permission`.
- Menerima `p_idempotency_key uuid` jika mengubah data bisnis penting (Bagian 26.3).
- Mengambil kunci sesuai urutan di Bagian 26.4.
- Menulis `audit_logs` untuk perubahan kritis (BR-36).
- Mengembalikan `jsonb` hasil ringkas dengan ID dan status baru.
- Melempar error domain dengan kode dari Bagian 31.
- Dieksekusi dengan `grant execute ... to authenticated` dan `revoke execute ... from anon, public`. Fungsi yang boleh dipanggil anon (`auth_login_precheck`, `auth_record_failed_login`, `invitation_preview`) didaftarkan secara eksplisit.

Contoh pembungkus error:

```sql
raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001',
  detail = jsonb_build_object('items', v_short_items)::text;
```

### 26.3 Idempotensi di Basis Data

```sql
-- awal fungsi mutasi
insert into public.idempotency_keys (user_id, scope, key, request_hash)
values (auth.uid(), 'pos_sale_complete', p_idempotency_key, v_hash)
on conflict (user_id, scope, key) do nothing
returning id into v_idem_id;

if v_idem_id is null then
  select request_hash, result into v_prev_hash, v_prev_result
  from public.idempotency_keys
  where user_id = auth.uid() and scope = 'pos_sale_complete' and key = p_idempotency_key;
  if v_prev_hash <> v_hash then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
  end if;
  if v_prev_result is null then
    raise exception 'CONFLICT' using errcode = 'P0001',
      detail = 'Permintaan sedang diproses, coba lagi sebentar';
  end if;
  return v_prev_result;
end if;

-- ... logika bisnis ...

update public.idempotency_keys set result = v_result where id = v_idem_id;
```

Perilaku konkurensi: `insert ... on conflict do nothing` pada permintaan kedua menunggu transaksi pertama selesai. Jika transaksi pertama gagal, baris tidak pernah ada dan permintaan kedua berhasil memasukkan baris sendiri. Jika transaksi pertama berhasil, permintaan kedua membaca `result` yang sudah tersimpan.

`v_hash` adalah `sha256` dari representasi JSON kanonik argumen (`jsonb` terurut), dihitung dengan `digest(p_payload::text, 'sha256')` pada payload yang sudah dinormalkan oleh pemanggil.

Kunci kedaluwarsa setelah 24 jam dan dihapus oleh job harian.

### 26.4 Urutan Penguncian

Setiap fungsi yang mengubah stok, kas, atau status bisnis mengunci sesuai urutan:

1. Dokumen induk: `sales`, `orders`, `visits`, `hospitalizations`, `service_invoices`, `purchase_orders`, `inventory_transfers`, `refunds`, `count_sessions`.
2. Pembayaran: `payments`, `sale_payments`, `service_payments`.
3. `stock_balances` urut `(product_id, location_id, lot_id)` menaik.
4. `product_branch_costs` urut `(product_id, branch_id)` menaik.
5. `care_units` urut `id` menaik.
6. `doc_sequences` urut `(branch_id, doc_type, year)`.
7. `cash_shifts`.

Helper `sys_lock_stock(p_keys)` menerima array kunci, mengurutkannya, dan mengunci dengan `select ... order by ... for update` dalam satu pernyataan.

### 26.5 Katalog Fungsi

**Identitas dan sesi**:

| Fungsi | Izin | Keterangan |
| --- | --- | --- |
| `auth_touch()` | Pengguna aktif | Memperbarui `last_active_at`, melempar `SESSION_IDLE` untuk staf idle 8 jam |
| `auth_login_precheck(p_email)` | anon | Mengembalikan `{locked: bool, retry_after_seconds}` |
| `auth_record_failed_login(p_email)` | anon, dibatasi laju | Mencatat kegagalan login |
| `bootstrap_first_owner(p_user_id)` | Hanya peran `postgres` (SQL editor) | Membuat owner pertama, gagal jika sudah ada owner |
| `invitation_create(p_email, p_role, p_branch_ids, p_str_number)` | `user.manage` (MFA) | Menulis undangan dan outbox |
| `invitation_preview(p_token)` | anon | Mengembalikan peran dan cabang undangan jika valid |
| `invitation_accept(p_token)` | Pengguna terautentikasi | Membuat profil, akses cabang, profil dokter |
| `user_set_active(p_user, p_active)` | `user.manage` (MFA) | Menonaktifkan atau mengaktifkan pengguna |
| `user_set_branches(p_user, p_branch_ids)` | `user.manage` (MFA) | Mengganti cakupan cabang |
| `permission_grant(p_user, p_code, p_reason, p_expires_at)` | `user.manage` (MFA) | Menulis grant |
| `permission_revoke(p_grant, p_reason)` | `user.manage` (MFA) | Mencabut grant |
| `customer_link_request(p_customer, p_email)` | `customer.manage` | Mengirim tautan akun |
| `customer_link_accept(p_token)` | Pengguna terautentikasi | Menautkan akun pelanggan |
| `customer_update_self(p_fields)` | Pelanggan | Memperbarui kontak sendiri |
| `customer_anonymize(p_customer, p_confirm_code)` | `owner` (MFA) | Anonimisasi dua langkah |

**Cabang, master, dan konfigurasi**:

| Fungsi | Izin | Keterangan |
| --- | --- | --- |
| `branch_upsert(p_branch, p_fields)` | `branch.manage` | Membuat atau mengubah cabang; membuat lokasi wajib saat pembuatan |
| `branch_set_payment_method(p_branch, p_method, p_enabled, p_sort)` | `settings.manage` | Mengaktifkan metode per cabang |
| `branch_set_payment_account(p_branch, p_account)` | `settings.manage` | Menyimpan rekening atau instruksi |
| `product_upsert(p_product, p_fields)` | `product.manage` | Master produk |
| `product_set_barcode(p_product, p_barcode, p_remove)` | `product.manage` | Barcode |
| `product_set_branch_setting(p_product, p_branch, p_fields)` | `product.manage` | Status jual dan stok minimum |
| `product_set_price(p_product, p_branch, p_price, p_effective_from)` | `price.manage` | Menambah baris harga |
| `service_set_price(p_service, p_branch, p_price, p_effective_from)` | `price.manage` | Harga layanan |
| `supplier_upsert(p_supplier, p_fields)` | `purchase.manage` | Supplier |

**Inventori**:

| Fungsi | Izin | Keterangan |
| --- | --- | --- |
| `inv_receive_opening_balance(p_branch, p_location, p_lines, p_idempotency_key)` | `inventory.adjust` (owner) | Saldo awal, satu kali per lokasi, dicatat sebagai `OPENING_BALANCE` |
| `inv_adjust(p_branch, p_location, p_product, p_lot, p_delta, p_reason, p_note, p_unit_cost, p_idempotency_key)` | `inventory.adjust` | Penyesuaian stok |
| `inv_count_open(p_location)` | `inventory.count` | Membuka sesi opname |
| `inv_count_save_line(p_session, p_product, p_lot, p_counted_qty)` | `inventory.count` | Menyimpan hitungan |
| `inv_count_close(p_session, p_idempotency_key)` | `inventory.count` | Membuat penyesuaian dan menutup sesi |
| `inv_transfer_create(p_from_location, p_to_location, p_lines, p_note)` | `inventory.transfer.create` | Membuat transfer |
| `inv_transfer_approve(p_transfer)` | `inventory.transfer.approve` (MFA) | Menyetujui transfer antarcabang |
| `inv_transfer_dispatch(p_transfer, p_idempotency_key)` | `inventory.transfer.create` | Mengirim transfer |
| `inv_transfer_receive(p_transfer, p_lines, p_idempotency_key)` | `inventory.transfer.receive` | Menerima transfer |
| `inv_transfer_cancel(p_transfer, p_reason)` | `inventory.transfer.create` | Membatalkan sebelum kirim |

**Pembelian**:

| Fungsi | Izin | Keterangan |
| --- | --- | --- |
| `po_create(p_branch, p_supplier, p_lines)` | `purchase.manage` | Membuat `DRAFT` |
| `po_update(p_po, p_lines)` | `purchase.manage` | Hanya `DRAFT` |
| `po_submit(p_po)` | `purchase.manage` | `DRAFT` ke `SUBMITTED` |
| `po_cancel(p_po, p_reason)` | `purchase.manage` | Sebelum penerimaan pertama |
| `inv_receive_goods(p_po, p_lines, p_over_receipt_reason, p_idempotency_key)` | `purchase.manage` | Penerimaan barang |
| `po_supplier_return_create(p_receipt_line, p_quantity, p_reason, p_idempotency_key)` | `purchase.manage` | Retur supplier |
| `po_supplier_bill_create(p_supplier, p_bill_number, p_bill_date, p_due_date, p_total)` | `purchase.manage` | Tagihan supplier |
| `po_supplier_payment_record(p_bill, p_method, p_amount, p_idempotency_key)` | `cash_shift.manage` atau `finance.expense.create` | Pembayaran tagihan supplier |

**POS**:

| Fungsi | Izin | Keterangan |
| --- | --- | --- |
| `pos_shift_open(p_branch, p_opening_cash)` | `cash_shift.manage` | Membuka shift |
| `pos_shift_close(p_shift, p_counted_cash, p_difference_reason)` | `cash_shift.manage` | Menutup shift |
| `pos_draft_save(p_sale, p_branch, p_shift, p_customer, p_lines, p_discounts)` | `pos.sell` | Draft dan hitung ulang |
| `pos_draft_void(p_sale)` | `pos.sell` (pembuat draft) | Membatalkan draft |
| `pos_verify_owner_password(p_password)` | Pengguna `owner` | Verifikasi konfirmasi diskon di atas 10% |
| `pos_sale_complete(p_sale, p_payments, p_idempotency_key)` | `pos.sell` | Penyelesaian penjualan |
| `pos_return_create(p_sale, p_lines, p_idempotency_key)` | `pos.return.request` | Retur |

**Toko online**:

| Fungsi | Izin | Keterangan |
| --- | --- | --- |
| `shop_catalog_list(p_branch, p_category, p_query, p_cursor)` | anon dan authenticated | Katalog publik |
| `shop_cart_set_item(p_branch, p_product, p_quantity)` | `cart.use` | Keranjang |
| `ord_place(p_branch, p_delivery_method, p_address, p_idempotency_key)` | `cart.use` | Membuat pesanan |
| `ord_cancel_by_customer(p_order, p_reason)` | Pelanggan pemilik | Pembatalan sebelum konfirmasi |
| `ord_submit_payment(p_order, p_method, p_object_path, p_idempotency_key)` | Pelanggan pemilik | Klaim pembayaran |
| `ord_reject_payment(p_payment, p_reason)` | `payment.review` | Menolak bukti |
| `ord_confirm_payment(p_order, p_payment, p_idempotency_key)` | `payment.confirm` (MFA) | Konfirmasi dan alokasi |
| `ord_resolve_stock_review(p_order, p_action, p_details, p_idempotency_key)` | `stock_review.resolve` | Tindakan review stok |
| `ord_advance_fulfillment(p_order, p_to_status, p_details)` | `fulfillment.manage` | Transisi fulfillment |

**Klinik**:

| Fungsi | Izin | Keterangan |
| --- | --- | --- |
| `schedule_upsert(p_doctor, p_branch, p_day, p_start, p_end, p_slot)` | `schedule.manage` | Jadwal dokter |
| `appointment_book(p_pet, p_doctor, p_branch, p_starts_at, p_reason, p_idempotency_key)` | `appointment.manage` atau pelanggan wali | Membuat janji |
| `appointment_set_status(p_appointment, p_status, p_reason)` | `appointment.manage` | Mengubah status janji |
| `visit_open(p_appointment, p_pet, p_branch, p_doctor, p_vitals, p_consent)` | `visit.manage` | Membuka kunjungan |
| `visit_close(p_visit)` | `visit.manage` (M) | Menutup kunjungan dan membuat invoice |
| `medical_record_save_draft(p_visit, p_fields)` | `medical_record.write` (M, C) | Draf |
| `medical_record_void(p_record, p_reason)` | `medical_record.write` (M, C, pembuat) | Membatalkan draf |
| `medical_record_sign(p_record, p_idempotency_key)` | `medical_record.sign` (MFA, M, C) | Tanda tangan |
| `medical_record_amend(p_record, p_reason, p_new_content, p_idempotency_key)` | `medical_record.amend` (MFA, C, penanda asli) | Amendemen |
| `prescription_save(p_visit, p_items)` | `prescription.write` (C) | Resep draf |
| `prescription_sign(p_prescription)` | `medical_record.sign` (MFA, C) | Tanda tangan resep |
| `prescription_cancel(p_prescription, p_reason)` | `prescription.write` (C) | Pembatalan resep |
| `medication_dispense(p_visit, p_hospitalization, p_product, p_quantity, p_reason, p_prescription_item, p_idempotency_key)` | `medication.dispense` (C, B) | Pengeluaran obat |
| `treatment_record_add(p_visit, p_service, p_note, p_fee)` | `visit.manage` (M) | Tindakan |

**Rawat inap**:

| Fungsi | Izin | Keterangan |
| --- | --- | --- |
| `hosp_admit(p_pet, p_branch, p_unit, p_start_at, p_doctor, p_idempotency_key)` | `hospitalization.manage` | Memulai episode |
| `hosp_assign_unit(p_hospitalization, p_unit)` | `hospitalization.manage` | Pindah unit |
| `hosp_cancel(p_hospitalization, p_reason)` | `hospitalization.manage` | Hanya `PLANNED` |
| `hosp_observation_add(p_hospitalization, p_type, p_observed_at, p_values, p_note, p_medication_dispensing)` | `hospitalization.observe` (C, B) | Observasi |
| `hosp_task_set_status(p_task, p_status)` | `hospitalization.observe` | Tugas |
| `hosp_publish_update(p_hospitalization, p_type, p_body, p_idempotency_key)` | `hospitalization.publish_update` (C, M) | Update pelanggan |
| `hosp_discharge_start(p_hospitalization)` | `hospitalization.manage` (C) | Mulai pulang |
| `hosp_discharge_complete(p_hospitalization)` | `hospitalization.manage` (C) | Selesai pulang |

**Grooming dan penitipan**:

| Fungsi | Izin | Keterangan |
| --- | --- | --- |
| `groom_generate_slots(p_branch, p_service, p_date)` | `grooming.manage` | Membuat slot kapasitas |
| `booking_request(p_pet, p_service, p_branch, p_starts_at, p_note)` | Pelanggan wali | Permintaan booking |
| `booking_create(p_pet, p_service, p_branch, p_starts_at, p_note)` | `grooming.manage` | Booking langsung |
| `booking_set_status(p_booking, p_status, p_reason)` | `grooming.manage` | Konfirmasi dan batal |
| `booking_reschedule(p_booking, p_starts_at)` | `grooming.manage` atau pelanggan (sesuai aturan) | Jadwal baru |
| `booking_addon_add(p_booking, p_service)` | `grooming.manage` | Layanan tambahan |
| `booking_addon_decide(p_item, p_decision, p_method, p_approver_name)` | Wali utama atau `grooming.manage` | Persetujuan |
| `booking_check_in(p_booking, p_condition, p_weight_kg)` | `grooming.manage` | Check-in |
| `booking_check_out(p_booking, p_condition, p_final_services)` | `grooming.manage` | Check-out dan invoice |

**Tagihan dan refund**:

| Fungsi | Izin | Keterangan |
| --- | --- | --- |
| `bill_invoice_from_source(p_source_type, p_source_id)` | `service_invoice.manage` | Membuat invoice |
| `bill_item_add(p_invoice, p_item)` | `service_invoice.manage` | Menambah item |
| `bill_discount_set(p_invoice, p_amount, p_reason)` | `service_invoice.discount` (owner) | Diskon |
| `bill_invoice_void(p_invoice, p_reason)` | `service_invoice.void` (MFA) | Void tanpa pembayaran |
| `bill_payment_record(p_invoice, p_method, p_amount, p_reference, p_idempotency_key)` | `service_invoice.manage` | Pembayaran |
| `bill_payment_correct(p_payment, p_reason)` | `finance.cash.read` (MFA) | Koreksi |
| `bill_overpayment_resolve(p_invoice, p_action)` | `service_invoice.manage` | Kredit atau refund |
| `bill_credit_apply(p_invoice, p_amount)` | `service_invoice.manage` | Pakai kredit |
| `refund_request(p_source_type, p_source_id, p_amount, p_reason)` | `refund.request` | Permintaan refund |
| `refund_approve(p_refund)` | `refund.approve` (MFA) | Persetujuan |
| `refund_reject(p_refund, p_reason)` | `refund.approve` (MFA) | Penolakan |
| `refund_complete(p_refund, p_payout_method, p_reference, p_idempotency_key)` | `refund.complete` (MFA) | Penyelesaian |

**Keuangan dan laporan**:

| Fungsi | Izin | Keterangan |
| --- | --- | --- |
| `expense_create(p_branch, p_category, p_amount, p_date, p_note)` | `finance.expense.create` | Pengeluaran |
| `expense_approve(p_expense)` | `finance.expense.approve` (MFA) | Persetujuan |
| `expense_reject(p_expense, p_reason)` | `finance.expense.approve` (MFA) | Penolakan |
| `expense_pay(p_expense, p_method, p_idempotency_key)` | `finance.expense.create` | Pembayaran pengeluaran |
| `fin_period_close(p_branch, p_start, p_end)` | `finance.period.close` (MFA) | Penutupan |
| `rpt_sales(p_branches, p_from, p_to)` | `report.sales.read` atau `finance.report.read` | Laporan penjualan |
| `rpt_online(p_branches, p_from, p_to)` | `finance.report.read` | Penjualan online |
| `rpt_stock(p_branches, p_as_of)` | `inventory.read` | Stok per produk |
| `rpt_stock_expiry(p_branches, p_days)` | `inventory.read` | Kedaluwarsa |
| `rpt_stock_loss(p_branches, p_from, p_to)` | `finance.report.read` | Kehilangan stok |
| `rpt_clinic_doctors(p_branches, p_from, p_to)` | `visit.manage` atau owner | Laporan dokter |
| `rpt_receivables(p_branches, p_as_of)` | `finance.report.read` | Piutang |
| `rpt_cash(p_branches, p_from, p_to)` | `finance.cash.read` | Kas |
| `rpt_pnl(p_branches, p_from, p_to)` | `finance.report.read` | Laba rugi sederhana |
| `doc_payload(p_kind, p_id, p_params)` | Sesuai jenis | Data untuk Edge Function |

**Notifikasi dan sistem**:

| Fungsi | Izin | Keterangan |
| --- | --- | --- |
| `notification_mark_read(p_ids)` | Pemilik notifikasi | Menandai dibaca |
| `sys_run_job(p_job)` | Hanya pg_cron dan peran service | Menjalankan job berbasis SQL |
| `sys_audit_export_cursor()` | Hanya pg_cron | Penanda ekspor audit |
| `sys_health()` | anon | Status DB dan outbox (tanpa detail) |

### 26.6 Pemeriksaan Izin di Fungsi

Setiap fungsi di tabel 26.5 memanggil `pos_has_permission` dengan kode izin yang tercantum. Cakupan cabang dicek dengan `pos_has_permission(code, branch_id)`, dan objek spesifik dicek dengan parameter objek. Fungsi tidak mengandalkan pemeriksaan di Server Action.

---

## 27. Storage

### 27.1 Bucket

| Bucket | Publik | Batas ukuran | Tipe izin | Tujuan |
| --- | --- | --- | --- | --- |
| `branding` | Ya | 2 MB | JPEG, PNG, WEBP | Logo cabang |
| `product-images` | Ya | 2 MB | JPEG, PNG, WEBP | Foto produk |
| `payment-proofs` | Tidak | 5 MB | JPEG, PNG, PDF | Bukti transfer |
| `medical-documents` | Tidak | 20 MB | PDF, JPEG, PNG | Dokumen medis |
| `pet-photos` | Tidak | 5 MB | JPEG, PNG, WEBP | Foto hewan dan kondisi booking |

Batas dan tipe diatur di konfigurasi bucket (migration) sehingga Supabase menolak unggahan di atas batas, selain pemeriksaan di fungsi.

### 27.2 Konvensi Path

| Bucket | Path |
| --- | --- |
| `branding` | `{branch_id}/logo-{uuid}.{ext}` |
| `product-images` | `{product_id}/{uuid}.{ext}` |
| `payment-proofs` | `{order_id}/{uuid}.{ext}` |
| `medical-documents` | `{pet_id}/{visit_id}/{uuid}.{ext}` |
| `pet-photos` | `{pet_id}/{uuid}.{ext}` atau `{pet_id}/bookings/{booking_id}/{uuid}.{ext}` |

Segmen pertama path selalu merupakan ID entitas yang dipakai RLS untuk pemeriksaan.

### 27.3 Kebijakan `storage.objects`

Fungsi pembantu `sys_storage_can_read(bucket, name)` dan `sys_storage_can_write(bucket, name)` menerjemahkan path menjadi entitas dan memanggil logika izin yang sama dengan fungsi RPC.

- `product-images`: baca publik. Tulis oleh `product.manage` untuk produk di path.
- `branding`: baca publik. Tulis oleh `branch.manage`.
- `payment-proofs`: baca oleh pemilik pesanan dan `payment.review` untuk cabang pesanan. Tulis oleh pemilik pesanan saat status pesanan `UNPAID` atau pembayaran terakhir `REJECTED`. Hapus tidak diizinkan.
- `medical-documents`: baca dan tulis oleh dokter yang berhak atas kunjungan (`medical_record.read` atau `medical_record.write`). Pelanggan wali membaca dokumen yang ditandai `customer_visible` (kolom metadata pada `pet_documents`). Hapus tidak diizinkan.
- `pet-photos`: baca dan tulis oleh staf `pet.manage` atau wali hewan. Hapus oleh `pet.manage` saja.

Semua kebijakan `select` berlaku pada `storage.objects` melalui `using (...)`. Kebijakan `insert` memakai `with check (...)`.

### 27.4 Unggahan dan Unduhan

Unggahan dari klien memakai `supabase.storage.from(bucket).upload(path, file, { upsert: false })`. Kebijakan `insert` memastikan izin. Setelah unggahan, klien memanggil RPC yang mengaitkan objek dengan entitas (`ord_submit_payment`, `pet_document_attach`, dan sejenisnya).

RPC pengaitan memeriksa objek ada di `storage.objects` dengan `owner = auth.uid()` dan path sesuai, lalu memverifikasi `metadata->>'mimetype'` dan `metadata->>'size'`.

Unduhan dilakukan server action yang memanggil `createSignedUrl(path, 300)` setelah RLS berhasil dibaca melalui RPC izin. URL berlaku 5 menit dan tidak disimpan.

Bucket `product-images` dan `branding` memakai URL publik dengan transformasi gambar Supabase (`width`, `quality`) untuk ukuran tampilan.

### 27.5 Retensi Berkas

- Bukti pembayaran dan dokumen medis tidak dihapus selama masa retensi BR-27.
- Foto hewan dihapus hanya jika hewan dihapus dari sistem (tidak terjadi pada versi 1.0.0; hewan tidak dihapus).
- Berkas yatim (diunggah tetapi tidak dikaitkan) lebih dari 24 jam dihapus oleh job harian. Job membandingkan `storage.objects` dengan tabel kaitan.

---

## 28. Edge Functions

### 28.1 Daftar

| Fungsi | Pemicu | Tugas | Autentikasi |
| --- | --- | --- | --- |
| `render-document` | HTTP dari web | PDF dan CSV dokumen dan laporan | JWT pengguna |
| `dispatch-email` | pg_cron tiap menit | Mengirim outbox melalui Resend | Header `x-cron-secret` |
| `storage-orphan-sweep` | pg_cron harian | Menghapus berkas yatim | Header `x-cron-secret` |

Fungsi lain tidak dibuat pada versi 1.0.0.

### 28.2 Kontrak `render-document`

Permintaan: `POST /functions/v1/render-document`, `Authorization: Bearer <access_token>`, `Content-Type: application/json`.

Body: `{ "kind": "INVOICE_SALE" | "INVOICE_ORDER" | "INVOICE_SERVICE" | "RECEIPT_REFUND" | "RECEIPT_CASH" | "REPORT", "id": "uuid" | null, "format": "pdf" | "csv", "params": { ... } }`.

Respons sukses: badan biner PDF atau CSV dengan header yang tepat.

Respons gagal: JSON `{ "error": { "code", "message", "request_id" } }` dengan HTTP sesuai Bagian 31.

Langkah internal: verifikasi JWT (gateway), panggil `doc_payload` dengan `supabase` klien berisi JWT pengguna, render, kembalikan.

Batas: 60 detik, ukuran laporan maksimum 50.000 baris.

### 28.3 Kontrak `dispatch-email`

Dipanggil pg_cron dengan `net.http_post` dan header `x-cron-secret` yang diambil dari Vault.

Mengambil hingga 50 baris dengan `FOR UPDATE SKIP LOCKED` melalui fungsi `sys_email_claim(50)`.

Mengirim melalui `https://api.resend.com/emails` dengan kunci `RESEND_API_KEY`.

Memperbarui hasil melalui `sys_email_mark(id, ok, error)`.

### 28.4 Kode Bersama

- `_shared/format.ts`: format rupiah dan tanggal, disalin dari `packages/contracts`. Dicek oleh tes integrasi (33.7).
- `_shared/errors.ts`: pemetaan kode error ke HTTP.
- `_shared/supabase.ts`: pembuatan klien dari header Authorization.

Tidak ada impor dari luar folder `supabase/functions`.

### 28.5 Deploy dan Rahasia

`supabase functions deploy render-document --no-verify-jwt=false` (verifikasi JWT aktif). `dispatch-email` dan `storage-orphan-sweep` dideploy dengan `--no-verify-jwt` karena dilindungi header `x-cron-secret`.

Rahasia: `supabase secrets set RESEND_API_KEY=... EMAIL_FROM=... APP_URL=...`.

Lokal: `supabase functions serve` dengan berkas `supabase/.env.local`.

---

## 29. Penjadwalan (pg_cron)

Job dijadwalkan melalui migration dengan `cron.schedule`. Waktu dalam UTC. 00:00 WIB = 17:00 UTC.

| Nama job | Jadwal | Aksi |
| --- | --- | --- |
| `outbox-dispatch` | `* * * * *` | `net.http_post` ke `dispatch-email` |
| `void-stale-drafts` | `0 * * * *` | `select sys_run_job('void-stale-drafts')` |
| `daily-maintenance` | `0 17 * * *` | `select sys_run_job('daily-maintenance')` |
| `storage-orphan-sweep` | `30 17 * * *` | `net.http_post` ke `storage-orphan-sweep` |
| `stock-reconciliation` | `10 17 * * *` | `select sys_run_job('stock-reconciliation')` |
| `receivable-reminders` | `20 1 * * *` (UTC) = 08:20 WIB | `select sys_run_job('receivable-reminders')` |

`sys_run_job(p_job)` membuka baris `sys_job_runs` dengan status `RUNNING`, menjalankan logika job, lalu menutup dengan `SUCCESS` atau `FAILED` dan `detail`. Kegagalan dua kali berturut-turut menulis email `JOB_FAILED` ke outbox.

`daily-maintenance` terdiri dari: membersihkan `idempotency_keys` lebih dari 24 jam, menandai `auth_tokens` dan `invitations` kedaluwarsa, membersihkan `rate_limits` yang kedaluwarsa, menulis peringatan kedaluwarsa dalam 90 hari, menulis peringatan stok minimum, dan menulis laporan penyesuaian bulanan pada tanggal 1.

Batas durasi job SQL: 60 detik per job melalui `statement_timeout` di level fungsi. Job yang lebih lama dipecah menjadi beberapa job.

---

## 30. Keamanan

### 30.1 Autentikasi dan Sesi

- Supabase Auth dengan email dan kata sandi, verifikasi email, dan reset. Kata sandi diperiksa terhadap daftar kebocoran.
- MFA TOTP untuk izin BR-23 dengan pemeriksaan `aal2` di basis data.
- Penguncian login dengan `auth_login_precheck` (11.1).
- Sesi cookie dikelola `@supabase/ssr`: cookie `HttpOnly`, `Secure`, `SameSite=Lax`.
- Staf idle 8 jam dan pelanggan 30 hari (BR-24) dengan `auth_touch`.
- Pengguna nonaktif kehilangan akses seketika di basis data (BR-37).

### 30.2 Otorisasi Berlapis

1. Layout Next.js memanggil `auth_touch` dan memeriksa peran untuk grup rute.
2. Server Action memanggil RPC; tidak ada logika izin di Server Action.
3. RPC memeriksa `pos_has_permission` dan cakupan cabang.
4. RLS membatasi setiap `select` langsung ke tabel.
5. Storage membatasi setiap objek berkas.

Lapisan 1 hanya untuk pengalaman pengguna. Lapisan 3–5 adalah kebenaran.

### 30.3 Kunci dan Rahasia

- Web hanya memakai kunci publishable. Tidak ada kunci secret di Vercel.
- Kunci secret hanya dipakai pada GitHub Actions (migrasi dan seed) dan pada mesin pengembang untuk operasi terkendali.
- `service_role` tidak dipakai oleh kode aplikasi. Edge Functions memakai JWT pengguna atau header `x-cron-secret`.
- Rotasi kunci: publishable dan secret dirotasi melalui dashboard Supabase bila terekspos, lalu variabel Vercel diperbarui dan deployment dipicu ulang.

### 30.4 Keamanan Data Klinis

- Kolom klinis tidak pernah dikirim ke peran yang tidak berhak (RLS dan view khusus pelanggan).
- Penjaga trigger rekam medis (25.4) melindungi isi yang sudah ditandatangani.
- Dokumen medis hanya di bucket privat dan diunduh dengan URL berumur 5 menit.
- Email tidak memuat data klinis (23.3).
- Sentry tidak menerima isi klinis (30.6).

### 30.5 Header Keamanan dan CSP

Dikonfigurasi di `next.config.ts`:

- `Content-Security-Policy`: `default-src 'self'; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://*.ingest.sentry.io; script-src 'self' 'nonce-...'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: camera=(self), microphone=(), geolocation=()`. Kamera diizinkan hanya untuk halaman unggah bukti.

Nonce script dibuat di `middleware.ts` untuk setiap permintaan.

### 30.6 Pemantauan dan Data Pribadi

Sentry: `sendDefaultPii: false`. `beforeSend` menghapus field `email`, `phone`, `name`, `address`, `diagnosis`, `chief_complaint`, `history`, `physical_exam`, `treatment_plan`, `internal_note`, `clinical_data`, dan isi `request.data`.

Log Supabase tidak mencatat isi body untuk fungsi `doc_payload`.

Audit mencatat ID, bukan nilai data pribadi, kecuali nilai lama dan baru untuk kolom non-sensitif.

### 30.7 Pembatasan Laju

- Login: Supabase Auth (konfigurasi default) dan `auth_login_precheck` (lima kegagalan dalam 15 menit).
- Operasi yang rawan penyalahgunaan (pendaftaran pelanggan, `auth_record_failed_login`, `invitation_preview`, `sys_health`): dibatasi di fungsi dengan tabel `rate_limits` (misalnya 10 per IP per menit; IP dari header yang disediakan Supabase).
- Operasi tulis pengguna: 60 per menit per pengguna melalui `sys_check_rate(scope, 60, 60)` pada fungsi mutasi.
- Konfirmasi pembayaran dan verifikasi kata sandi owner: 20 per menit dan 5 per 5 menit.
- Pelanggaran menghasilkan `RATE_LIMITED` dengan `retry_after_seconds`.

### 30.8 Input dan Output

- Setiap input web divalidasi Zod. Fungsi database memvalidasi ulang tipe dan rentang.
- Tidak ada SQL dinamis dengan input pengguna; jika terpaksa, memakai `format(%I)` dan `%L`.
- React menangani escape output. `dangerouslySetInnerHTML` dilarang oleh ESLint.
- Berkas diunggah hanya dengan tipe yang tercantum. Validasi signature byte dilakukan saat pengaitan (27.4) dengan membaca 16 byte pertama melalui `storage.download` dengan rentang (opsional). Berkas tanpa signature yang sesuai dihapus oleh job.

### 30.9 Audit

`audit_logs` mencatat aktor, aksi, jenis dan ID entitas, cabang, alasan (bila wajib), ID permintaan, waktu, dan metadata.

Aksi yang wajib diaudit: seluruh mutasi status keuangan, stok, pembayaran, refund, rekam medis, izin, undangan, perubahan peran, grant, login gagal berulang, akses dokumen medis, ekspor laporan, dan anonimisasi.

Ekspor audit harian (opsional, jika pencadangan off-platform diaktifkan). Akses dibatasi pemilik.

---

## 31. Kode Error dan Kontrak Respons

### 31.1 Kode Error Domain

| Kode | HTTP (Edge) | Makna |
| --- | --- | --- |
| `VALIDATION_ERROR` | 422 | Input tidak valid |
| `UNAUTHENTICATED` | 401 | Sesi tidak ada atau tidak valid |
| `SESSION_IDLE` | 401 | Sesi idle melewati batas |
| `MFA_REQUIRED` | 403 | Izin memerlukan `aal2` |
| `FORBIDDEN` | 403 | Izin tidak tersedia |
| `NOT_FOUND` | 404 | Tidak ditemukan atau di luar cakupan |
| `CONFLICT` | 409 | Konflik data atau status (termasuk perubahan total draft) |
| `IDEMPOTENCY_CONFLICT` | 409 | Kunci dipakai untuk payload berbeda |
| `INVALID_STATE_TRANSITION` | 422 | Transisi status tidak diizinkan |
| `INVALID_PAYMENT_TRANSITION` | 422 | Transisi pembayaran tidak diizinkan |
| `INSUFFICIENT_STOCK` | 422 | Stok tidak mencukupi |
| `INSUFFICIENT_CAPACITY` | 422 | Kapasitas penuh |
| `NOT_SELLABLE` | 422 | Produk tidak dapat dijual di kanal atau cabang tersebut |
| `PERIOD_CLOSED` | 422 | Tanggal berada di periode tertutup |
| `SHIFT_REQUIRED` | 422 | Operasi tunai tanpa shift terbuka |
| `MEDICAL_RECORD_LOCKED` | 422 | Rekam medis sudah terkunci |
| `REPORT_TOO_LARGE` | 413 | Hasil laporan melebihi batas |
| `RATE_LIMITED` | 429 | Batas laju terlampaui |
| `INTERNAL_ERROR` | 500 | Kesalahan internal tanpa detail |

### 31.2 Pemetaan dari PostgreSQL

PostgREST menerjemahkan exception PostgreSQL menjadi respons dengan `message` (kode domain), `details`, dan `code` (SQLSTATE). Web membaca `message` sebagai kode domain dan `details` sebagai detail. SQLSTATE `P0001` digunakan untuk semua error domain. Error selain itu dipetakan ke `INTERNAL_ERROR`.

Kesalahan izin tidak membocorkan alasan. `pos_has_permission` yang gagal menghasilkan `FORBIDDEN` atau `NOT_FOUND` sesuai aturan 11.7.

### 31.3 Kontrak Server Action

```typescript
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; requestId: string; details?: unknown; retryAfterSeconds?: number } };
```

`requestId` dibuat di server (Server Action) dan dicatat di Sentry.

`message` selalu bahasa Indonesia dari `packages/contracts/src/messages.ts`.

`details` hanya untuk `VALIDATION_ERROR` (field), `INSUFFICIENT_STOCK` (daftar item), dan `CONFLICT` pada perubahan total.

### 31.4 Format Edge Function

```json
{
  "error": {
    "code": "REPORT_TOO_LARGE",
    "message": "Hasil laporan melebihi 50.000 baris. Persempit rentang tanggal.",
    "request_id": "req_..."
  }
}
```

---

## 32. Antarmuka Pengguna dan Layout

### 32.1 Prinsip UI

1. **Kerja cepat di layar kecil.** Tindakan utama terlihat tanpa scroll pada 390 px.
2. **Status selalu berlabel.** Warna tidak pernah menjadi satu-satunya penanda.
3. **Tindakan berisiko terbaca.** Dialog konfirmasi menyebut dampak konkret.
4. **Satu tindakan utama per layar.** Tombol utama berwarna solid; tindakan lain sekunder atau menu.
5. **Angka rata kanan, tabular.** Rupiah dan kuantitas memakai angka tabular agar kolom sejajar.
6. **Bahasa Indonesia baku, singkat.** Label pendek; penjelasan di helper text.

### 32.2 Desain Token

Warna (diimplementasikan sebagai variabel CSS di `packages/ui/src/tokens.css` dan dipetakan ke Tailwind):

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| `--petora-primary-600` | `#0E7C86` | Tombol utama, tautan aktif, fokus |
| `--petora-primary-700` | `#0B6269` | Hover tombol utama |
| `--petora-primary-50` | `#E7F5F6` | Latar pilihan aktif |
| `--petora-accent-500` | `#F59E0B` | Sorotan kecil, badge perhatian |
| `--petora-neutral-900` | `#0F172A` | Teks utama |
| `--petora-neutral-600` | `#475569` | Teks sekunder |
| `--petora-neutral-300` | `#CBD5E1` | Garis pemisah |
| `--petora-neutral-100` | `#F1F5F9` | Latar panel |
| `--petora-neutral-0` | `#FFFFFF` | Latar kartu |
| `--petora-success-600` | `#15803D` | Status sukses |
| `--petora-warning-600` | `#B45309` | Status perhatian |
| `--petora-danger-600` | `#B91C1C` | Status bahaya, tombol hapus atau batal |
| `--petora-info-600` | `#1D4ED8` | Status informasi |

Kontras teks minimal 4.5:1 untuk teks normal dan 3:1 untuk teks besar. Mode gelap tidak termasuk dalam versi 1.0.0.

Tipografi: font `Inter` melalui `next/font/google` dengan subset `latin`. Skala: 12, 14 (default body), 16, 18, 20, 24, 30 px. Berat: 400, 500, 600, 700. Angka uang memakai `font-variant-numeric: tabular-nums`.

Spasi dan bentuk: grid 4 px. Radius: 6 px (input), 8 px (tombol, badge), 12 px (kartu). Bayangan hanya `sm` untuk kartu dan `lg` untuk dialog.

Breakpoint:

| Nama | Lebar | Perangkat acuan |
| --- | --- | --- |
| xs | 0–389 px | Ponsel kecil (tidak dijamin nyaman) |
| sm | 390–767 px | Ponsel (acuan 390 px) |
| md | 768–1023 px | Tablet (acuan 768 px) |
| lg | 1024–1279 px | Laptop kecil |
| xl | 1280 px dan lebih | Desktop (acuan 1280 px) |

### 32.3 Komponen Dasar (`packages/ui`)

| Komponen | Perilaku |
| --- | --- |
| `AppShell` | Kerangka staf: sidebar, topbar, area konten |
| `PublicShell` | Kerangka publik: header, footer |
| `PortalShell` | Kerangka pelanggan: header dan navigasi bawah (ponsel) atau samping (desktop) |
| `PageHeader` | Judul, breadcrumb, aksi utama kanan (ponsel: di bawah judul) |
| `DataTable` | Header lengket, kolom dapat disembunyikan di layar kecil, baris dapat diklik, aksi per baris lewat menu. Di `sm`, tampil sebagai daftar kartu |
| `FilterBar` | Pencarian, filter cabang, rentang tanggal; di ponsel menjadi panel dari bawah |
| `StatusBadge` | Label teks dan ikon; warna dari pemetaan status (32.7) |
| `MoneyText` | Format `Rp 1.250.000`, rata kanan, tabular |
| `MoneyInput` | Input rupiah bilangan bulat; mode keyboard numerik |
| `QuantityStepper` | Tombol −/+ dan input; batas minimum dan maksimum |
| `BarcodeInput` | Input fokus permanen untuk pemindai keyboard; Enter menambah item |
| `ProductTile` | Kartu produk: gambar, nama, harga, status jual |
| `ConfirmDialog` | Judul, dampak (daftar), tombol batal dan lanjut; tombol berisiko merah; fokus awal pada batal |
| `EmptyState` | Ikon, judul, penjelasan, satu tindakan |
| `Skeleton` | Placeholder bentuk tabel dan kartu saat memuat |
| `Toast` | Hasil aksi; durasi 4 detik; error tetap sampai ditutup |
| `Stepper` | Langkah untuk checkout dan pembayaran |
| `SegmentedControl` | Pilihan singkat (misalnya `PICKUP` atau `DELIVERY`) |
| `TimelineStatus` | Riwayat status pesanan dan rawat inap |
| `DocumentViewer` | Pratinjau PDF di dialog, unduh, dan cetak |
| `NotificationBell` | Daftar notifikasi dengan penanda belum dibaca |
| `CommandPalette` | Pencarian cepat (Ctrl/Cmd+K) ke menu dan entitas |

### 32.4 Layout Staf

**Desktop (`xl` dan `lg`)**:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ☰ PETORA   [Cabang: Utama ▾]   [Cari (Ctrl K)]          🔔  Nama ▾      │ topbar 64px
├────────────┬─────────────────────────────────────────────────────────────┤
│ Dashboard  │ Judul halaman                    [Aksi utama]              │
│ POS        │ Breadcrumb › Halaman                                       │
│ Inventori  │                                                             │
│ Pembelian  │  ┌ kartu ───────────────────────────────────────────────┐   │
│ Pesanan    │  │ konten                                                │   │
│ Klinik     │  └───────────────────────────────────────────────────────┘   │
│ Rawat inap │                                                             │
│ Grooming   │                                                             │
│ Tagihan    │                                                             │
│ Keuangan   │                                                             │
│ Laporan    │                                                             │
│ Pengaturan │                                                             │
└────────────┴─────────────────────────────────────────────────────────────┘
  sidebar 260 px (lg: 80 px ikon saja, dapat dibuka dengan hover)
```

**Tablet (`md`)**: sidebar tersembunyi, dibuka dengan tombol ☰ sebagai panel overlay. Topbar tetap. Konten satu kolom atau dua kolom sesuai halaman.

**Ponsel (`sm`)**:

```
┌────────────────────────────┐
│ ☰  PETORA      [Utama ▾] 🔔│ topbar 56px
├────────────────────────────┤
│ Judul halaman              │
│ [Aksi utama penuh lebar]   │
│                            │
│ konten (kartu bertumpuk)   │
│                            │
├────────────────────────────┤
│ 🏠  💳  📦  🩺  ⋯          │ bottom bar 64px (5 tujuan utama peran)
└────────────────────────────┘
```

Bottom bar per peran:
- **Owner**: Dashboard, POS, Inventori, Pesanan, Lainnya.
- **Doctor**: Jadwal, Pasien, Kunjungan, Rawat inap, Lainnya.
- **Admin**: POS, Pesanan, Janji, Grooming, Lainnya.

"Lainnya" membuka sheet berisi seluruh menu peran.

### 32.5 Layout Publik

- **Header**: logo PETORA (kiri), tautan Katalog, Masuk, dan Daftar (kanan). Di ponsel: logo dan ikon menu.
- **Beranda**: hero dengan judul, deskripsi singkat, dua tombol (Lihat katalog, Buat janji). Di bawahnya: tiga kartu layanan (Klinik, Grooming dan penitipan, Pet shop), cabang aktif, dan area tanya jawab singkat.
- **Footer**: alamat cabang, jam buka, tautan kebijakan privasi, dan "© 2026 PETORA INDONESIA".

### 32.6 Layout Portal Pelanggan

- **Ponsel**: header berisi nama dan ikon notifikasi; bottom bar lima item: Beranda, Hewan, Pesanan, Janji, Akun.
- **Desktop**: sidebar kiri (Beranda, Hewan saya, Pesanan, Janji temu, Rawat inap, Tagihan, Profil), konten di kanan maksimal 960 px.
- Tagihan hanya tampil untuk wali utama. Wali sekunder tidak melihat menu Tagihan.

### 32.7 Pemetaan Status ke Badge

| Grup | Status | Warna | Label |
| --- | --- | --- | --- |
| Netral | `DRAFT`, `NOT_STARTED`, `UNPAID`, `OPEN` | neutral | Draf, Belum dimulai, Belum dibayar, Terbuka |
| Proses | `SUBMITTED`, `PENDING_APPROVAL`, `PROCESSING`, `REQUESTED`, `PENDING`, `CHECKED_IN`, `IN_PROGRESS`, `IN_TRANSIT`, `IN_CONSULTATION`, `DISPATCH_PENDING`, `DISCHARGE_PENDING` | info | Menunggu, Diproses, Dalam perjalanan |
| Perhatian | `STOCK_REVIEW`, `PARTIALLY_PAID`, `PARTIALLY_RECEIVED`, `PARTIALLY_RETURNED`, `SCHEDULED`, `REQUESTED` (refund) | warning | Perlu tinjauan, Sebagian |
| Sukses | `CONFIRMED`, `COMPLETED`, `SIGNED`, `PAID`, `RECEIVED`, `DISCHARGED`, `APPROVED`, `READY_FOR_PICKUP`, `DISPATCHED` | success | Selesai, Terkonfirmasi, Ditandatangani, Lunas |
| Bahaya | `REJECTED`, `CANCELLED`, `NO_SHOW`, `VOIDED`, `RETURNED`, `FAILED`, `DECLINED` | danger | Ditolak, Dibatalkan, Tidak hadir, Dibatalkan (void) |
| Khusus | `AMENDED` | info | Diamendemen |
| Khusus | `REFUND_PENDING` | warning | Refund menunggu |
| Khusus | `REFUNDED` | success | Sudah direfund |

Pemetaan ditulis di `packages/contracts/src/status-labels.ts` dan dipakai semua badge.

### 32.8 Halaman Staf: Spesifikasi per Halaman

Setiap halaman memiliki status loading (skeleton sesuai bentuk), kosong (EmptyState), error (pesan dan `requestId`), dan tidak berizin (halaman 403 dengan tautan kembali).

**Login (`/masuk`)**:
- Kartu tengah maksimum 400 px. Logo, judul "Masuk ke PETORA", email, kata sandi (ikon mata), tombol "Masuk" lebar penuh, tautan "Lupa kata sandi".
- Jika terkunci: pesan "Terlalu banyak percobaan. Coba lagi dalam 15 menit."
- Setelah login: jika izin BR-23 dan belum MFA, arahkan ke `/admin/keamanan`; jika MFA diperlukan, tampilkan langkah kode 6 digit.

**Keamanan (`/admin/keamanan`)**:
- Status MFA (Aktif atau Belum). Tombol "Aktifkan MFA": tampilkan QR dan kode manual; langkah verifikasi 6 digit.
- Daftar sesi aktif tidak ditampilkan pada versi 1.0.0; pengguna dapat keluar dari perangkat saat ini.

**Dashboard pemilik (`/admin`)**:
- Baris kartu KPI (4 kolom di `xl`, 2 di `md`, 1 di `sm`): Penjualan hari ini, Kas per metode (shift terbuka), Pesanan perlu tinjauan, Piutang.
- Panel "Perlu perhatian": daftar stok di bawah minimum, batch kedaluwarsa 90 hari, selisih rekonsiliasi, job gagal, pembayaran menunggu konfirmasi. Setiap item tautan ke halaman terkait.
- Grafik batang sederhana penjualan 14 hari (SVG, tanpa pustaka grafik).
- Janji hari ini (tabel ringkas).

**Dashboard dokter (`/admin/dokter`)**:
- Kartu: Jadwal hari ini, Pasien menunggu, Rekam medis draf, Rawat inap aktif.
- Daftar janji hari ini dengan tombol "Buka kunjungan".

**Dashboard admin (`/admin`)**:
- Kartu: Shift aktif (kasir dan saldo), Pembayaran menunggu, Pesanan siap diambil, Booking hari ini, Tagihan jatuh tempo.
- Tombol besar "Mulai penjualan" dan "Buka shift".

**POS (`/admin/pos`)**:

Desktop/tablet landscape (`md` ke atas):

```
┌─ Shift: Kasir Budi · Rp 500.000 awal ──────── [Tutup shift]  ─────────────┐
│ ┌─ Pencarian ───────────────────────┐  ┌─ Keranjang  DRAFT PS-00231 ───┐ │
│ │ [🔍 nama / SKU / barcode        ] │  │ Pelanggan: [Cari pelanggan ▾] │ │
│ │ (fokus tetap, Enter = tambah)     │  │───────────────────────────────│ │
│ │ ┌────┐┌────┐┌────┐┌────┐          │  │ Kucing kering 1kg   1  Rp 85rb│ │
│ │ │ img││ img││ img││ img│          │  │   diskon 5%  −Rp 4.250        │ │
│ │ │name││name││name││name│          │  │ Vitamin tablet      2  Rp 40rb│ │
│ │ │Rp  ││Rp  ││Rp  ││Rp  │          │  │───────────────────────────────│ │
│ │ └────┘└────┘└────┘└────┘          │  │ Subtotal          Rp 165.000  │ │
│ │ kategori: Semua·Makanan·Obat·…    │  │ Diskon            −Rp 4.250   │ │
│ └───────────────────────────────────┘  │ TOTAL             Rp 160.750  │ │
│                                        │ [ Bayar  F9 ]  [ Simpan draf ]│ │
│                                        └───────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

Ponsel dan tablet portrait (`sm` dan `md` portrait):
- Pencarian dan grid produk di layar utama. Keranjang di bottom sheet yang menampilkan ringkasan: "3 item · Rp 160.750" dengan tombol "Lihat keranjang".
- Pembayaran di layar penuh dengan stepper (Metode, Jumlah, Konfirmasi).

Perilaku:
- Pemindai barcode: input selalu fokus; Enter memanggil `pos_draft_save` dengan item bertambah; bunyi dan kilat hijau pada baris yang bertambah.
- Penghitungan total dilakukan server setiap perubahan; saat menunggu, total lama tampil dengan indikator "menghitung…" dan tombol bayar dinonaktifkan.
- Diskon: tombol kecil "Diskon" pada baris. Di atas 10% muncul dialog meminta kata sandi pemilik (`pos.discount.override`).
- Metode pembayaran: tombol besar (Tunai, Transfer, QRIS, lainnya sesuai cabang). Mengisi jumlah tunai menampilkan kembalian.
- Pembayaran campuran: daftar porsi; sisa ditampilkan; tombol "Selesaikan" aktif jika sisa nol.
- Setelah selesai: panel sukses dengan nomor invoice, tombol "Cetak" (PDF) dan "Penjualan baru" (fokus ke pencarian).
- Tombol pintas: F2 cari, F9 bayar, Esc batal dialog.
- Layar tanpa shift terbuka: POS tidak dapat dipakai; tampil tombol "Buka shift".

**Produk (`/admin/produk`)**:
- Tabel: SKU, nama, kategori, satuan, status jual per cabang (badge), harga cabang aktif, stok (ringkas).
- Filter: kategori, status, cabang. Tombol "Produk baru" (sheet samping di `xl`, halaman penuh di ponsel).
- Detail produk: tab Umum, Barcode, Harga per cabang (riwayat append-only, tombol "Ubah harga" dengan tanggal efektif), Status jual per cabang, Gambar.

**Inventori (`/admin/inventori`)**:
- Pilih cabang dan lokasi (segmented control). Tabel saldo: produk, batch, kedaluwarsa, on hand, reserved, available, biaya rata-rata (tampil hanya bagi `inventory.read_cost`).
- Baris batch kedaluwarsa dalam 90 hari berwarna peringatan dengan badge.
- Tombol: Penyesuaian, Transfer, Stok opname.
- Penyesuaian: dialog dengan produk, lokasi, batch, selisih (±) dengan stepper, kode alasan, catatan (wajib untuk `OTHER`), dampak ditampilkan sebelum simpan.

**Stok opname (`/admin/inventori/opname/[id]`)**:
- Kolom: produk, batch, saldo sistem (tersembunyi saat hitung buta bila diatur), hitung fisik (input angka), selisih otomatis.
- Tombol "Tutup sesi" dengan dialog yang menyebut jumlah penyesuaian dan nilai selisih.

**Transfer (`/admin/inventori/transfer`)**:
- Daftar transfer dengan status. Detail: asal, tujuan, baris item, dikirim/diterima, selisih. Tombol sesuai status (Setujui, Kirim, Terima, Batalkan).
- Penerimaan: input jumlah diterima per baris; selisih wajib alasan.

**Pembelian (`/admin/pembelian`)**:
- Daftar PO. Detail PO: supplier, baris, status penerimaan per baris, tombol "Terima barang".
- Form penerimaan: per baris jumlah diterima, lokasi, batch, kedaluwarsa (wajib untuk `track_lot`), harga perolehan.

**Klinik — jadwal (`/admin/klinik/jadwal`)**:
- Kalender minggu. Ponsel: daftar hari. Klik slot membuka janji. Blok warna per status janji.

**Klinik — kunjungan (`/admin/klinik/kunjungan/[id]`)**:
- Layout dua kolom di `xl`: kiri formulir rekam medis (bagian: Keluhan, Riwayat, Pemeriksaan, Diagnosis, Rencana, Kontrol), kanan panel ringkas (hewan, wali, vital, alergi bila ada, resep, tindakan, obat).
- Indikator status rekam medis di header. Tombol "Tanda tangan" dengan dialog yang menyatakan isi tidak dapat diubah dan meminta verifikasi MFA bila belum tervalidasi di sesi.
- Setelah tanda tangan: formulir menjadi baca saja; tombol "Amendemen" (dokter penanda asli) membuka dialog alasan dan isi baru.

**Rawat inap (`/admin/rawat-inap`)**:
- Papan unit: kolom per unit, kartu pasien per penempatan, warna kapasitas (terisi/kapasitas). Ponsel: daftar unit yang dapat dibuka.
- Detail episode: timeline (observasi, pemberian obat, tugas, update), tab Observasi, Tugas, Update pelanggan, Pulang.

**Grooming dan penitipan (`/admin/grooming`)**:
- Kalender harian per layanan dengan kapasitas. Booking menampilkan status dan tombol cepat Konfirmasi, Check-in, Check-out.
- Penitipan: daftar penitipan aktif dengan unit dan tanggal keluar.

**Pesanan online (`/admin/pesanan`)**:
- Daftar pesanan dengan filter status pembayaran dan fulfillment, cabang, dan tanggal.
- Detail pesanan: item, pembayaran (bukti dibuka dengan `DocumentViewer`, URL 5 menit), panel tindakan sesuai status: Konfirmasi, Tolak (dengan alasan), Tinjau stok, Siapkan, Serahkan, Batalkan.
- Review stok: tabel kekurangan dengan pilihan tindakan dan dialog dampak refund atau pembayaran tambahan.
- Riwayat status (`TimelineStatus`).

**Tagihan layanan (`/admin/tagihan`)**:
- Daftar invoice dengan saldo dan umur. Detail: item, pembayaran, kredit, tombol Tambah pembayaran (dengan validasi tidak melebihi saldo), Cetak.

**Refund (`/admin/refund`)**:
- Tab Menunggu persetujuan, Disetujui, Selesai, Ditolak. Pemohon tidak melihat tombol setujui pada refund sendiri (disembunyikan dan ditolak server).

**Keuangan (`/admin/keuangan`)**:
- Tab Kas (per shift dan metode), Pengeluaran (daftar dengan persetujuan), Periode (daftar periode, tombol Tutup periode dengan daftar prasyarat).

**Laporan (`/admin/laporan`)**:
- Pilih laporan di sisi kiri (daftar), filter di atas (cabang multi-pilih, rentang tanggal presets: hari ini, 7 hari, bulan ini, bulan lalu, kustom), tabel hasil, tombol Ekspor CSV dan PDF.
- Laporan HPP dan laba rugi hanya tampil untuk `finance.report.read`.

**Pengguna (`/admin/pengaturan/pengguna`)**:
- Daftar pengguna (nama, peran, cabang, status, MFA). Tombol Undang, Nonaktifkan, Atur cabang, Grant izin.
- Undangan: form email, peran, cabang, STR (dokter). Daftar undangan dengan status dan tombol kirim ulang (menghasilkan token baru dan membatalkan token lama).

**Cabang dan pembayaran (`/admin/pengaturan/cabang`)**:
- Form cabang, metode pembayaran per cabang (toggle), rekening dan instruksi QRIS, biaya kirim, zona waktu, logo.

**Katalog layanan (`/admin/pengaturan/layanan`)**:
- Daftar layanan dan harga per cabang dengan riwayat harga.

**Audit (`/admin/pengaturan/audit`)**:
- Tabel dengan filter entitas, aktor, rentang. Baris dapat dibuka untuk metadata. Akses MFA.

**Notifikasi**:
- Panel dari lonceng: daftar dengan penanda belum dibaca; klik membuka tautan terkait dan menandai dibaca.

### 32.9 Halaman Publik dan Portal: Spesifikasi per Halaman

**Katalog (`/katalog`)**:
- Ponsel: pencarian di atas, chip kategori horizontal yang dapat digeser, grid 2 kolom `ProductTile`.
- Desktop: sidebar kategori 240 px, grid 4 kolom.
- Pilih cabang di topbar (cabang fulfillment); harga dan ketersediaan mengikuti cabang.
- Tidak menampilkan stok numerik; tampil "Tersedia" atau "Stok terbatas" (tanpa jumlah).

**Detail produk (`/katalog/[sku]`)**:
- Gambar, nama, harga, status ketersediaan, deskripsi, tombol "Tambah ke keranjang" dengan `QuantityStepper`. Tombol tampil "Masuk untuk membeli" bagi tamu.

**Keranjang dan checkout (`/akun/keranjang`, `/akun/checkout`)**:
- Langkah: 1 Keranjang, 2 Pengambilan atau pengiriman (segmented control; alamat bila pengiriman), 3 Tinjau dan instruksi pembayaran, 4 Selesai.
- Ringkasan: subtotal, biaya kirim, total. Tombol "Buat pesanan" menonaktifkan diri saat berjalan.
- Halaman selesai: nomor pesanan, instruksi pembayaran (rekening disalin dari snapshot), tombol "Unggah bukti".

**Pesanan saya (`/akun/pesanan`)**:
- Daftar pesanan dengan badge status pembayaran dan fulfillment.
- Detail: timeline status, item, instruksi pembayaran (snapshot), area unggah bukti (JPEG, PNG, PDF, maks 5 MB), tombol "Batalkan pesanan" jika diizinkan. Jika `REJECTED`, tampil alasan penolakan.
- Pesanan `STOCK_REVIEW`: panel persetujuan untuk tindakan yang diusulkan staf (menyetujui atau menolak tawaran pengganti atau parsial).

**Hewan saya (`/akun/hewan`)**:
- Kartu hewan dengan foto, nama, spesies, peran (Wali utama atau Wali sekunder).
- Detail hewan: identitas, riwayat kunjungan (ringkas), dokumen yang ditandai `customer_visible`, rawat inap aktif, janji mendatang.

**Janji temu (`/akun/janji`)**:
- Langkah: pilih hewan, pilih dokter atau layanan, pilih tanggal dan slot (hanya slot tersedia), alasan singkat, konfirmasi.
- Daftar janji mendatang dengan tombol "Batalkan" (aktif hingga 2 jam sebelum jadwal).

**Rawat inap (`/akun/rawat-inap`)**:
- Kartu episode aktif dengan unit dan ringkasan harian (update terakhir yang dipublikasikan).
- Daftar update dalam urutan terbaru. Tidak ada observasi internal.

**Tagihan (`/akun/tagihan`)** — wali utama:
- Daftar invoice dengan saldo. Detail: item, pembayaran, saldo, tombol Cetak (PDF). Pembayaran online tidak tersedia pada versi 1.0.0; instruksi pembayaran ditampilkan (rekening cabang).

**Profil (`/akun/profil`)**:
- Form nama, telepon, alamat. Email hanya tampil (perubahan memerlukan verifikasi ulang dan tidak tersedia pada versi 1.0.0 selain melalui staf).
- Pengaturan kata sandi (ubah dengan kata sandi lama).

**Masuk, daftar, lupa kata sandi, reset, verifikasi, undangan, tautkan akun**:
- Formulir kartu tengah. Pesan error generik untuk login. Daftar: nama, email, telepon, kata sandi, setujui kebijakan privasi. Setelah daftar, halaman "Cek email Anda" dengan tombol kirim ulang (dibatasi 60 detik).

### 32.10 Formulir: Aturan Umum

- Label di atas input. Pesan error di bawah input dengan ikon dan teks.
- Validasi saat blur dan saat kirim. Tombol kirim selalu terlihat dan dinonaktifkan selama proses.
- Input angka rupiah memakai pemisah ribuan saat tidak fokus.
- Tanggal memakai picker bawaan perangkat di ponsel dan picker kustom di desktop; format `DD/MM/YYYY`.
- Form panjang dengan tab atau langkah menyimpan draf di basis data (kunci draf di `idempotency_keys` atau tabel draf bila diperlukan) dan memberi tahu "Draf tersimpan" dengan waktu.
- Perubahan yang belum disimpan memicu konfirmasi saat meninggalkan halaman.

### 32.11 Aksesibilitas

- Navigasi keyboard penuh. Urutan fokus mengikuti urutan visual.
- Setiap ikon-only memiliki `aria-label`.
- Dialog memakai Radix Dialog dengan fokus terjebak dan kembali ke pemicu.
- Tabel memiliki `<caption>` dan `scope` pada header.
- Pengumuman hasil aksi melalui `aria-live="polite"` (Toast) dan error penting `assertive`.
- Target sentuh minimal 44 × 44 px pada ponsel.
- Gerakan animasi dibatasi pada transisi ringan 150–200 ms dan dimatikan bila `prefers-reduced-motion`.
- Target WCAG 2.2 AA.

### 32.12 Performa UI

- Halaman publik (katalog dan detail produk) dirender statis dengan revalidasi 300 detik melalui Server Components dan `unstable_cache`.
- Halaman staf dirender dinamis; data dimuat dengan Server Components secara paralel.
- Bundel klien dijaga: komponen berat (pratinjau PDF, grafik sederhana) dimuat dinamis.
- Anggaran: LCP di bawah 2,5 detik pada jaringan 4G standar untuk katalog dan POS.

---

## 33. Strategi Pengujian

### 33.1 Prinsip Utama

1. **Jangan Mock Database.** Semua tes yang menyentuh data memakai PostgreSQL asli dari Supabase Local. Tidak ada tiruan klien Supabase atau tiruan fungsi RPC untuk tes integrasi.
2. **Supabase Local yang Bersih.** Setiap eksekusi tes dimulai dari keadaan yang dibangun ulang dari migration dan seed (`supabase db reset`). Tidak ada data sisa antarberkas tes.
3. **Integration Test sebagai inti.** Fokus pada integrasi Server Actions terhadap Supabase Local ("sweet spot"): mencakup validasi Zod, pemanggilan RPC, RLS, izin, transaksi, dan pemetaan error.
4. **E2E sangat terbatas.** Playwright hanya untuk happy path kritis. Kasus error, edge case, dan variasi data ditangani di integration test.
5. **Unit test hanya untuk fungsi murni.** Tidak ada unit test yang menguji interaksi dengan basis data.

### 33.2 Lapisan Tes

| Lapisan | Alat | Cakupan | Wajib untuk |
| --- | --- | --- | --- |
| Unit | Vitest | Fungsi murni: format rupiah, format tanggal, pemetaan status, schema Zod, pemetaan error | `packages/contracts`, `packages/ui` (logika murni) |
| Integrasi (inti) | Vitest + Supabase Local | Server Action core terhadap basis data nyata, RLS, RPC, trigger, constraint, konkurensi | Seluruh modul bisnis |
| E2E (happy path) | Playwright | Alur kritis lengkap di browser terhadap Preview atau Local | 6 skenario di 33.6 |

### 33.3 Penyiapan Supabase Local untuk Tes

`supabase/config.toml` berisi port tetap untuk tes agar tidak berbenturan.

`pnpm test:db:reset` menjalankan `supabase db reset` (migration + seed inti) lalu mengekspor kunci lokal ke `apps/web/.env.test`.

Seed tes berbeda dari seed demo: `supabase/seed/test/` berisi data minimal, deterministik, dengan ID tetap (UUID berakhiran angka). Seed tes tidak berisi data acak.

Setiap berkas tes integrasi memanggil `resetTestData()` yang menjalankan `truncate` terhadap tabel bisnis dan pengulangan seed tes melalui `supabase db reset --no-seed` lalu seed tes. Untuk mempercepat, berkas tes dijalankan secara serial (`--no-file-parallelism`), dan setiap berkas hanya mereset ketika skemanya berubah atau ketika berkas meminta `freshDatabase: true`.

Pengguna tes dibuat melalui Supabase Auth Admin API lokal dengan kunci secret lokal (`supabase status`). Kunci secret hanya ada di lingkungan lokal dan CI, tidak pernah di Vercel.

**Alasan**: tes harus menjalankan jalur yang sama dengan produksi (RLS aktif, fungsi `security definer`, trigger), sehingga pengguna tes login dengan kata sandi asli dan memakai klien dengan JWT, bukan klien dengan kunci secret.

### 33.4 Pola Integration Test untuk Server Action

Setiap Server Action dipisah menjadi:
- `*.action.ts` — wrapper tipis (`"use server"`): membaca sesi, membuat `requestId`, memanggil core, memetakan hasil.
- `*.core.ts` — fungsi murni terhadap klien Supabase yang diberikan sebagai argumen. Di sinilah validasi Zod dan pemanggilan RPC berada.

Tes integrasi memanggil `*.core.ts` dengan klien yang login sebagai pengguna uji. Ini menjalankan kode yang sama dengan produksi tanpa dependensi Next.js.

Contoh struktur tes:

```typescript
// apps/web/tests/integration/pos/sale-complete.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { asUser, USERS, resetDb } from '../helpers/supabase';
import { completeSale } from '@/server/pos/sale-complete.core';

describe('completeSale', () => {
  beforeAll(async () => { await resetDb(); });

  it('menyelesaikan penjualan tunai dan mengurangi stok', async () => {
    const admin = await asUser(USERS.adminCabangUtama);
    const draft = await seedDraft(admin, { items: [{ product: 'P-KERING-1KG', qty: 1 }] });
    const res = await completeSale(admin, {
      saleId: draft.id,
      payments: [{ method: 'CASH', amount: draft.grandTotal, tendered: draft.grandTotal + 10000 }],
      idempotencyKey: crypto.randomUUID(),
    });
    expect(res.ok).toBe(true);
    expect(await stockOnHand(admin, 'P-KERING-1KG', 'RETAIL')).toBe(stockBefore - 1);
  });

  it('menolak penjualan ketika dua transaksi bersamaan melebihi stok', async () => {
    // Promise.all terhadap dua core dengan 4 dan 3 unit pada stok 5
    // ...hasil yang diharapkan: tepat satu ok, satu INSUFFICIENT_STOCK
  });
});
```

Setiap Server Action wajib memiliki tes integrasi untuk:
- Jalur sukses dengan verifikasi keadaan basis data (saldo, ledger, status) melalui klien dengan izin yang sesuai.
- Penolakan izin untuk setiap peran yang tidak berhak (diharapkan `FORBIDDEN` atau `NOT_FOUND`).
- Isolasi cabang atau pelanggan (ID milik cabang atau pelanggan lain).
- Idempotensi (kunci sama, payload sama mengembalikan hasil sama tanpa efek ganda; payload berbeda `IDEMPOTENCY_CONFLICT`).
- Validasi input (`VALIDATION_ERROR`) untuk field kritis.
- Kondisi status yang tidak valid (`INVALID_STATE_TRANSITION`) untuk transisi yang ditolak.
- Konkurensi diuji dengan `Promise.all` pada core yang sama terhadap data yang sama (stok, pembayaran ganda, kapasitas, janji bertumpang tindih, dua penutupan shift). Hasilnya diverifikasi terhadap basis data.

### 33.5 Tes RLS dan Izin

- Setiap tabel bisnis memiliki tes `select` dari setiap peran: owner, doctor (dengan dan tanpa penugasan), admin (cabang A dan B), customer (wali utama, wali sekunder, pelanggan lain).
- Tes memastikan `insert`, `update`, dan `delete` langsung dari klien ditolak untuk tabel bisnis.
- Tes memastikan `pos_has_permission` dengan `aal1` ditolak untuk izin BR-23.
- Tes memastikan pengguna nonaktif kehilangan akses seketika.

Tes ini berada di `apps/web/tests/integration/rls/` dan menggunakan klien sebagai pengguna nyata.

### 33.6 Tes Integritas Skema

Setiap constraint eksklusi, indeks unik parsial, CHECK, dan trigger yang didaftar di Bagian 25 memiliki satu tes integrasi yang mencoba melanggarnya melalui RPC atau klien dan memverifikasi kode error yang benar. Ini memastikan dokumen dan migration tetap sinkron.

Daftar constraint diuji dengan query ke `pg_constraint` dan `pg_trigger` untuk memastikan semuanya ada (tes "inventaris skema").

### 33.7 Tes Sinkronisasi Format Edge

Tes integrasi memanggil `_shared/format.ts` dan `packages/contracts/src/format.ts` dengan kumpulan nilai yang sama (termasuk nilai 0, 1.000.000, 1.250.000, dan tanggal lintas zona waktu) dan membandingkan hasilnya.

### 33.8 E2E: Happy Path Kritis Saja

Playwright berjalan di tiga proyek: `desktop-chrome` (1280 × 800), `mobile-chrome` (390 × 844), dan `tablet` (768 × 1024) untuk skenario POS. Hanya skenario berikut yang diuji E2E:

| Kode | Skenario happy path | Proyek |
| --- | --- | --- |
| E2E-1 | Admin login → buka shift → jual dua item → bayar tunai → invoice tampil dan PDF terbuka | desktop, tablet |
| E2E-2 | Pelanggan daftar → verifikasi (tautan dari Inbucket lokal) → pesan produk → unggah bukti → status `SUBMITTED` tampil | desktop, mobile |
| E2E-3 | Admin konfirmasi pembayaran pesanan (dengan MFA) → status `PROCESSING` → tandai siap diambil → `COMPLETED` | desktop |
| E2E-4 | Dokter login (MFA) → buka kunjungan → isi rekam medis → tanda tangan → rekam medis terkunci | desktop |
| E2E-5 | Pemilik login (MFA) → setujui refund (staf lain) → selesaikan transfer → refund `COMPLETED` | desktop |
| E2E-6 | Pelanggan login → lihat hewan dan janji → buat janji (slot tersedia) → janji tampil di daftar | mobile |

Aturan E2E:
- Data dibuat melalui seed tes, bukan lewat UI, kecuali yang menjadi bagian skenario.
- Setiap skenario berdiri sendiri dan dapat diulang.
- Tidak ada asersi pada detail visual; asersi pada keadaan: teks status, URL, dan keberadaan elemen kunci.
- Tidak ada uji kasus error di E2E.
- MFA di E2E menggunakan TOTP yang dibangkitkan dari secret tes (`otplib`).

### 33.9 Pipeline CI

```
PR dibuka / diperbarui
  ├─ lint (eslint, prettier --check, boundaries)           ~1 menit
  ├─ typecheck (tsc semua paket)                           ~1 menit
  ├─ unit (vitest, fungsi murni)                           ~30 detik
  ├─ integrasi (supabase start → db reset → vitest)        ~5–8 menit
  ├─ build (turbo build --filter=web...)                   ~2 menit
  └─ e2e (playwright, happy path, terhadap Preview)        ~5 menit
```

Kegagalan di salah satu langkah menggagalkan PR. Tidak ada `continue-on-error`. Tes yang gagal tidak dilewati dengan `skip` tanpa tiket dan persetujuan reviewer.

### 33.10 Cakupan dan Kualitas

- Setiap Server Action core memiliki tes integrasi (inventaris dicek otomatis: setiap ekspor di `*.core.ts` harus memiliki berkas tes dengan nama yang sama).
- Fungsi database dalam Bagian 26.5 masing-masing dipanggil oleh minimal satu tes integrasi.
- Target: seluruh jalur sukses dan seluruh kode error domain dalam Bagian 31.1 diuji setidaknya sekali.
- Cakupan baris bukan target utama. Kualitas ditentukan oleh daftar skenario wajib (33.4) dan inventaris skema (33.6).

---

## 34. Operasional

### 34.1 Cadangan dan Pemulihan Basis Data

- Proyek production memakai Point-in-Time Recovery Supabase (jika tersedia, paket Pro) dengan retensi 7 hari. Pada tier gratis, cadangan harian otomatis Supabase menjadi satu-satunya lapisan.
- Pemulihan ke proyek sementara (`petora-restore-YYYYMMDD`) dilakukan melalui dashboard atau API Supabase. Setelah diverifikasi, data yang diperlukan disalin dengan fungsi koreksi terotorisasi (34.3).
- Uji pemulihan dilakukan setiap bulan ke proyek sementara. Hasil dicatat di `docs/runbook.md` (waktu mulai, waktu siap, jumlah baris per tabel utama, hasil uji RLS sampel).

### 34.2 Cadangan Off-Platform (Opsional)

Workflow `backup.yml` berjalan setiap hari pukul 18:00 UTC (01:00 WIB), hanya jika dikonfigurasi:

1. `supabase db dump` (skema dan data) untuk production menggunakan kredensial baca.
2. Enkripsi dengan GPG menggunakan kunci publik `BACKUP_GPG_PUBLIC_KEY`.
3. Unggah ke Cloudflare R2 bucket `petora-backup` dengan awalan tanggal. Lifecycle rule 35 hari.
4. Ekspor manifest objek Storage (daftar path dan ukuran) dan salinan objek bucket privat yang berubah sejak hari sebelumnya.
5. Ekspor `audit_logs` harian (rentang 24 jam) sebagai berkas terenkripsi.

Kunci privat GPG disimpan oleh pemilik dan developer lead, tidak di GitHub.

Pada tier gratis tanpa R2, cadangan dapat diganti dengan ekspor `pg_dump` berkala ke penyimpanan lokal atau penyedia S3-compatible lain.

### 34.3 Koreksi Data Terotorisasi

Koreksi data bisnis dilakukan dengan fungsi khusus `sys_correction_apply(p_kind, p_payload, p_reason)` yang hanya dapat dipanggil oleh `owner` dengan MFA, dan menulis audit dengan `metadata` lengkap.

- Koreksi stok memakai `inv_adjust` dengan `reason_code = OTHER` dan catatan (tidak ada jalur khusus).
- Koreksi kas memakai pembalik (`CASH_IN_ADJUSTMENT` atau `CASH_OUT_ADJUSTMENT`) dengan referensi.
- Perubahan langsung ke tabel produksi lewat SQL editor dilarang kecuali prosedur insiden (34.4) disetujui secara tertulis oleh pemilik dan dicatat.

### 34.4 Insiden

1. Catat waktu deteksi, sumber, dampak, dan pelapor di tiket. Tiket tidak berisi data pribadi.
2. Nonaktifkan area terdampak: `branches.pos_enabled = false` untuk POS, dan `branches.online_enabled = false` untuk toko online.
3. Kumpulkan `request_id` dari Sentry dan log Supabase.
4. Jalankan skrip baca rekonsiliasi (`pnpm reconcile:stock`, `pnpm reconcile:cash`) melalui `DIRECT_URL` mode baca.
5. Tentukan perbaikan: migration maju, koreksi terotorisasi, atau pemulihan ke proyek sementara.
6. Setelah perbaikan diverifikasi di staging, terapkan ke production dengan prosedur rilis (7.3).
7. Aktifkan kembali POS dan toko online. Catat hasil di tiket.
8. Laporan pasca-insiden (penyebab, dampak, pencegahan) dalam 5 hari kerja.

### 34.5 Rotasi Kunci

| Kunci | Frekuensi | Prosedur |
| --- | --- | --- |
| Kunci publishable Supabase | Saat terekspos | Rotasi di dashboard, perbarui variabel Vercel, deploy ulang |
| Kunci secret Supabase | Saat terekspos atau setahun sekali | Rotasi di dashboard, perbarui GitHub Secrets |
| `RESEND_API_KEY` | Saat terekspos atau setahun sekali | Ganti di Resend, `supabase secrets set`, deploy ulang Edge |
| `cron_shared_secret` (Vault) | Setahun sekali | Perbarui Vault dan secret Edge dalam satu jendela |
| Kunci GPG cadangan | Dua tahun sekali | Kunci baru, cadangan dienkripsi dengan kunci baru mulai tanggal rotasi |

### 34.6 Pemantauan

- **Sentry**: error web dan Server Action, dengan tag `domain_error` untuk kode domain. Transaksi lambat (lebih dari 500 ms untuk POS dan pembayaran) ditandai.
- **Supabase**: log database dan API, metrik CPU, koneksi, dan penyimpanan. Peringatan penggunaan 80% untuk penyimpanan dan koneksi.
- **Vercel**: log fungsi dan Analytics untuk LCP dan CLS.
- **Uptime**: pemanggilan `sys_health()` melalui RPC publik setiap 5 menit dari layanan pemantauan eksternal (opsional).
- `sys_job_runs`: ditampilkan di halaman Pengaturan > Operasional (hanya owner).

Peringatan kritis dikirim ke developer on-call dan pemilik: error rate di atas 2% selama 10 menit, job gagal dua kali, outbox lebih dari 500 baris pending, atau kegagalan login berulang dari satu IP.

### 34.7 Retensi

- Data bisnis dan klinis: BR-27.
- Log Sentry: 30 hari.
- Log Supabase: sesuai batas paket.
- Cadangan R2: 35 hari (jika dikonfigurasi).
- Outbox email terkirim: dibersihkan setelah 90 hari.
- `sys_job_runs`: 365 hari.
- Anonimisasi pelanggan: nama, telepon, email, dan alamat diganti nilai tanda (`ANON-<singkat id>`), `user_id` dilepas, akun dinonaktifkan, dicatat audit.

---

## 35. Struktur Repositori Rinci

Lihat Bagian 5.1. Tambahan:

- `apps/web/src/app/` mengikuti route group: `(public)`, `(auth)`, `(customer)/akun`, `(staff)/admin`, dan `api/`.
- `apps/web/src/server/` berisi `actions/`, `queries/`, `<domain>/*.core.ts`, `<domain>/*.action.ts`, dan `auth/`.
- `supabase/migrations/` berisi berkas berurutan. Berkas `20260101000000_initial_extensions.sql` pertama membuat ekstensi dan skema dasar.
- `supabase/seed/` berisi `base/` (izin, peran, metode pembayaran, kategori, kode alasan) yang dijalankan di semua lingkungan, `demo/` (sintetis, dilarang di production), dan `test/` (deterministik, untuk tes).
- `scripts/` berisi skrip operasional.

---

## 36. Data Awal dan Go-Live

### 36.1 Data Awal

Berurutan:

1. Profil bisnis dan daftar cabang (`branch_upsert`).
2. Akun owner pertama (`bootstrap_first_owner`) dan owner kedua (undangan).
3. Metode pembayaran aktif per cabang dan rekening.
4. Katalog layanan dan harga per cabang.
5. Master produk, barcode, status jual, dan harga per cabang.
6. Supplier.
7. Unit rawat dan kapasitas.
8. Pengguna staf melalui undangan, dengan STR untuk dokter.
9. Pelanggan dan hewan yang boleh dimigrasikan, dengan wali utama.
10. Saldo awal per lokasi dengan batch dan kedaluwarsa (`inv_receive_opening_balance`) dan biaya rata-rata awal (`product_branch_costs`).
11. Saldo kas awal per cabang (`SHIFT_OPENING` pada shift pertama) dan piutang awal sebagai invoice layanan dengan `source_type = 'MANUAL'` (diperluas sebagai nilai tetap pada versi 1.0.0).
12. Tagihan supplier yang masih berlaku (`po_supplier_bill_create`).

Impor massal memakai skrip `pnpm import:initial <berkas.csv>` dengan validasi baris. Setiap impor menghasilkan laporan rekonsiliasi per cabang (jumlah baris, jumlah stok, nilai persediaan, saldo kas). Laporan ditandatangani pemilik sebelum data diterapkan.

### 36.2 Bootstrap Pemilik

1. Pemilik mendaftar di `/daftar` dan memverifikasi email.
2. Developer menjalankan di SQL editor proyek production:

```sql
select public.bootstrap_first_owner('<uuid pengguna>');
```

Fungsi hanya berhasil jika belum ada `owner` aktif. Hasilnya dicatat di `audit_logs` dengan `action = 'BOOTSTRAP_OWNER'`.

3. Pemilik mengaktifkan MFA. Setelah itu, pemilik kedua dibuat melalui undangan.

### 36.3 Checklist Go-Live

| No | Item | Penanggung jawab |
| --- | --- | --- |
| 1 | Dua owner aktif dengan MFA | Pemilik |
| 2 | Cabang, zona waktu, dan kode cabang sesuai | Pemilik |
| 3 | Metode pembayaran dan rekening terverifikasi | Pemilik |
| 4 | Harga per cabang dan status jual diverifikasi (sampel 20 produk) | Pemilik |
| 5 | Saldo awal direkonsiliasi (jumlah dan nilai per cabang) dan ditandatangani | Pemilik |
| 6 | Pengguna staf aktif dengan cakupan cabang yang benar | Pemilik |
| 7 | Uji E2E-1 sampai E2E-6 hijau di staging | Developer |
| 8 | Uji pemulihan terakhir dalam 30 hari | Developer lead |
| 9 | Cadangan off-platform berjalan 7 hari berturut-turut tanpa gagal (jika dikonfigurasi) | Developer lead |
| 10 | Sentry, outbox, dan cron aktif dan tercatat di `sys_job_runs` | Developer |
| 11 | Pelatihan kasir dan dokter (checklist di `docs/runbook.md`) | Pemilik |
| 12 | Persetujuan UAT tertulis | Pemilik |

---

## 37. Dokumentasi Repositori

Hanya dokumen berikut yang dipelihara di repositori:

| Berkas | Isi |
| --- | --- |
| `README.md` | Cara menjalankan lokal, perintah utama, dan tautan ke dokumen lain |
| `docs/runbook.md` | Operasional, insiden, pemulihan, rotasi kunci, pelatihan |
| `docs/release.md` | Prosedur rilis, checklist smoke test, rollback |
| `docs/permissions.md` | Matriks izin, dihasilkan dari seed |
| `THIRD_PARTY_NOTICES.md` | Komponen pihak ketiga dan lisensinya (termasuk TailAdmin) |
| `LICENSE` | Lisensi PETORA INDONESIA |

Dokumen spesifikasi ini (PETORA v1.0.0) disimpan sebagai `docs/spesifikasi-petora-v1.0.0.md`.

---

## 38. Definition of Done

Versi 1.0.0 dinyatakan selesai bila seluruh kondisi berikut terpenuhi:

1. Seluruh modul M01–M18 tersedia dan memenuhi aturan BR-01 sampai BR-40.
2. Seluruh migration, seed, fungsi, kebijakan RLS, kebijakan storage, dan job pg_cron tersimpan di repositori dan berhasil diterapkan dari nol di Supabase Local.
3. Seluruh kriteria penerimaan di Bagian 39 lulus di staging.
4. Tes integrasi untuk setiap Server Action core dan setiap fungsi di Bagian 26.5 lulus.
5. Inventaris skema (33.6) lulus.
6. E2E-1 sampai E2E-6 lulus di desktop dan mobile sesuai daftar.
7. Pengujian konkurensi pada stok, pembayaran, kapasitas, janji, dan penutupan shift lulus.
8. Rekam medis yang sudah ditandatangani tidak dapat diubah melalui jalur apa pun.
9. Laporan dapat direkonsiliasi ke transaksi sumber.
10. Tidak ada rahasia di repositori, log, Sentry, atau browser (diperiksa dengan pemindaian rahasia di CI).
11. Cadangan dan pemulihan teruji dan tercatat di runbook.
12. Pemilik menyetujui UAT tertulis dan menandatangani berita acara serah terima.

---

## 39. Kriteria Penerimaan (AC)

| Kode | Kriteria | Lulus bila |
| --- | --- | --- |
| AC-01 | RBAC | Setiap peran hanya dapat memanggil fungsi dan membaca data sesuai matriks 11.6 |
| AC-02 | Isolasi cabang | Pengguna cabang A mendapat `NOT_FOUND` untuk objek cabang B |
| AC-03 | Isolasi pelanggan | Pelanggan A tidak dapat membaca hewan, pesanan, invoice, atau rekam medis pelanggan B, termasuk dengan mengganti ID di permintaan langsung ke API |
| AC-04 | POS | Total benar dan stok berkurang tepat satu kali walau kunci idempotensi dikirim ulang |
| AC-05 | Konflik stok | Dua penyelesaian bersamaan atas stok 5 (permintaan 4 dan 3) menghasilkan tepat satu sukses dan stok tidak negatif |
| AC-06 | Bukti pembayaran | Unggahan bukti tidak mengubah status menjadi `CONFIRMED` |
| AC-07 | Alokasi online | Reservasi hanya dibuat oleh `ord_confirm_payment` dengan pemeriksaan stok di dalam transaksi |
| AC-08 | STOCK_REVIEW | Pesanan `STOCK_REVIEW` tidak masuk `PROCESSING` tanpa `ord_resolve_stock_review` |
| AC-09 | Rekam medis | Rekam medis `SIGNED` tidak dapat diubah langsung, dihapus, atau ditandatangani ulang |
| AC-10 | Kapasitas rawat | Penempatan tidak melampaui kapasitas unit pada rentang waktu bertabrakan, termasuk pada pindah unit |
| AC-11 | Update pelanggan | Pelanggan hanya melihat `shared_updates` yang dipublikasikan untuk hewannya |
| AC-12 | Keuangan | Kas, pengeluaran, piutang, dan HPP dihitung dari sumber terpisah dan tidak tercampur |
| AC-13 | Audit | Perubahan kritis memiliki pelaku, waktu, objek, dan alasan bila diwajibkan |
| AC-14 | Berkas | Berkas privat tidak dapat diakses tanpa izin; URL bertanda tangan kedaluwarsa dalam 5 menit |
| AC-15 | Responsif | Alur POS, pesanan, dan janji dapat diselesaikan pada 390, 768, dan 1280 px |
| AC-16 | Pemulihan | Pemulihan ke proyek sementara menghasilkan jumlah baris dan hasil uji RLS yang sama |
| AC-17 | Deployment | Lint, typecheck, tes, build, migrasi, dan E2E berjalan melalui pipeline tercatat |
| AC-18 | Konsistensi stok | Rekonsiliasi `on_hand` dengan ledger menghasilkan selisih nol |
| AC-19 | Kas | Saldo tunai shift sama dengan `expected_cash` pada penutupan |
| AC-20 | Batch | Penjualan, pengeluaran klinik, dan transfer tidak mengambil batch kedaluwarsa |
| AC-21 | Sesi | Pengguna nonaktif kehilangan akses pada permintaan berikutnya |
| AC-22 | MFA | Izin BR-23 ditolak pada sesi `aal1` dengan `MFA_REQUIRED` |
| AC-23 | Email | Setiap email berasal dari outbox dan tidak memuat data klinis atau rincian item |
| AC-24 | Kode error | Setiap kode di Bagian 31.1 dapat dipicu oleh minimal satu tes integrasi |
| AC-25 | Tanpa mock | Tidak ada tes integrasi yang memakai tiruan basis data |

---

## 40. Lisensi dan Hak Cipta

- **Hak cipta**: © 2026 PETORA INDONESIA. Seluruh hak dilindungi.
- Perangkat lunak PETORA adalah perangkat lunak proprietari. Pengguna, salinan, modifikasi, dan distribusi memerlukan izin tertulis dari PETORA INDONESIA.
- Berkas `LICENSE` di repositori berisi teks lisensi ini dengan nama PETORA INDONESIA sebagai pemegang hak cipta.
- Komponen pihak ketiga (termasuk TailAdmin, Next.js, React, Tailwind CSS, Radix UI, Supabase client, Zod, React Hook Form, pdf-lib, Vitest, Playwright, dan Sentry SDK) digunakan sesuai lisensi masing-masing dan dicantumkan di `THIRD_PARTY_NOTICES.md`.
- Logo, nama, dan merek PETORA tidak boleh dipakai di luar produk PETORA tanpa izin tertulis.

---

## 41. Kunci Versi, Riwayat, dan Perubahan

| Versi | Tanggal | Status | Ringkasan |
| --- | --- | --- | --- |
| 1.0.0 | 28 Oktober 2026 | Dikunci | Spesifikasi pertama PETORA. Arsitektur Vercel dan Supabase, monorepo modular, logika transaksi di fungsi PostgreSQL, penyimpanan dan komputasi di Supabase, deployment fleksibel (dapat memakai tier gratis), UI dan layout lengkap, workflow end-to-end, dan strategi pengujian berbasis Supabase Local tanpa mock database. |

Aturan perubahan setelah versi 1.0.0 dikunci:
- Perbaikan redaksional tanpa perubahan perilaku: versi 1.0.1.
- Penambahan fitur yang kompatibel ke belakang: versi 1.1.0.
- Perubahan aturan bisnis, skema yang memutus kompatibilitas, atau perubahan stack: versi 2.0.0.

Setiap perubahan ditulis sebagai entri baru di tabel ini dengan alasan dan daftar bagian yang berubah.

---

## Lampiran A. Ringkasan Skenario Konkurensi Wajib

| Skenario | Setup | Yang diharapkan |
| --- | --- | --- |
| Dua penjualan atas stok terbatas | Stok 5; penjualan A 4 unit; penjualan B 3 unit; paralel | Tepat satu sukses; stok akhir 1 atau 2 sesuai pemenang; tidak negatif |
| Penjualan dan pesanan online | Stok 5; POS 4 unit; konfirmasi pesanan 3 unit | Total yang dialokasikan tidak melebihi 5; salah satu gagal atau `STOCK_REVIEW` |
| Konfirmasi pembayaran ganda | Dua panggilan `ord_confirm_payment` dengan kunci sama | Satu `CONFIRMED`, satu set reservasi, satu `CASH_IN_ONLINE` |
| Penyelesaian penjualan ganda | Dua `pos_sale_complete` dengan kunci sama | Satu invoice, satu mutasi per alokasi, satu pembayaran |
| Kunci sama, payload beda | Panggilan kedua dengan jumlah berbeda | `IDEMPOTENCY_CONFLICT` |
| Dua shift untuk satu kasir | Dua `pos_shift_open` paralel | Satu sukses; satu `CONFLICT` atau unik gagal |
| Janji bertumpang tindih | Dua `appointment_book` dokter sama, waktu bertabrakan | Satu sukses; satu gagal |
| Kapasitas unit | Dua `hosp_admit` ke unit kapasitas 1 | Satu sukses; satu `INSUFFICIENT_CAPACITY` |
| Dua penerimaan biaya | Dua `inv_receive_goods` paralel pada produk sama | Biaya rata-rata sama dengan hasil berurutan |
| Penutupan shift dan penjualan | `pos_shift_close` dan `pos_sale_complete` pada shift sama | Penjualan yang gagal menerima `SHIFT_REQUIRED`; saldo konsisten |

---

## Lampiran B. Matriks Status Lintas Modul

| Entitas | Status | Transisi utama |
| --- | --- | --- |
| Penjualan POS | `DRAFT` → `COMPLETED` → `PARTIALLY_RETURNED` → `RETURNED`; `DRAFT` → `VOIDED` | Lihat 15 |
| Pesanan online (pembayaran) | `UNPAID` → `SUBMITTED` → `CONFIRMED` → `REFUND_PENDING` → `REFUNDED`; `SUBMITTED` → `UNPAID` (ditolak) | Lihat 16 |
| Pesanan online (fulfillment) | Lihat 16.6 | Lihat 16.6 |
| Pembayaran | `SUBMITTED` → `CONFIRMED` atau `REJECTED` | Dijaga trigger |
| Refund | `REQUESTED` → `APPROVED` → `COMPLETED`; `REQUESTED` → `REJECTED` | Dijaga trigger |
| Rekam medis | `DRAFT` → `SIGNED` → `AMENDED`; `DRAFT` → `VOIDED` | Lihat 17.3–17.4 |
| Resep | `DRAFT` → `SIGNED` → (`CANCELLED` dengan alasan) | Lihat 17.5 |
| Janji | `SCHEDULED` → `CHECKED_IN` → `IN_CONSULTATION` → `COMPLETED`; `SCHEDULED` → `CANCELLED` atau `NO_SHOW` | Lihat 17.1 |
| Kunjungan | `OPEN` → `COMPLETED`; `OPEN` → `CANCELLED` | Lihat 17.2 |
| Rawat inap | `PLANNED` → `ADMITTED` → `DISCHARGE_PENDING` → `DISCHARGED`; `PLANNED` → `CANCELLED` | Lihat 18 |
| Booking | `REQUESTED` → `CONFIRMED` → `CHECKED_IN` → `IN_PROGRESS` → `COMPLETED`; `CONFIRMED` → `NO_SHOW` atau `CANCELLED` | Lihat 19 |
| Invoice layanan | `OPEN` → `PARTIALLY_PAID` → `PAID`; `OPEN` → `VOIDED` (tanpa pembayaran) | Lihat 20 |
| Shift | `OPEN` → `CLOSED` | Lihat 15.1 |
| Periode | `OPEN` → `CLOSED` | Lihat 21.3 |
| Transfer | `DRAFT`/`PENDING_APPROVAL` → `IN_TRANSIT` → `RECEIVED`; `DRAFT`/`PENDING_APPROVAL` → `CANCELLED` | Lihat 13.7 |
| Pesanan pembelian | `DRAFT` → `SUBMITTED` → `PARTIALLY_RECEIVED` → `RECEIVED`; `SUBMITTED` → `CANCELLED` | Lihat 14 |
| Sesi opname | `OPEN` → `CLOSED` | Lihat 13.6 |
| Pengeluaran | `PENDING_APPROVAL` → `APPROVED` → `PAID`; `PENDING_APPROVAL` → `REJECTED` | Lihat 21.2 |

---

## Lampiran C. Daftar Istilah

| Istilah | Arti dalam PETORA |
| --- | --- |
| Wali utama | Pelanggan yang menerima tagihan dan menyetujui layanan tambahan untuk hewan tertentu |
| Wali sekunder | Pelanggan yang melihat riwayat dan menerima update, tanpa angka tagihan |
| FEFO | First Expired First Out: batch yang paling dekat kedaluwarsanya diambil lebih dahulu |
| HPP | Harga pokok penjualan berdasarkan biaya rata-rata tertimbang bergerak |
| Ledger | Catatan mutasi stok yang append-only |
| Reservasi | Alokasi stok untuk pesanan yang sudah dibayar dan diproses |
| Shift | Periode kerja kasir dengan kas awal dan kas akhir |
| Idempotensi | Jaminan bahwa permintaan yang sama tidak menghasilkan efek ganda |
| Outbox | Tabel antrean email yang diproses oleh Edge Function |
| aal2 | Tingkat autentikasi dengan faktor kedua (MFA) yang sudah diverifikasi |
| RLS | Row Level Security PostgreSQL |
| RPC | Fungsi PostgreSQL yang dipanggil dari klien melalui Supabase |
| Supabase Local | Instans Supabase berbasis Docker untuk pengembangan dan pengujian lokal |
| Monorepo | Satu repositori yang berisi beberapa paket aplikasi dan pustaka |
| Edge Function | Fungsi serverless yang berjalan di runtime Deno terkelola oleh Supabase |

---

**Akhir Dokumen — PETORA v1.0.0**

© 2026 PETORA INDONESIA. Seluruh hak dilindungi.
